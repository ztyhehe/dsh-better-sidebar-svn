import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  decodeXmlText,
  extractAttr,
  extractChangelistSpans,
  extractEntries,
  extractInfoEntry,
  extractLogEntries,
  extractPaths,
  extractPropertyValue,
  extractTag,
  parseLog,
} from '../src/svn.ts'

test('extractTag pulls first element text content', () => {
  assert.equal(extractTag('<root>a</root>', 'root'), 'a')
  assert.equal(extractTag('<a><b>x</b></a>', 'b'), 'x')
  assert.equal(extractTag('<a></a>', 'b'), undefined)
})

test('extractAttr reads attribute on the matched element', () => {
  assert.equal(extractAttr('<entry path="svn://x">', 'entry', 'path'), 'svn://x')
  assert.equal(extractAttr('<commit revision="42"></commit>', 'commit', 'revision'), '42')
  assert.equal(extractAttr('<commit></commit>', 'commit', 'revision'), undefined)
})

const STATUS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<status>
<target path=".">
<entry path="wc/dir/a.txt">
<wc-status item="modified" props="none" revision="3">
<commit revision="3">
<author>alice</author>
<date>2026-08-19T01:00:00.000000Z</date>
</commit>
</wc-status>
</entry>
<entry path="wc/dir/new.txt">
<wc-status item="unversioned" props="none"> </wc-status>
</entry>
</target>
<changelist name="dsh-commit">
<entry path="wc/dir/a.txt">
<wc-status item="modified" props="none" revision="3"></wc-status>
</entry>
</changelist>
</status>
`

test('extractEntries returns blocks with correct positions', () => {
  const entries = extractEntries(STATUS_XML)
  assert.equal(entries.length, 3)
  assert.ok(entries[0].end > entries[0].start)
})

test('extractChangelistSpans returns changelist name and span', () => {
  const spans = extractChangelistSpans(STATUS_XML)
  assert.equal(spans.length, 1)
  assert.equal(spans[0].name, 'dsh-commit')
  assert.ok(spans[0].end > spans[0].start)
})

const LOG_XML = `<?xml version="1.0" encoding="UTF-8"?>
<log>
<logentry revision="9">
<author>bob</author>
<date>2026-08-18T10:00:00.000000Z</date>
<paths>
<path action="M" prop-mods="false" text-mods="true">/trunk/readme.md</path>
<path action="A">/trunk/new.txt</path>
</paths>
<msg>固定一个 bug</msg>
</logentry>
<logentry revision="8">
<author>alice</author>
<date>2026-08-17T10:00:00.000000Z</date>
<msg>init</msg>
</logentry>
</log>
`

test('extractLogEntries / extractPaths / parseLog work together', () => {
  const entries = extractLogEntries(LOG_XML)
  assert.equal(entries.length, 2)
  const paths = extractPaths(entries[0]!)
  assert.deepEqual(paths, [
    { action: 'M', path: '/trunk/readme.md' },
    { action: 'A', path: '/trunk/new.txt' },
  ])
  const parsed = parseLog(LOG_XML)
  assert.equal(parsed[0]!.revision, '9')
  assert.equal(parsed[0]!.author, 'bob')
  assert.equal(parsed[0]!.message, '固定一个 bug')
  assert.equal(parsed[1]!.revision, '8')
  assert.deepEqual(parsed[1]!.paths, [])
})

test('extractInfoEntry isolates the first entry block', () => {
  const xml = `<info><entry kind="dir" revision="7"><url>u</url></entry><entry kind="file"></entry></info>`
  const entry = extractInfoEntry(xml)
  assert.ok(entry !== undefined)
  assert.equal(extractTag(entry, 'url'), 'u')
})

const PROPGET_XML = `<?xml version="1.0" encoding="UTF-8"?>
<properties>
<target
   path="/repo/wc">
<property
   name="svn:ignore">target
*.log
build &amp; dest
</property>
</target>
</properties>
`

test('extractPropertyValue extracts svn:ignore text and decodeXmlText restores entities', () => {
  const raw = extractPropertyValue(PROPGET_XML, 'svn:ignore')
  assert.equal(raw?.includes('target\n*.log'), true)
  const decoded = decodeXmlText(raw ?? '')
  assert.equal(decoded, 'target\n*.log\nbuild & dest\n')
  assert.equal(extractPropertyValue('<properties></properties>', 'svn:ignore'), undefined)
})

test('decodeXmlText handles all common entities', () => {
  assert.equal(decodeXmlText('&lt;a&gt; &amp; &quot;q&quot; &apos;'), '<a> & "q" \'')
})
