/**
 * SVN diff 标签页：从 SVN 面板（工作副本变更 / 历史提交）打开的独立 diff 视图，
 * 与 dsh-better-sidebar 的 DiffTab 同构：加载统一 diff 文本、VSCode 式渲染
 * （分文件区块 + hunk 头 + 新旧行号槽 + 上下文/增/删行着色）、头部带刷新按钮。
 *
 * v0.2.0 在标题栏下方增加纯前端「路径过滤 + 关键词搜索」工具条：
 *  - 路径过滤：按文件路径子串只渲染匹配的文件区块；
 *  - 关键词：命中行高亮、n/m 计数、Enter / Shift+Enter 上下跳转，
 *    可选折叠无命中的 hunk。
 * 不新增任何后端请求（diff 文本已经整体加载）。
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { IconRefreshOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { findMatchRanges, parseUnifiedDiff, pathMatchesFilter, type DiffFile, type DiffLine } from './diff.ts'
import type { SessionScope } from './api.ts'
import { svnApi } from './api.ts'

/** 一条带搜索命中信息的渲染行。 */
interface ViewDiffLine extends DiffLine {
  matchRanges: Array<{ start: number; end: number }>
  /** 该行首个命中的全局序号（用于 n/m 导航与滚动定位）。 */
  matchSeq: number | undefined
}

/** 一个带搜索命中统计的 hunk。 */
interface ViewDiffHunk {
  oldStart: number
  newStart: number
  header: string
  lines: ViewDiffLine[]
  hasMatch: boolean
  collapsed: boolean
}

/** 一个带搜索命中统计的文件区块。 */
interface ViewDiffFile extends DiffFile {
  hunks: ViewDiffHunk[]
}

/** diff tab 的 meta 载荷（JSON 可序列化，随布局持久化）。 */
export interface SvnDiffMeta {
  kind: 'worktree' | 'commit'
  /** worktree：变更文件路径。 */
  path?: string
  /** commit：版本号与主题（标题展示用）。 */
  revision?: string
  subject?: string
}

/** 最后一段文件名。 */
function baseName(path: string): string {
  const at = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return at === -1 ? path : path.slice(at + 1)
}

/** 拼接关键词高亮片段。 */
function highlightText(text: string, ranges: Array<{ start: number; end: number }>, active: boolean): ReactNode {
  if (ranges.length === 0) return text
  const parts: ReactNode[] = []
  let cursor = 0
  ranges.forEach((range, index) => {
    if (range.start > cursor) parts.push(text.slice(cursor, range.start))
    parts.push(
      <mark
        key={`${range.start}:${index}`}
        className={active ? 'svn-diff-mark svn-diff-mark-active' : 'svn-diff-mark'}
      >
        {text.slice(range.start, range.end)}
      </mark>,
    )
    cursor = range.end
  })
  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts
}

