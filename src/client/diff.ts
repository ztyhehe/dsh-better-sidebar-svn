/**
 * 统一 diff 解析（纯函数，无 React 依赖）：与 dsh-better-sidebar DiffTab 同构，
 * 单独成文件以便 SvnDiffTab 与 Node 单测共用。
 */

/** 一条渲染的 diff 行。 */
export interface DiffLine {
  kind: 'ctx' | 'del' | 'add' | 'meta'
  text: string
  oldNum: number | null
  newNum: number | null
}

/** 一个 hunk。 */
export interface DiffHunk {
  oldStart: number
  newStart: number
  header: string
  lines: DiffLine[]
}

/** 一个文件区块。 */
export interface DiffFile {
  oldPath: string
  newPath: string
  binary: boolean
  hunks: DiffHunk[]
}

/** 解析 hunk 头 `@@ -a[,b] +c[,d] @@ section`。 */
export function parseHunkHeader(line: string): { oldStart: number; newStart: number; header: string } | null {
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

/** 在一行文本里找出关键词的全部命中区间（大小写不敏感）。 */
export function findMatchRanges(text: string, query: string): Array<{ start: number; end: number }> {
  const needle = query.toLowerCase()
  if (needle === '') return []
  const source = text.toLowerCase()
  const ranges: Array<{ start: number; end: number }> = []
  let index = source.indexOf(needle)
  while (index !== -1) {
    ranges.push({ start: index, end: index + needle.length })
    index = source.indexOf(needle, index + needle.length)
  }
  return ranges
}

/** 路径子串过滤（大小写不敏感）。 */
export function pathMatchesFilter(pathText: string, filter: string): boolean {
  const needle = filter.trim().toLowerCase()
  if (needle === '') return true
  return pathText.toLowerCase().includes(needle)
}