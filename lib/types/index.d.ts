import type { Context } from 'dsh-better-sidebar';
/** 插件身份。 */
export declare const name = "dsh-better-sidebar-svn";
/** 服务依赖：webServer（路由注册）、sessions（会话 cwd 解析）、webRuntime（可信 Host 列表）。 */
export declare const inject: string[];
/**
 * 插件入口：向 webServer 注册 `/sidebar/api/svn.*` 精确路由。
 * 精确路由优先于 dsh-better-sidebar 的 `/sidebar/api` 前缀路由，
 * 因此两个插件可以共存而不会产生 duplicate prefix route 冲突。
 */
export declare function apply(ctx: Context): void;
export type { SvnStatusEntry, SvnStatusResult, SvnLogEntry, SvnLogPath } from './types.ts';
//# sourceMappingURL=index.d.ts.map