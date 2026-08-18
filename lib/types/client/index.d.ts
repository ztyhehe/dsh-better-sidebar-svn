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
import type { Context } from 'dsh-better-sidebar';
/** 依赖 better-sidebar 的服务。 */
export declare const inject: string[];
/**
 * 客户端插件入口：注册 SVN 侧边栏 Tab 与 diff Tab。
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map