/**
 * SVN API 客户端封装：与 dsh-better-sidebar 的 api.ts 保持一致的调用风格。
 * 所有方法通过 POST /sidebar/api/<method> 调用后端路由。
 */
import type { SvnLogEntry, SvnStatusResult } from '../types.js'

/** 后端统一响应格式。 */
interface ApiResponse<T> {
  ok: boolean
  value?: T
  error?: { code?: string; message?: string }
}

/** API 调用错误。 */
export class SvnApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

/** 通用 POST 调用。 */
async function call<T>(method: string, payload: Record<string, unknown>): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/sidebar/api/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    throw new SvnApiError('network', error instanceof Error ? error.message : String(error))
  }
  const parsed: ApiResponse<T> | null = await response.json().catch(() => null)
  if (!response.ok || parsed === null || parsed.ok !== true || parsed.value === undefined) {
    throw new SvnApiError(
      parsed?.error?.code ?? 'http',
      parsed?.error?.message ?? `HTTP ${response.status}`,
    )
  }
  return parsed.value
}

/** 会话作用域（与 better-sidebar 的 SessionScope 兼容）。 */
export interface SessionScope {
  sessionId: string
  cwd?: string
}

/** 将 scope 折叠到 payload 中。 */
function scopePayload(scope: SessionScope, extra: Record<string, unknown>): Record<string, unknown> {
  return {
    sessionId: scope.sessionId,
    ...(scope.cwd !== undefined && scope.cwd !== '' ? { cwd: scope.cwd } : {}),
    ...extra,
  }
}

/** SVN API 接口。 */
export const svnApi = {
  /** 获取 SVN 工作副本状态。 */
  status: (scope: SessionScope) =>
    call<SvnStatusResult>('svn.status', scopePayload(scope, {})),

  /** 获取 diff：工作副本某文件的变更，或某版本的完整补丁。 */
  diff: (scope: SessionScope, path?: string, rev?: string) =>
    call<{ diff: string }>('svn.diff', scopePayload(scope, {
      ...(path !== undefined ? { path } : {}),
      ...(rev !== undefined ? { rev } : {}),
    })),

  /** 添加文件到版本控制。 */
  add: (scope: SessionScope, paths: string[]) =>
    call<{ ok: true }>('svn.add', scopePayload(scope, { paths })),

  /** 还原文件修改。 */
  revert: (scope: SessionScope, paths: string[]) =>
    call<{ ok: true }>('svn.revert', scopePayload(scope, { paths })),

  /** 暂存到待提交列表：adds 中的未版本控制文件会先 svn add（对应 Git stage）。 */
  stage: (scope: SessionScope, paths: string[], adds: string[] = []) =>
    call<{ ok: true }>('svn.stage', scopePayload(scope, { adds, paths })),

  /** 取消暂存：不传 paths = 移出待提交列表的全部成员（对应 Git unstage all）。 */
  unstage: (scope: SessionScope, paths?: string[]) =>
    call<{ ok: true }>('svn.unstage', scopePayload(scope, {
      ...(paths !== undefined ? { paths } : {}),
    })),

  /** 提交待提交列表中的变更（只提交已暂存内容）。 */
  commit: (scope: SessionScope, message: string) =>
    call<{ ok: true }>('svn.commit', scopePayload(scope, { message })),

  /** 更新工作副本。 */
  update: (scope: SessionScope) =>
    call<{ output: string }>('svn.update', scopePayload(scope, {})),

  /** 提交历史。force = 绕过服务端缓存强制重取（刷新按钮）。 */
  log: (scope: SessionScope, limit?: number, offset?: number, force?: boolean) =>
    call<SvnLogEntry[]>('svn.log', scopePayload(scope, {
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {}),
      ...(force === true ? { force: true } : {}),
    })),

  /** 获取某版本文件内容。 */
  cat: (scope: SessionScope, rev: string, path: string) =>
    call<{ content: string | null }>('svn.cat', scopePayload(scope, { rev, path })),

  /** 获取仓库信息。 */
  info: (scope: SessionScope) =>
    call<Record<string, string | undefined>>('svn.info', scopePayload(scope, {})),

  /** 解决冲突。 */
  resolve: (scope: SessionScope, path: string, accept?: string) =>
    call<{ ok: true }>('svn.resolve', scopePayload(scope, {
      path,
      ...(accept !== undefined ? { accept } : {}),
    })),

  /** 撤销某次提交（改动落回工作副本）。 */
  revertRevision: (scope: SessionScope, revision: string) =>
    call<{ ok: true }>('svn.revertRevision', scopePayload(scope, { revision })),
}