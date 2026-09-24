/**
 * dsh-better-sidebar-svn host 半：注册 `/sidebar/api/svn.*` JSON API 路由。
 * 所有操作通过系统 `svn` 二进制完成，与 git.ts 设计对称。
 *
 * 路由列表：
 *  - svn.status    → 工作副本状态快照
 *  - svn.diff      → 文件 diff 文本
 *  - svn.add       → 添加文件到版本控制
 *  - svn.revert     → 还原文件修改
 *  - svn.stage      → 暂存到待提交列表（changelist；未版本控制文件自动先 add）
 *  - svn.unstage    → 取消暂存（不传 paths = 全部取消）
 *  - svn.commit     → 提交待提交列表中的变更（--changelist，只提交已暂存）
 *  - svn.update     → 更新工作副本
 *  - svn.log        → 提交历史（分页）
 *  - svn.cat        → 获取某版本文件内容
 *  - svn.info       → 仓库信息
 *  - svn.resolve    → 解决冲突
 *  - svn.revertRevision → 撤销某次提交
 *  - svn.ignoreGet  → 读取当前目录 svn:ignore
 *  - svn.ignoreSet  → 写入 / 清空当前目录 svn:ignore（写操作锁定 cwd realpath）
 *
 * 宿主启动后首个请求惰性探测 `svn` 二进制；缺失时所有方法统一返回
 * `svn-missing` 错误码与可读提示。
 */
import { isAbsolute } from 'node:path'
import type { Context } from 'dsh-better-sidebar'
import * as svn from './svn.ts'
import { readJsonBody, requireString, SidebarError, writeError, writeJson, writeOk, createTrustFence } from './wire.ts'

/** 插件身份。 */
export const name = 'dsh-better-sidebar-svn'

/** 服务依赖：webServer（路由注册）、sessions（会话 cwd 解析）、webRuntime（可信 Host 列表）。 */
export const inject = ['webServer', 'sessions', 'webRuntime']

/**
 * 解析会话的权威工作目录：优先使用会话 header 中的 cwd，
 * 其次使用客户端传递的 cwd，最后回退到进程 cwd。
 */
function sessionCwdOf(ctx: Context, sessionId: string, clientCwd?: string): string {
  const session = ctx.sessions.get(sessionId)
  const headerCwd = session?.header.cwd
  if (headerCwd !== undefined && headerCwd !== '') return headerCwd
  if (clientCwd !== undefined && clientCwd !== '') {
    if (!isAbsolute(clientCwd)) {
      throw new SidebarError('bad-request', `invalid working directory "${clientCwd}"`)
    }
    return clientCwd
  }
  return process.cwd()
}

/** 从 payload 中提取 { sessionId, cwd }。 */
function cwdOf(ctx: Context, payload: unknown): { sessionId: string; cwd: string } {
  const sessionId = requireString(payload, 'sessionId')
  const record = payload as { cwd?: unknown } | null
  const clientCwd = typeof record?.cwd === 'string' && record.cwd !== '' ? record.cwd : undefined
  return { sessionId, cwd: sessionCwdOf(ctx, sessionId, clientCwd) }
}

/** API 方法类型。 */
type ApiMethod = (payload: unknown) => Promise<unknown> | unknown

