/**
 * dsh-better-sidebar-svn client 半：向 better-sidebar 服务注册两个 Tab--
 * 1. 「源代码管理SVN」主面板（+ 菜单可见，order 25 排在 git 后面）；
 * 2. 隐藏的 diff 标签页类型（点击变更行 / 历史行时打开，不在 + 菜单出现，
 *    标题与主面板同名、diff 图标，对齐内置 Git 的 diff 标签页惯例）。
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
import { IconBranchOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { createElement } from 'react'
import { ErrorBoundary } from './ErrorBoundary.tsx'
import { SvnDiffTab, type SvnDiffMeta } from './SvnDiffTab.tsx'
import { SvnView } from './SvnView.tsx'
import svnCss from './svn.css'

/**
 * Diff 图标（文件框 + 加/减行）：与 dsh-better-sidebar 内置 diff 标签页同款，
 * 复制自其 src/client/icons.tsx（MIT），内嵌以避免浏览器 bundle 对子路径的
 * 运行时解析问题。
 */
const IconDiffOutline16 = ({ size = 16 }: { size?: number }) =>
  createElement('svg', {
    width: size, height: size, viewBox: '0 0 16 16', fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
  },
    createElement('rect', { x: 1.5, y: 1.5, width: 13, height: 13, rx: 2.5, stroke: 'currentColor', strokeWidth: 1.5 }),
    createElement('path', { d: 'M4 5h3M5.5 3.5v3', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }),
    createElement('path', { d: 'M9.5 12.5h2.5', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }),
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
      icon: (size: number) => createElement(IconBranchOutline16, { size }),
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
      // 与内置 Git 的 diff 标签页同一惯例：标题沿用主面板名，图标用 diff 图形
      title: '源代码管理SVN',
      icon: (size: number) => createElement(IconDiffOutline16, { size }),
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
