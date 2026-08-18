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
    /** 提交变更。 */
    commit: (scope: SessionScope, message: string) => Promise<{
        ok: true;
    }>;
    /** 更新工作副本。 */
    update: (scope: SessionScope) => Promise<{
        output: string;
    }>;
    /** 提交历史。 */
    log: (scope: SessionScope, limit?: number, offset?: number) => Promise<SvnLogEntry[]>;
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
};
//# sourceMappingURL=api.d.ts.map