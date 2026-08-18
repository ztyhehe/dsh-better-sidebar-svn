import { type SvnLogEntry, type SvnStatusResult } from './types.ts';
/** 判断目录是否在 SVN 工作副本中。 */
export declare function isSvnRepo(cwd: string): Promise<boolean>;
/** 获取 SVN 工作副本信息（`svn info --xml`）。 */
export declare function info(cwd: string): Promise<{
    rootUrl?: string;
    relativeUrl?: string;
    revision?: string;
    lastAuthor?: string;
    lastDate?: string;
}>;
/** 工作副本状态（`svn status --xml`）。 */
export declare function status(cwd: string): Promise<SvnStatusResult>;
/** 获取 diff 文本：工作副本变更（`svn diff -- path`）或某版本的完整补丁（`svn diff -c REV`）。 */
export declare function diff(cwd: string, path?: string, revision?: string): Promise<string>;
/** 添加文件到版本控制。 */
export declare function add(cwd: string, paths: string[]): Promise<void>;
/** 还原文件修改。 */
export declare function revert(cwd: string, paths: string[]): Promise<void>;
/** 提交变更。 */
export declare function commit(cwd: string, message: string): Promise<void>;
/** 更新工作副本。 */
export declare function update(cwd: string): Promise<string>;
/** 提交历史（`svn log --xml`，支持分页）。SVN 的 `-l N` 始终返回最新 N 条，切片即可分页。 */
export declare function log(cwd: string, limit?: number, offset?: number): Promise<SvnLogEntry[]>;
/** 获取某个版本的文件内容（`svn cat -r REV PATH`）。 */
export declare function cat(cwd: string, rev: string, path: string): Promise<string | null>;
/** 解决冲突（接受当前版本）。 */
export declare function resolve(cwd: string, path: string, accept?: 'base' | 'working' | 'mine-conflict' | 'theirs-conflict' | 'mine-full' | 'theirs-full'): Promise<void>;
/** 撤销某次提交（`svn merge -c -REV`，等价 `git revert`），改动落回工作副本待提交。 */
export declare function revertRevision(cwd: string, revision: string): Promise<void>;
//# sourceMappingURL=svn.d.ts.map