/** 构建 API 方法表。 */
function buildApi(ctx: Context): Record<string, ApiMethod> {
  return {
    'svn.status': async (payload) => {
      const { cwd } = cwdOf(ctx, payload)
      return svn.status(cwd)
    },
    'svn.diff': async (payload) => {
      const { cwd } = cwdOf(ctx, payload)
      const record = payload as { path?: unknown; rev?: unknown }
      const path = record.path === undefined ? undefined : requireString(payload, 'path')
      const rev = record.rev === undefined ? undefined : requireString(payload, 'rev')
      return { diff: await svn.diff(cwd, path, rev) }
    },
    'svn.add': async (payload) => {
      const { cwd } = cwdOf(ctx, payload)
      const record = payload as { paths?: unknown }
      const paths: string[] = Array.isArray(record.paths) ? record.paths.filter((p): p is string => typeof p === 'string') : []
      if (paths.length === 0) throw new SidebarError('bad-request', '"paths" must be a non-empty array of strings')
      await svn.add(cwd, paths)
      return { ok: true }
    },
    'svn.revert': async (payload) => {
      const { cwd } = cwdOf(ctx, payload)
      const record = payload as { paths?: unknown }
      const paths: string[] = Array.isArray(record.paths) ? record.paths.filter((p): p is string => typeof p === 'string') : []
      if (paths.length === 0) throw new SidebarError('bad-request', '"paths" must be a non-empty array of strings')
      await svn.revert(cwd, paths)
      return { ok: true }
    },
    'svn.stage': async (payload) => {
      const { cwd } = cwdOf(ctx, payload)
      const record = payload as { adds?: unknown; paths?: unknown }
      const adds: string[] = Array.isArray(record.adds) ? record.adds.filter((p): p is string => typeof p === 'string') : []
      const paths: string[] = Array.isArray(record.paths) ? record.paths.filter((p): p is string => typeof p === 'string') : []
      if (adds.length === 0 && paths.length === 0) throw new SidebarError('bad-request', '"paths" or "adds" must be a non-empty array of strings')
      await svn.stage(cwd, adds, paths)
      return { ok: true }
    },
    'svn.unstage': async (payload) => {
      const { cwd } = cwdOf(ctx, payload)
      const record = payload as { paths?: unknown }
      // paths 缺省或空数组 = 移出待提交列表的全部成员（对应 Git 的 unstage all）
      const paths: string[] = Array.isArray(record.paths) ? record.paths.filter((p): p is string => typeof p === 'string') : []
      await svn.unstage(cwd, paths)
      return { ok: true }
    },
    'svn.commit': async (payload) => {
      const { cwd } = cwdOf(ctx, payload)
      const message = requireString(payload, 'message')
      await svn.commit(cwd, message)
      // 提交产生新版本，历史缓存立即失效
      svn.invalidateLogCache(cwd)
      return { ok: true }
    },
    'svn.update': async (payload) => {
      const { cwd } = cwdOf(ctx, payload)
      const output = await svn.update(cwd)
      // 更新可能拉入他人提交（rHEAD 变化），历史缓存失效
      svn.invalidateLogCache(cwd)
      return { output }
    },
    'svn.log': async (payload) => {
      const { cwd } = cwdOf(ctx, payload)
      const record = payload as { limit?: unknown; offset?: unknown; force?: unknown }
      const limit = typeof record.limit === 'number' && Number.isInteger(record.limit) && record.limit > 0
        ? record.limit
        : 30
      const offset = typeof record.offset === 'number' && Number.isInteger(record.offset) && record.offset >= 0
        ? record.offset
        : 0
      // force：绕过缓存强制重取（刷新按钮）；默认命中缓存即返回
      const force = record.force === true
      return svn.log(cwd, limit, offset, force)
    },
    'svn.cat': async (payload) => {
      const { cwd } = cwdOf(ctx, payload)
      const rev = requireString(payload, 'rev')
      const path = requireString(payload, 'path')
      return { content: await svn.cat(cwd, rev, path) }
    },
    'svn.info': async (payload) => {
      const { cwd } = cwdOf(ctx, payload)
      return svn.info(cwd)
    },
    'svn.resolve': async (payload) => {
      const { cwd } = cwdOf(ctx, payload)
      const path = requireString(payload, 'path')
      const record = payload as { accept?: unknown }
      const accept = typeof record.accept === 'string' ? record.accept : 'working'
      await svn.resolve(cwd, path, accept as 'base' | 'working' | 'mine-conflict' | 'theirs-conflict' | 'mine-full' | 'theirs-full')
      return { ok: true }
    },
    'svn.revertRevision': async (payload) => {
      const { cwd } = cwdOf(ctx, payload)
      const revision = requireString(payload, 'revision')
      await svn.revertRevision(cwd, revision)
      // 撤销改动落回工作副本（不产生新提交），但保险起见失效缓存
      svn.invalidateLogCache(cwd)
      return { ok: true }
    },
    'svn.ignoreGet': async (payload) => {
      const { cwd } = cwdOf(ctx, payload)
      const rules = await svn.ignoreGet(cwd)
      return { rules }
    },
    'svn.ignoreSet': async (payload) => {
      const { cwd } = cwdOf(ctx, payload)
      const record = payload as { rules?: unknown }
      if (record.rules !== undefined && (!Array.isArray(record.rules) || record.rules.some(rule => typeof rule !== 'string'))) {
        throw new SidebarError('bad-request', '"rules" must be an array of strings')
      }
      const rules: string[] = Array.isArray(record.rules) ? record.rules : []
      const saved = await svn.ignoreSet(cwd, rules)
      return { ok: true, rules: saved }
    },
  }
}

/**
 * 插件入口：向 webServer 注册 `/sidebar/api/svn.*` 精确路由。
 * 精确路由优先于 dsh-better-sidebar 的 `/sidebar/api` 前缀路由，
 * 因此两个插件可以共存而不会产生 duplicate prefix route 冲突。
 */
export function apply(ctx: Context): void {
  const api = buildApi(ctx)
  const fence = createTrustFence(ctx.webRuntime.trustedHosts)

  for (const method of Object.keys(api)) {
    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path: `/sidebar/api/${method}`,
      // 参数类型交给上下文推断：0.1.7 起 register 声明的是 better-sidebar 自己的
      // SidebarHttpRequest / SidebarHttpResponse（node req/res 的结构子集），
      // 运行时传进来的就是真正的 node 对象，wire.ts 按同一结构面接收。
      handler: async (req, res) => {
        if (!fence(req)) {
          writeJson(res, 403, { ok: false, error: { code: 'forbidden', message: 'forbidden' } })
          return
        }
        if (req.method !== 'POST') {
          writeJson(res, 405, { ok: false, error: { code: 'method-error', message: 'method not allowed' } })
          return
        }
        try {
          // 惰性探测（进程级缓存）：系统没有 svn 时所有操作统一 svn-missing，
          // 避免用户看到无意义的 spawn ENOENT 报错。
          await svn.ensureSvnAvailable()
          const payload = await readJsonBody(req)
          writeOk(res, await api[method](payload))
        } catch (error) {
          writeError(res, error)
        }
      },
    }), `dsh-better-sidebar-svn: /sidebar/api/${method} route`)
  }
}

// 重新导出类型，方便消费者使用
export type { SvnStatusEntry, SvnStatusResult, SvnLogEntry, SvnLogPath } from './types.ts'