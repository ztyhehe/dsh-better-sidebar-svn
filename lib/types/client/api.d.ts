/**
 * SVN API 客户端封装：与 dsh-better-sidebar 的 api.ts 保持一致的调用风格。
 * 所有方法通过 POST /sidebar/api/<method> 调用后端路由。
 */
import type { SvnLogEntry, SvnStatusResult } from '../types.js';
/** API 调用错误。 */
export declare class SvnApiError extends Error {
    readonly code: string;
    constructor(code: string, message: string);
}
/** 把后端错误码映射为前端可直接展示的友好文案。 */
export declare function friendlySvnMessage(reason: unknown): string;
/** 会话作用域（与 better-sidebar 的 SessionScope 兼容）。 */
export interface SessionScope {
    sessionId: string;
    cwd?: string;
}
/** SVN API 接口。 */
export declare const svnApi: {
    /** 获取 SVN 工作副本状态。 */
    status: (scope: SessionScope) => Promise<SvnStatusResult>;
    /** 获取 diff：工作副本某文件的变更，或某版本的完整补丁。 */
    diff: (scope: SessionScope, path?: string, rev?: string) => Promise<{
        diff: string;
    }>;
    /** 添加文件到版本控制。 */
    add: (scope: SessionScope, paths: string[]) => Promise<{
        ok: true;
    }>;
    /** 还原文件修改。 */
    revert: (scope: SessionScope, paths: string[]) => Promise<{
        ok: true;
    }>;
    /** 暂存到待提交列表：adds 中的未版本控制文件会先 svn add（对应 Git stage）。 */
    stage: (scope: SessionScope, paths: string[], adds?: string[]) => Promise<{
        ok: true;
    }>;
    /** 取消暂存：不传 paths = 移出待提交列表的全部成员（对应 Git unstage all）。 */
    unstage: (scope: SessionScope, paths?: string[]) => Promise<{
        ok: true;
    }>;
    /** 提交待提交列表中的变更（只提交已暂存内容）。 */
    commit: (scope: SessionScope, message: string) => Promise<{
        ok: true;
    }>;
    /** 更新工作副本。 */
    update: (scope: SessionScope) => Promise<{
        output: string;
    }>;
    /** 提交历史。force = 绕过服务端缓存强制重取（刷新按钮）。 */
    log: (scope: SessionScope, limit?: number, offset?: number, force?: boolean) => Promise<SvnLogEntry[]>;
    /** 获取某版本文件内容。 */
    cat: (scope: SessionScope, rev: string, path: string) => Promise<{
        content: string | null;
    }>;
    /** 获取仓库信息。 */
    info: (scope: SessionScope) => Promise<Record<string, string | undefined>>;
    /** 解决冲突。 */
    resolve: (scope: SessionScope, path: string, accept?: string) => Promise<{
        ok: true;
    }>;
    /** 撤销某次提交（改动落回工作副本）。 */
    revertRevision: (scope: SessionScope, revision: string) => Promise<{
        ok: true;
    }>;
    /** 读取当前目录的 svn:ignore 规则（按行拆分）。 */
    ignoreGet: (scope: SessionScope) => Promise<{
        rules: string[];
    }>;
    /** 写入当前目录的 svn:ignore：空数组 = 删除 svn:ignore 属性。 */
    ignoreSet: (scope: SessionScope, rules: string[]) => Promise<{
        ok: true;
        rules: string[];
    }>;
};
//# sourceMappingURL=api.d.ts.map