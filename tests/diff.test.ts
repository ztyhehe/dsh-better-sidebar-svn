import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findMatchRanges, parseHunkHeader, parseUnifiedDiff, pathMatchesFilter } from '../src/client/diff.ts'

const SAMPLE = `Index: src/foo.ts
===================================================================
--- src/foo.ts\t(revision 10)
+++ src/foo.ts\t(working copy)
@@ -1,3 +1,4 @@
-const a = 1
+const a = 2
 const b = 3
+// new line
--- src/bar.md\t(revision 10)
+++ src/bar.md\t(working copy)
@@ -5,2 +5,2 @@
-old
+new
`

test('parseUnifiedDiff splits files, hunks and line kinds', () => {
  const files = parseUnifiedDiff(SAMPLE)
  assert.equal(files.length, 2)
  assert.equal(files[0].oldPath, 'src/foo.ts')
  assert.equal(files[0].newPath, 'src/foo.ts')
  assert.equal(files[0].binary, false)

  const hunk = files[0].hunks[0]
  assert.equal(hunk.oldStart, 1)
  assert.equal(hunk.newStart, 1)
  assert.equal(hunk.header, '')
  assert.equal(hunk.lines[0].kind, 'meta')
  assert.deepEqual(
    hunk.lines.slice(1).map(line => line.kind),
    ['del', 'add', 'ctx', 'add'],
  )
  // 三行内容后 add 再计一次：旧号 1 → 2（del），新号 1 → 2 → 3（add/ctx）→ 4（add）
  assert.equal(hunk.lines[1].oldNum, 1)
  assert.equal(hunk.lines[2].newNum, 1)
  assert.equal(hunk.lines[3].oldNum, 2)
  assert.equal(hunk.lines[3].newNum, 2)
  assert.equal(hunk.lines[4].newNum, 3)
})

test('parseUnifiedDiff marks binary files via the standalone marker line', () => {
  const files = parseUnifiedDiff(`--- img.png\t(revision 1)\n+++ img.png\t(working copy)\nCannot display: file marked as a binary type.\n`)
  assert.equal(files.length, 1)
  assert.equal(files[0].binary, false, 'svn 的 non-diff 二进制提示不是 "Binary file" 行')
  const binary = parseUnifiedDiff(`--- img.png\t(revision 1)\n+++ img.png\t(working copy)\nBinary files img.png and img.png differ\n`)
  assert.equal(binary.length, 1)
  assert.equal(binary[0].binary, true)
})

test('parseHunkHeader parses ranges and section text', () => {
  assert.deepEqual(parseHunkHeader('@@ -10,4 +10,6 @@ function foo'), {
    oldStart: 10,
    newStart: 10,
    header: ' function foo',
  })
  assert.deepEqual(parseHunkHeader('@@ -1 +1 @@'), { oldStart: 1, newStart: 1, header: '' })
  assert.equal(parseHunkHeader('not a hunk'), null)
})

test('findMatchRanges is case-insensitive and returns all hits', () => {
  assert.deepEqual(findMatchRanges('Foo foo FOO', 'foo'), [
    { start: 0, end: 3 },
    { start: 4, end: 7 },
    { start: 8, end: 11 },
  ])
  assert.deepEqual(findMatchRanges('abc', 'x'), [])
  assert.deepEqual(findMatchRanges('abc', ''), [])
})

test('pathMatchesFilter is case-insensitive and empty filter matches all', () => {
  assert.equal(pathMatchesFilter('src/client/SvnDiffTab.tsx', 'svndiff'), true)
  assert.equal(pathMatchesFilter('src/client/SvnDiffTab.tsx', 'svnview'), false)
  assert.equal(pathMatchesFilter('src/client/SvnDiffTab.tsx', ''), true)
  assert.equal(pathMatchesFilter('src/client/SvnDiffTab.tsx', '  '), true)
})

test('overlapping matches are isolated by findMatchRanges algorithm', () => {
  // "aaa" with "aa": two ranges, no infinite loop
  assert.deepEqual(findMatchRanges('aaa', 'aa'), [
    { start: 0, end: 2 },
  ])
})
