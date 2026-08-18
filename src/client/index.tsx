/**
 * dsh-better-sidebar-svn client 半：向 better-sidebar 服务注册两个 Tab--
 * 1. 「源代码管理SVN」主面板（+ 菜单可见，order 25 排在 git 后面）；
 * 2. 隐藏的 diff 标签页类型（点击变更行 / 历史行时打开，不在 + 菜单出现）。
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
import { SvnDiffTab, type SvnDiffMeta } from './SvnDiffTab.tsx'
import { SvnView } from './SvnView.tsx'
import svnCss from './svn.css'

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
      component: (props: TabComponentProps) => createElement(SvnView, {
        scope: props.scope,
        betterSidebar: ctx.betterSidebar,
        onOpenFile: props.onOpenFile ?? (() => { /* no-op */ }),
      }),
    })

    const disposeDiff = ctx.betterSidebar.registerTab({
      id: DIFF_TAB_TYPE,
      title: 'SVN 变更',
      hidden: true,
      dedupeKey: (tab: SidebarTab) => tab.id,
      component: (props: TabComponentProps) => createElement(SvnDiffTab, {
        scope: props.scope,
        meta: (props.tab.meta ?? {}) as SvnDiffMeta,
      }),
    })

    return () => { disposeDiff(); disposeMain() }
  }, 'dsh-better-sidebar-svn: register SVN tabs')
}
