/**
 * dsh-better-sidebar-svn host 半：注册 `/sidebar/api/svn.*` JSON API 路由。
 * 所有操作通过系统 `svn` 二进制完成，与 git.ts 设计对称。
 *
 * 路由列表：
 *  - svn.status    → 工作副本状态快照
 *  - svn.diff      → 文件 diff 文本
 *  - svn.add       → 添加文件到版本控制
 *  - svn.revert     → 还原文件修改
 *  - svn.commit     → 提交变更
 *  - svn.update     → 更新工作副本
 *  - svn.log        → 提交历史（分页）
 *  - svn.cat        → 获取某版本文件内容
 *  - svn.info       → 仓库信息
 *  - svn.resolve    → 解决冲突
 */
import { isAbsolute } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
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
    'svn.commit': async (payload) => {
      const { cwd } = cwdOf(ctx, payload)
      const message = requireString(payload, 'message')
      await svn.commit(cwd, message)
      return { ok: true }
    },
    'svn.update': async (payload) => {
      const { cwd } = cwdOf(ctx, payload)
      return { output: await svn.update(cwd) }
    },
    'svn.log': async (payload) => {
      const { cwd } = cwdOf(ctx, payload)
      const record = payload as { limit?: unknown; offset?: unknown }
      const limit = typeof record.limit === 'number' && Number.isInteger(record.limit) && record.limit > 0
        ? record.limit
        : 30
      const offset = typeof record.offset === 'number' && Number.isInteger(record.offset) && record.offset >= 0
        ? record.offset
        : 0
      return svn.log(cwd, limit, offset)
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
      return { ok: true }
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
      handler: async (req: IncomingMessage, res: ServerResponse) => {
        if (!fence(req)) {
          writeJson(res, 403, { ok: false, error: { code: 'forbidden', message: 'forbidden' } })
          return
        }
        if (req.method !== 'POST') {
          writeJson(res, 405, { ok: false, error: { code: 'method-error', message: 'method not allowed' } })
          return
        }
        try {
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