/**
 * SVN 源代码管理面板：与 dsh-better-sidebar 的 GitView 交互保持一致——
 * 变更列表（行点击开独立 diff 标签页）、提交信息框（Ctrl+Enter）、更新、
 * 历史（懒加载分页，点击看提交 diff）。文件行与历史行带右键菜单
 * （打开编辑器 / 还原 / 复制路径 / 版本号等），危险操作走确认弹窗。
 * 刷新为手动 + 挂载/作用域变化时（无文件监听 - KISS）。
 */
import { useCallback, useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import {
  Button, IconCheckOutline16, IconCodeOutline16, IconCopyOutline16, IconDownloadOutline16,
  IconPlusOutline16, IconRefreshOutline16, IconTrashOutline16, Input, Menu, Modal, writeClipboard,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { BetterSidebarService } from 'dsh-better-sidebar'
import type { SvnLogEntry, SvnStatusEntry, SvnStatusResult } from '../types.js'
import type { SessionScope } from './api.ts'
import { svnApi } from './api.ts'

/** SVN 状态字母（badge 展示）。 */
const STATUS_LABELS: Record<string, string> = {
  modified: 'M',
  added: 'A',
  deleted: 'D',
  conflicted: 'C',
  replaced: 'R',
  unversioned: '?',
  missing: '!',
  normal: '',
}

/** 状态 badge 的 CSS 类。 */
const STATUS_CLASSES: Record<string, string> = {
  modified: 'svn-status-modified',
  added: 'svn-status-added',
  deleted: 'svn-status-deleted',
  conflicted: 'svn-status-conflicted',
  replaced: 'svn-status-replaced',
  unversioned: 'svn-status-unversioned',
  missing: 'svn-status-missing',
  normal: '',
}

/** 是否为已版本控制的变更（可提交 / 可还原）。 */
function isVersionedChange(entry: SvnStatusEntry): boolean {
  return entry.status !== 'unversioned' && entry.status !== 'normal' && entry.status !== 'missing'
}

/** 最后一段文件名。 */
function baseName(path: string): string {
  const at = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return at === -1 ? path : path.slice(at + 1)
}

/** 相对时间。 */
function relativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return iso
  const diff = Math.max(0, now - then)
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  if (diff < 30 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`
  return `${Math.floor(diff / (365 * 86_400_000))} 年前`
}

/** cwd 与相对路径拼出绝对路径（svn status 输出相对路径）。 */
function absolutePath(cwd: string | undefined, path: string): string {
  if (path.startsWith('/') || path.startsWith('\\') || /^[a-zA-Z]:[\\/]/.test(path)) return path
  const base = cwd ?? ''
  if (base === '') return path
  return `${base.replace(/[\\/]$/, '')}/${path}`
}

/** 待确认的危险操作。 */
interface ConfirmState {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => Promise<unknown>
}

/** 历史批次大小（懒加载分页）。 */
const LOG_BATCH = 20

export interface SvnViewProps {
  scope: SessionScope
  betterSidebar: BetterSidebarService
  onOpenFile: (path: string) => void
}

export function SvnView(props: SvnViewProps) {
  const { scope, betterSidebar, onOpenFile } = props
  const [status, setStatus] = useState<SvnStatusResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [logEntries, setLogEntries] = useState<SvnLogEntry[]>([])
  const [commitMsg, setCommitMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  /** 历史是否已翻到底（批次短于 LOG_BATCH）。 */
  const [logEnded, setLogEnded] = useState(false)
  const [logLoadingMore, setLogLoadingMore] = useState(false)

  /** 打开中的文件行右键菜单（光标位置，portal 菜单用）。 */
  const [fileMenu, setFileMenu] = useState<{ entry: SvnStatusEntry; x: number; y: number } | null>(null)
  /** 打开中的历史行右键菜单。 */
  const [historyMenu, setHistoryMenu] = useState<{ entry: SvnLogEntry; x: number; y: number } | null>(null)
  /** 待确认的危险操作。 */
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const [statusResult, logResult] = await Promise.all([
        svnApi.status(scope),
        // 只取历史第一页，其余通过「加载更多」补齐。
        svnApi.log(scope, LOG_BATCH, 0).catch(() => [] as SvnLogEntry[]),
      ])
      setStatus(statusResult)
      setLogEntries(logResult)
      setLogEnded(logResult.length < LOG_BATCH)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setLoading(false)
    }
  }, [scope.sessionId, scope.cwd])

  useEffect(() => { void refresh() }, [refresh])

  /** 追加下一页历史（仅当用户要求更多时）。 */
  const loadMoreLog = async (): Promise<void> => {
    if (logLoadingMore || logEnded) return
    setLogLoadingMore(true)
    try {
      const next = await svnApi.log(scope, LOG_BATCH, logEntries.length)
      setLogEntries(entries => [...entries, ...next])
      if (next.length < LOG_BATCH) setLogEnded(true)
    } catch (reason) {
      setActionError(`历史加载失败: ${reason instanceof Error ? reason.message : String(reason)}`)
    } finally {
      setLogLoadingMore(false)
    }
  }

  /** 打开一个独立 diff 标签页（同 id 已存在则聚焦）。 */
  const openTab = (id: string, title: string, meta: Record<string, unknown>): void => {
    betterSidebar.openTab({ type: 'dsh-better-sidebar-svn:diff', id, title, meta }, scope)
  }

  /** 工作副本某文件的变更 diff 标签页。 */
  const openWorktreeDiff = (entry: SvnStatusEntry): void => {
    openTab(`svn-diff:w:${entry.path}`, baseName(entry.path), { kind: 'worktree', path: entry.path })
  }

  /** 某次提交的完整 diff 标签页。 */
  const openCommitDiff = (entry: SvnLogEntry): void => {
    openTab(`svn-diff:c:${entry.revision}`, `r${entry.revision} ${firstLine(entry.message)}`, { kind: 'commit', revision: entry.revision, subject: firstLine(entry.message) })
  }

  /** 统一操作：置忙、执行、刷新、捕获错误。 */
  const runAction = async (action: () => Promise<unknown>): Promise<void> => {
    if (busy) return
    setBusy(true)
    setActionError(null)
    try {
      await action()
      await refresh()
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setBusy(false)
    }
  }

  const commit = async (): Promise<void> => {
    const message = commitMsg.trim()
    if (message === '' || busy || committableEntries.length === 0) return
    setBusy(true)
    setActionError(null)
    try {
      await svnApi.commit(scope, message)
      setCommitMsg('')
      await refresh()
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setBusy(false)
    }
  }

  /** 确认弹窗后的危险操作。 */
  const runConfirmed = (confirmState: ConfirmState): void => {
    setConfirm({ ...confirmState, onConfirm: async () => {
      setBusy(true)
      setActionError(null)
      try {
        await confirmState.onConfirm()
        await refresh()
      } catch (reason) {
        setActionError(reason instanceof Error ? reason.message : String(reason))
      } finally {
        setBusy(false)
      }
    } })
  }

  const copy = (text: string): void => {
    void writeClipboard(text)
  }

  const openFileMenu = (event: MouseEvent, entry: SvnStatusEntry): void => {
    event.preventDefault()
    event.stopPropagation()
    setFileMenu({ entry, x: event.clientX, y: event.clientY })
  }

  const openHistoryMenu = (event: MouseEvent, entry: SvnLogEntry): void => {
    event.preventDefault()
    event.stopPropagation()
    setHistoryMenu({ entry, x: event.clientX, y: event.clientY })
  }

  const changedEntries = (status?.entries ?? []).filter(e => e.status !== 'normal')
  const committableEntries = changedEntries.filter(isVersionedChange)

  const renderEntry = (entry: SvnStatusEntry): ReactNode => {
    const badge = STATUS_LABELS[entry.status] ?? entry.status
    return (
      <div key={entry.path} className="svn-row">
        <button
          type="button"
          className="svn-row-main"
          title={entry.path}
          onClick={() => { openWorktreeDiff(entry) }}
          onContextMenu={(event) => { openFileMenu(event, entry) }}
        >
          <span className={`svn-badge ${STATUS_CLASSES[entry.status] ?? ''}`}>{badge}</span>
          <span className="svn-name">{entry.path}</span>
        </button>
        <button
          type="button"
          className="svn-iconbtn"
          aria-label={inlineLabel(entry)}
          title={inlineLabel(entry)}
          disabled={busy}
          onClick={() => {
            if (entry.status === 'unversioned') void runAction(() => svnApi.add(scope, [entry.path]))
            else if (entry.status === 'conflicted') void runAction(() => svnApi.resolve(scope, entry.path))
            else openWorktreeDiff(entry)
          }}
        >
          {inlineIcon(entry)}
        </button>
      </div>
    )
  }

  return (
    <div className="svn-panel">
      <div className="svn-header">
        <span className="svn-branch" title={status?.relativeUrl ?? ''}>
          {status?.relativeUrl !== undefined ? status.relativeUrl.replace('^/', '') : ''}
          {status?.revision !== undefined ? <span className="svn-revision">{` r${status.revision}`}</span> : null}
        </span>
        <span className="svn-header-actions">
          <button
            type="button"
            className="svn-iconbtn"
            aria-label="更新"
            title="更新 (svn update)"
            disabled={busy || (status !== null && !status.isRepo)}
            onClick={() => { void runAction(() => svnApi.update(scope)) }}
          >
            <IconDownloadOutline16 size={14} />
          </button>
          <button
            type="button"
            className="svn-iconbtn"
            aria-label="刷新"
            title="刷新"
            onClick={() => { void refresh() }}
          >
            <IconRefreshOutline16 size={14} />
          </button>
        </span>
      </div>

      {loading && <div className="svn-placeholder">加载中...</div>}
      {!loading && error !== null && <div className="svn-error">{error}</div>}
      {!loading && status !== null && !status.isRepo && (
        <div className="svn-placeholder">当前目录不是 SVN 工作副本</div>
      )}

      {status !== null && status.isRepo && (
        <>
          <div className="svn-section">
            <div className="svn-section-header">
              <span>{`变更 (${changedEntries.length})`}</span>
            </div>
            {changedEntries.length === 0 && <div className="svn-empty">无变更</div>}
            {changedEntries.map(entry => renderEntry(entry))}
          </div>

          <div className="svn-commit">
            <Input
              className="svn-commit-input"
              placeholder="提交信息（Ctrl+Enter 提交）"
              value={commitMsg}
              disabled={busy}
              onChange={(event) => { setCommitMsg(event.target.value); setActionError(null) }}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') void commit()
              }}
            />
            <button
              type="button"
              className="svn-btn svn-btn-primary"
              disabled={busy || commitMsg.trim() === '' || committableEntries.length === 0}
              title={committableEntries.length === 0 ? '没有已版本控制的变更可提交' : undefined}
              onClick={() => { void commit() }}
            >
              提交
            </button>
          </div>
          {actionError !== null && <div className="svn-error">{actionError}</div>}

          <div className="svn-section">
            <div className="svn-section-header"><span>历史</span></div>
            {logEntries.map(entry => (
              <div
                key={entry.revision}
                role="button"
                tabIndex={0}
                className="svn-log-row"
                title={`${entry.author} · ${entry.date}\n${entry.message}`}
                onClick={() => { openCommitDiff(entry) }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openCommitDiff(entry)
                  }
                }}
                onContextMenu={(event) => { openHistoryMenu(event, entry) }}
              >
                <span className="svn-log-line1">
                  <span className="svn-log-revision">{`r${entry.revision}`}</span>
                  <span className="svn-log-message">{firstLine(entry.message)}</span>
                </span>
                <span className="svn-log-line2">
                  <span className="svn-log-meta">{entry.author} · {relativeTime(entry.date)}</span>
                </span>
              </div>
            ))}
            {!logEnded && (
              <button
                type="button"
                className="svn-log-more"
                disabled={logLoadingMore || busy}
                onClick={() => { void loadMoreLog() }}
              >
                {logLoadingMore ? '加载中...' : '加载更多'}
              </button>
            )}
          </div>

          {/*
            文件行右键菜单（portal 到光标处，面板 overflow 裁剪不到）。
          */}
          <Menu
            open={fileMenu !== null}
            onClose={() => { setFileMenu(null) }}
            items={[
              { id: 'open', label: '在编辑器中打开', icon: <IconCodeOutline16 size={14} /> },
              { id: 'diff', label: '查看变更' },
              ...(fileMenu !== null && fileMenu.entry.status === 'unversioned'
                ? [{ id: 'add', label: '添加到版本控制', icon: <IconPlusOutline16 size={14} /> }]
                : []),
              ...(fileMenu !== null && fileMenu.entry.status === 'conflicted'
                ? [{ id: 'resolve', label: '解决冲突（保留当前）', icon: <IconCheckOutline16 size={14} /> }]
                : []),
              ...(fileMenu !== null && isVersionedChange(fileMenu.entry)
                ? [{ id: 'revert', label: '还原', icon: <IconTrashOutline16 size={14} />, danger: true }]
                : []),
              { type: 'separator', id: 'sep1' },
              { id: 'relative', label: '复制相对路径', icon: <IconCopyOutline16 size={14} /> },
              { id: 'absolute', label: '复制绝对路径', icon: <IconCopyOutline16 size={14} /> },
            ]}
            onSelect={(id) => {
              const target = fileMenu
              if (target === null) return
              setFileMenu(null)
              if (id === 'open') {
                onOpenFile(target.entry.path)
                return
              }
              if (id === 'diff') {
                openWorktreeDiff(target.entry)
                return
              }
              if (id === 'add') {
                void runAction(() => svnApi.add(scope, [target.entry.path]))
                return
              }
              if (id === 'resolve') {
                void runAction(() => svnApi.resolve(scope, target.entry.path))
                return
              }
              if (id === 'revert') {
                runConfirmed({
                  title: '还原',
                  description: `确定要还原 "${target.entry.path}" 的本地修改吗？此操作不可撤销。`,
                  confirmLabel: '还原',
                  onConfirm: () => svnApi.revert(scope, [target.entry.path]),
                })
                return
              }
              if (id === 'relative') {
                copy(target.entry.path)
                return
              }
              if (id === 'absolute') copy(absolutePath(scope.cwd, target.entry.path))
            }}
            portal
            align="start"
            getAnchorRect={() => (fileMenu === null ? null : new DOMRect(fileMenu.x, fileMenu.y, 0, 0))}
            anchor={<span />}
          />

          {/* 历史行右键菜单。 */}
          <Menu
            open={historyMenu !== null}
            onClose={() => { setHistoryMenu(null) }}
            items={[
              { id: 'view', label: '查看提交变更' },
              { id: 'copyRev', label: '复制版本号', icon: <IconCopyOutline16 size={14} /> },
              { id: 'copyMsg', label: '复制提交信息', icon: <IconCopyOutline16 size={14} /> },
              { type: 'separator', id: 'sep2' },
              { id: 'rollback', label: '还原此提交', danger: true },
            ]}
            onSelect={(id) => {
              const target = historyMenu
              if (target === null) return
              setHistoryMenu(null)
              if (id === 'view') {
                openCommitDiff(target.entry)
                return
              }
              if (id === 'copyRev') {
                copy(target.entry.revision)
                return
              }
              if (id === 'copyMsg') {
                copy(target.entry.message)
                return
              }
              if (id === 'rollback') {
                runConfirmed({
                  title: '还原此提交',
                  description: `确定要还原 r${target.entry.revision} "${firstLine(target.entry.message)}" 吗？撤销的改动会落回工作副本，确认后还需提交。`,
                  confirmLabel: '还原',
                  onConfirm: () => svnApi.revertRevision(scope, target.entry.revision),
                })
              }
            }}
            portal
            align="start"
            getAnchorRect={() => (historyMenu === null ? null : new DOMRect(historyMenu.x, historyMenu.y, 0, 0))}
            anchor={<span />}
          />

          {/* 危险操作先落这里：取消 / 确认。 */}
          <Modal
            open={confirm !== null}
            onClose={() => { setConfirm(null) }}
            title={confirm?.title ?? ''}
            closeLabel="取消"
            footer={(
              <>
                <Button variant="outline" onClick={() => { setConfirm(null) }}>取消</Button>
                <Button
                  variant="primary"
                  disabled={busy}
                  onClick={() => {
                    const pending = confirm
                    if (pending === null) return
                    setConfirm(null)
                    void pending.onConfirm()
                  }}
                >
                  {confirm?.confirmLabel ?? ''}
                </Button>
              </>
            )}
          >
            <p className="svn-confirm-desc">{confirm?.description}</p>
          </Modal>
        </>
      )}
    </div>
  )
}

/** 提交信息首行（多行消息取第一行做主题）。 */
function firstLine(message: string): string {
  const index = message.indexOf('\n')
  return (index === -1 ? message : message.slice(0, index)).trim()
}

/** 行内 hover 按钮的语义标签。 */
function inlineLabel(entry: SvnStatusEntry): string {
  if (entry.status === 'unversioned') return '添加到版本控制'
  if (entry.status === 'conflicted') return '解决冲突（保留当前）'
  return '查看变更'
}

/** 行内 hover 按钮的图标。 */
function inlineIcon(entry: SvnStatusEntry): ReactNode {
  if (entry.status === 'unversioned') return <IconPlusOutline16 />
  if (entry.status === 'conflicted') return <IconCheckOutline16 />
  return <IconCodeOutline16 />
}
