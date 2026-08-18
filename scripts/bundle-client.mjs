/**
 * 打包 client 半为 dsh 浏览器模块格式：
 * window.__ModuleLoader__.load({ id, factory: (require) => { ... return module.exports } })
 * react / @deepseek-ai 等裸导入保持 external，由 web 外壳的 require 提供。
 */
import { build } from 'esbuild'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const PKG = 'dsh-better-sidebar-svn'
const outfile = resolve('lib/client/index.js')

const result = await build({
  entryPoints: ['src/client/index.tsx'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  sourcemap: true,
  sourcesContent: true,
  write: false,
  outfile,
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    'react-dom/client',
    '@deepseek-ai/*',
    'dsh-better-sidebar',
    'dsh-better-sidebar-svn/client',
  ],
  loader: { '.css': 'text' },
  banner: {
    js: [
      'window.__ModuleLoader__.load({',
      `\tid: ${JSON.stringify(PKG)},`,
      '\tfactory: (require) => {',
      '\t\tvar module = { exports: {} };',
      '\t\tvar exports = module.exports;',
      '\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });',
    ].join('\n'),
  },
  footer: {
    js: ['\t\treturn module.exports;', '\t}', '});'].join('\n'),
  },
  logLevel: 'info',
})

await mkdir(dirname(outfile), { recursive: true })
for (const file of result.outputFiles) {
  const text = file.text.replace('//# sourceMappingURL=index.js.map', '//# sourceMappingURL=client.js.map')
  await writeFile(file.path, text)
  console.log(`wrote ${file.path} (${text.length} bytes)`)
}