export function SvnDiffTab(props: { scope: SessionScope; meta: SvnDiffMeta }) {
  const { scope, meta } = props
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [diff, setDiff] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [query, setQuery] = useState('')
  const [pathFilter, setPathFilter] = useState('')
  const [collapseUnmatched, setCollapseUnmatched] = useState(false)
  const [activeMatch, setActiveMatch] = useState(-1)

  const refresh = useCallback((): void => { setTick(value => value + 1) }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setDiff(null)
    const load = async (): Promise<void> => {
      try {
        const result = meta.kind === 'commit'
          ? await svnApi.diff(scope, undefined, meta.revision)
          : await svnApi.diff(scope, meta.path)
        if (!cancelled) setDiff(result.diff)
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [scope.sessionId, scope.cwd, meta, tick])

  /** 路径过滤 + 关键词命中模型：渲染与导航共用同一份计算，保证序号一致。 */
  const view = useMemo(() => {
    const parsed = diff === null ? [] : parseUnifiedDiff(diff)
    const pathNeedle = pathFilter.trim().toLowerCase()
    const search = query.trim()
    let matchCount = 0
    const files: ViewDiffFile[] = []

    for (const file of parsed) {
      if (!pathMatchesFilter(file.newPath || file.oldPath, pathNeedle)) continue
      const hunks: ViewDiffHunk[] = file.hunks.map((hunk) => {
        let hasMatch = false
        const lines: ViewDiffLine[] = hunk.lines.map((line) => {
          const matchRanges = search !== '' && line.kind !== 'meta'
            ? findMatchRanges(line.text, search)
            : []
          const matched = matchRanges.length > 0
          if (matched) {
            hasMatch = true
            const seq = matchCount
            matchCount += 1
            return { ...line, matchRanges, matchSeq: seq }
          }
          return { ...line, matchRanges, matchSeq: undefined }
        })
        return {
          ...hunk,
          lines,
          hasMatch,
          collapsed: collapseUnmatched && search !== '' && !hasMatch,
        }
      })
      files.push({ ...file, hunks })
    }
    return { files, matchCount }
  }, [diff, pathFilter, query, collapseUnmatched])

  // 搜索条件变化时回到第一个命中。
  useEffect(() => {
    setActiveMatch(view.matchCount === 0 ? -1 : 0)
  }, [query, pathFilter, diff, collapseUnmatched, view.matchCount])

  // 当前命中变化时滚动到可视区域。
  useEffect(() => {
    if (activeMatch < 0 || activeMatch >= view.matchCount) return
    document.getElementById(`svn-diff-match-${activeMatch}`)?.scrollIntoView({ block: 'center' })
  }, [activeMatch, view.matchCount])

  const jump = useCallback((direction: 1 | -1): void => {
    setActiveMatch((current) => {
      if (view.matchCount === 0) return -1
      const next = (current + direction + view.matchCount) % view.matchCount
      // current 为 -1 时向前翻到最后一个，向后翻到第一个
      return next
    })
  }, [view.matchCount])

  const searchActive = query.trim() !== ''
  const matchCounter = searchActive
    ? view.matchCount === 0 ? '0/0' : `${activeMatch + 1}/${view.matchCount}`
    : null

  const title = meta.kind === 'commit'
    ? `r${meta.revision ?? ''} ${meta.subject ?? ''}`
    : (meta.path ?? '')

  const renderLine = (line: ViewDiffLine, index: number): ReactNode => {
    const active = line.matchSeq !== undefined && line.matchSeq === activeMatch
    return (
      <div
        key={index}
        id={line.matchSeq === undefined ? undefined : `svn-diff-match-${line.matchSeq}`}
        className={`svn-diff-line svn-diff-${line.kind}${active ? ' svn-diff-line-active' : ''}`}
      >
        <span className="svn-diff-num">{line.oldNum ?? ''}</span>
        <span className="svn-diff-num">{line.newNum ?? ''}</span>
        <span className="svn-diff-code">{highlightText(line.text, line.matchRanges, active)}</span>
      </div>
    )
  }

  return (
    <div className="svn-difftab">
      <div className="svn-difftab-header">
        <span className="svn-difftab-title" title={title}>{title}</span>
        <button
          type="button"
          className="svn-iconbtn"
          aria-label="刷新"
          title="刷新"
          onClick={refresh}
        >
          <IconRefreshOutline16 size={14} />
        </button>
      </div>
      {!loading && error === null && diff !== null && diff !== '' && (
        <div className="svn-difftab-controls">
          <input
            className="svn-diff-input"
            type="search"
            placeholder="按路径过滤…"
            aria-label="按路径过滤"
            value={pathFilter}
            onChange={(event) => { setPathFilter(event.target.value) }}
          />
          <div className="svn-diff-searchbox">
            <input
              className="svn-diff-input"
              type="search"
              placeholder="搜索 diff…"
              aria-label="搜索 diff"
              value={query}
              onChange={(event) => { setQuery(event.target.value) }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  jump(event.shiftKey ? -1 : 1)
                } else if (event.key === 'Escape') {
                  setQuery('')
                }
              }}
            />
            {matchCounter !== null && <span className="svn-diff-count">{matchCounter}</span>}
            <button
              type="button"
              className="svn-iconbtn svn-diff-navbtn"
              aria-label="上一个匹配 (Shift+Enter)"
              title="上一个匹配 (Shift+Enter)"
              disabled={view.matchCount === 0}
              onClick={() => { jump(-1) }}
            >↑</button>
            <button
              type="button"
              className="svn-iconbtn svn-diff-navbtn"
              aria-label="下一个匹配 (Enter)"
              title="下一个匹配 (Enter)"
              disabled={view.matchCount === 0}
              onClick={() => { jump(1) }}
            >↓</button>
          </div>
          <button
            type="button"
            className={`svn-iconbtn svn-diff-collapsebtn${collapseUnmatched ? ' svn-diff-collapsebtn-active' : ''}`}
            aria-pressed={collapseUnmatched}
            disabled={!searchActive}
            title="折叠没有命中的 hunk"
            onClick={() => { setCollapseUnmatched(value => !value) }}
          >折叠</button>
        </div>
      )}
      {loading && <div className="svn-placeholder">加载 diff...</div>}
      {!loading && error !== null && <div className="svn-error">{error}</div>}
      {!loading && error === null && (diff === null || diff === '') && (
        <div className="svn-placeholder">无文本变更</div>
      )}
      {!loading && error === null && diff !== null && diff !== '' && (
        searchActive && view.files.length > 0 && view.matchCount === 0 ? (
          <div className="svn-placeholder">没有匹配的 diff 行</div>
        ) : (
          view.files.map((file, fileIndex) => (
            <div key={fileIndex} className="svn-diff-file">
              <div className="svn-diff-fileheader" title={file.newPath || file.oldPath}>
                <span className="svn-diff-filepath">{file.newPath || file.oldPath}</span>
                {file.oldPath !== '' && file.newPath !== '' && file.oldPath !== file.newPath && (
                  <span className="svn-diff-fileold">{file.oldPath}</span>
                )}
              </div>
              {file.binary && <div className="svn-placeholder">二进制文件</div>}
              {file.hunks.map((hunk, hunkIndex) => (
                hunk.collapsed ? (
                  <button
                    key={hunkIndex}
                    type="button"
                    className="svn-diff-hunk-collapsed"
                    onClick={() => { setCollapseUnmatched(false) }}
                    title="点击展开全部 hunk"
                  >
                    已折叠无匹配 hunk（{hunk.lines.length} 行）— 点击展开
                  </button>
                ) : (
                  <div key={hunkIndex} className="svn-diff-hunk">
                    {hunk.lines.map((line, lineIndex) => renderLine(line, lineIndex))}
                  </div>
                )
              ))}
            </div>
          ))
        )
      )}
    </div>
  )
}

// 保持 v0.1.0 的外部符号兼容：解析函数不再内联实现，但继续从本模块可导入。
export { parseUnifiedDiff } from './diff.ts'
export type { DiffLine, DiffHunk, DiffFile } from './diff.ts'