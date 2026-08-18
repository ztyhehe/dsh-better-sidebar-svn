/**
 * SVN diff 标签页：从 SVN 面板（工作副本变更 / 历史提交）打开的独立 diff 视图，
 * 与 dsh-better-sidebar 的 DiffTab 同构：加载统一 diff 文本、VSCode 式渲染
 * （分文件区块 + hunk 头 + 新旧行号槽 + 上下文/增/删行着色）、头部带刷新按钮。
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { IconRefreshOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionScope } from './api.ts'
import { svnApi } from './api.ts'

/** 一条渲染的 diff 行。 */
interface DiffLine {
  kind: 'ctx' | 'del' | 'add' | 'meta'
  text: string
  oldNum: number | null
  newNum: number | null
}

/** 一个 hunk。 */
interface DiffHunk {
  oldStart: number
  newStart: number
  header: string
  lines: DiffLine[]
}

/** 一个文件区块。 */
interface DiffFile {
  oldPath: string
  newPath: string
  binary: boolean
  hunks: DiffHunk[]
}

/** 解析 hunk 头 `@@ -a[,b] +c[,d] @@ section`。 */
function parseHunkHeader(line: string): { oldStart: number; newStart: number; header: string } | null {
  const match = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/.exec(line)
  if (match === null) return null
  return { oldStart: Number(match[1]), newStart: Number(match[3]), header: match[5] ?? '' }
}

/** 解析 `svn diff` 的统一 diff 文本（容忍 `Index:`/`====` 前导行与 `(revision N)` 路径后缀）。 */
export function parseUnifiedDiff(text: string): DiffFile[] {
  const files: DiffFile[] = []
  const lines = text.split('\n')
  let file: DiffFile | null = null
  let hunk: DiffHunk | null = null
  let oldNum = 0
  let newNum = 0
  for (const line of lines) {
    if (line.startsWith('--- ')) {
      file = {
        oldPath: line.slice(4).split('\t')[0]?.trim() ?? '',
        newPath: '',
        binary: false,
        hunks: [],
      }
      files.push(file)
      hunk = null
      continue
    }
    if (line.startsWith('+++ ') && file !== null) {
      file.newPath = line.slice(4).split('\t')[0]?.trim() ?? ''
      continue
    }
    if (line.startsWith('Binary file') && file !== null) {
      file.binary = true
      continue
    }
    const header = parseHunkHeader(line)
    if (header !== null && file !== null) {
      hunk = { ...header, lines: [] }
      file.hunks.push(hunk)
      oldNum = header.oldStart
      newNum = header.newStart
      hunk.lines.push({ kind: 'meta', text: line, oldNum: null, newNum: null })
      continue
    }
    if (hunk === null) continue
    if (line.startsWith('+')) {
      hunk.lines.push({ kind: 'add', text: line.slice(1), oldNum: null, newNum })
      newNum += 1
    } else if (line.startsWith('-')) {
      hunk.lines.push({ kind: 'del', text: line.slice(1), oldNum, newNum: null })
      oldNum += 1
    } else if (line.startsWith(' ')) {
      hunk.lines.push({ kind: 'ctx', text: line.slice(1), oldNum, newNum })
      oldNum += 1
      newNum += 1
    } else if (line.startsWith('\\')) {
      hunk.lines.push({ kind: 'meta', text: line, oldNum: null, newNum: null })
    }
  }
  return files
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

export function SvnDiffTab(props: { scope: SessionScope; meta: SvnDiffMeta }) {
  const { scope, meta } = props
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [diff, setDiff] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

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

  const title = meta.kind === 'commit'
    ? `r${meta.revision ?? ''} ${meta.subject ?? ''}`
    : (meta.path ?? '')

  const renderLine = (line: DiffLine, index: number): ReactNode => (
    <div key={index} className={`svn-diff-line svn-diff-${line.kind}`}>
      <span className="svn-diff-num">{line.oldNum ?? ''}</span>
      <span className="svn-diff-num">{line.newNum ?? ''}</span>
      <span className="svn-diff-code">{line.text}</span>
    </div>
  )

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
      {loading && <div className="svn-placeholder">加载 diff...</div>}
      {!loading && error !== null && <div className="svn-error">{error}</div>}
      {!loading && error === null && (diff === null || diff === '') && (
        <div className="svn-placeholder">无文本变更</div>
      )}
      {!loading && error === null && diff !== null && diff !== '' && (
        parseUnifiedDiff(diff).map((file, fileIndex) => (
          <div key={fileIndex} className="svn-diff-file">
            <div className="svn-diff-fileheader" title={file.newPath || file.oldPath}>
              <span className="svn-diff-filepath">{file.newPath || file.oldPath}</span>
              {file.oldPath !== '' && file.newPath !== '' && file.oldPath !== file.newPath && (
                <span className="svn-diff-fileold">{file.oldPath}</span>
              )}
            </div>
            {file.binary && <div className="svn-placeholder">二进制文件</div>}
            {file.hunks.map((hunk, hunkIndex) => (
              <div key={hunkIndex} className="svn-diff-hunk">
                {hunk.lines.map((line, lineIndex) => renderLine(line, lineIndex))}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  )
}
