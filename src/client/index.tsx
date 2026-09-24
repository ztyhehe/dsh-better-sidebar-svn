/**
 * dsh-better-sidebar-svn client 半：向 better-sidebar 服务注册两个 Tab--
 * 1. 「源代码管理SVN」主面板（+ 菜单可见，order 25 排在 git 后面）；
 * 2. 隐藏的 diff 标签页类型（点击变更行 / 历史行时打开，不在 + 菜单出现，
 *    标题与图标对齐内置 `diff` 标签页：同叫「文件变动」、同用 changes 字形）。
 *
 * 使用方式（其他插件 / 手动挂载）：
 *   import type {} from 'dsh-better-sidebar-svn/client'
 *   export const inject = ['betterSidebar']
 *   export function apply(ctx: Context) { ... }
 *
 * 安装方式：
 *   cd ~/.dsh && dsh plugin --profile web add dsh-better-sidebar-svn
 */
import type { Context, TabComponentProps } from 'dsh-better-sidebar'
import type { SidebarTab } from 'dsh-better-sidebar/client/service'
import { IconBranchOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { createElement } from 'react'
import { ErrorBoundary } from './ErrorBoundary.tsx'
import { SvnDiffTab, type SvnDiffMeta } from './SvnDiffTab.tsx'
import { SvnView } from './SvnView.tsx'
import svnCss from './svn.css'

/**
 * changes 字形（git commit 节点）：与 dsh-better-sidebar 内置 git / diff 两个
 * 标签页共用的 `changesTabIcon`（其内部 `VscGitCommit`）同款，复制自其
 * src/client/icons.tsx（MIT）。内嵌以避免浏览器 bundle 对子路径的运行时
 * 解析问题；`fill: currentColor` 交给侧边栏主题着色。
 */
const IconGitCommit16 = ({ size = 16 }: { size?: number }) =>
  createElement('svg', {
    width: size, height: size, viewBox: '0 0 16 16', fill: 'currentColor',
    xmlns: 'http://www.w3.org/2000/svg',
  },
    createElement('path', {
      d: 'M11.5 8C11.5 6.24 10.194 4.779 8.5 4.536V1.5C8.5 1.224 8.276 1 8 1C7.724 1 7.5 1.224 7.5 1.5V4.536C5.806 4.779 4.5 6.24 4.5 8C4.5 9.76 5.806 11.221 7.5 11.464V14.5C7.5 14.776 7.724 15 8 15C8.276 15 8.5 14.776 8.5 14.5V11.464C10.194 11.221 11.5 9.76 11.5 8ZM8 10.5C6.621 10.5 5.5 9.378 5.5 8C5.5 6.622 6.621 5.5 8 5.5C9.379 5.5 10.5 6.622 10.5 8C10.5 9.378 9.379 10.5 8 10.5Z',
    }),
  )

const style = typeof document === 'undefined' ? undefined : document.createElement('style')
if (style !== undefined) {
  style.textContent = svnCss
  document.head.appendChild(style)
}

/** 依赖 better-sidebar 的服务。 */
export const inject = ['betterSidebar']

/** diff 标签页类型 id（隐藏，不进 + 菜单）。 */
const DIFF_TAB_TYPE = 'dsh-better-sidebar-svn:diff'

/**
 * 客户端插件入口：注册 SVN 侧边栏 Tab 与 diff Tab。
 */
export function apply(ctx: Context): void {
  ctx.effect(() => {
    const disposeMain = ctx.betterSidebar.registerTab({
      id: 'svn',
      title: '源代码管理SVN',
      icon: (size: number) => createElement(IconBranchOutlineRegular, { size }),
      order: 25, // 排在 git (20) 后面、subagent (30) 前面
      single: true, // 单实例
      component: (props: TabComponentProps) => createElement(ErrorBoundary, { label: 'SvnView', children: createElement(SvnView, {
        scope: props.scope,
        betterSidebar: ctx.betterSidebar,
        onOpenFile: props.onOpenFile ?? (() => { /* no-op */ }),
      }) }),
    })

    const disposeDiff = ctx.betterSidebar.registerTab({
      id: DIFF_TAB_TYPE,
      // 对齐内置 diff 页签：标题同为「文件变动」、图标同用 changes 字形
      // （内置 git 与 diff 两个 descriptor 就是这么成对的），与主面板名区分。
      title: '文件变动',
      icon: (size: number) => createElement(IconGitCommit16, { size }),
      hidden: true,
      dedupeKey: (tab: SidebarTab) => tab.id,
      component: (props: TabComponentProps) => createElement(ErrorBoundary, { label: 'SvnDiffTab', children: createElement(SvnDiffTab, {
        scope: props.scope,
        meta: (props.tab.meta ?? {}) as SvnDiffMeta,
      }) }),
    })

    return () => { disposeDiff(); disposeMain() }
  }, 'dsh-better-sidebar-svn: register SVN tabs')
}
