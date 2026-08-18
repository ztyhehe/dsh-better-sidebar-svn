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
/** 工作副本状态（`svn status --xml`）。
 *  `svn info` 与 `svn status` 并行执行（info 失败即视为非工作副本），
 *  相比「先 isSvnRepo 再 info+status」少一个串行进程往返。 */
export declare function status(cwd: string): Promise<SvnStatusResult>;
/** 获取 diff 文本：工作副本变更（`svn diff -- path`）或某版本的完整补丁（`svn diff -c REV`）。 */
export declare function diff(cwd: string, path?: string, revision?: string): Promise<string>;
/** 添加文件到版本控制。 */
export declare function add(cwd: string, paths: string[]): Promise<void>;
/** 还原文件修改。 */
export declare function revert(cwd: string, paths: string[]): Promise<void>;
/** 暂存到待提交列表（对应 Git 的 stage）：
 *  `adds` 中的未版本控制文件先 `svn add`（changelist 只接受已版本控制路径，
 *  与 Git 中 untracked 需先 add 语义一致），随后把全部路径加入 STAGE_CHANGELIST。 */
export declare function stage(cwd: string, adds: string[], paths: string[]): Promise<void>;
/** 取消暂存（对应 Git 的 unstage）：paths 为空数组时移出待提交列表的全部成员。 */
export declare function unstage(cwd: string, paths: string[]): Promise<void>;
/** 提交待提交列表中的变更（对应 Git 的 `git commit -m`，只提交已暂存内容；
 *  提交后 SVN 自动把已提交文件移出 changelist，无需清理）。 */
export declare function commit(cwd: string, message: string): Promise<void>;
/** 更新工作副本。 */
export declare function update(cwd: string): Promise<string>;
/** 提交历史（`svn log --xml`，支持分页）。SVN 的 `-l N` 始终返回最新 N 条，切片即可分页。
 *  `svn log` 是唯一必须访问仓库服务器的命令（网络往返可能数百毫秒），
 *  因此带缓存：TTL 内命中即返回（切换会话/面板重挂载零网络），过期后下一次
 *  访问重新走网络取最新；`force: true` 绕过缓存强制重取（刷新按钮用）；
 *  commit / update / revertRevision 后自动失效，另有同 cwd 并发去重与分页前缀复用。 */
export declare function log(cwd: string, limit?: number, offset?: number, force?: boolean): Promise<SvnLogEntry[]>;
/** 失效某工作副本的历史缓存（commit / update / 撤销提交后调用）。 */
export declare function invalidateLogCache(cwd: string): void;
/** 获取某个版本的文件内容（`svn cat -r REV PATH`）。 */
export declare function cat(cwd: string, rev: string, path: string): Promise<string | null>;
/** 解决冲突（接受当前版本）。 */
export declare function resolve(cwd: string, path: string, accept?: 'base' | 'working' | 'mine-conflict' | 'theirs-conflict' | 'mine-full' | 'theirs-full'): Promise<void>;
/** 撤销某次提交（`svn merge -c -REV`，等价 `git revert`），改动落回工作副本待提交。 */
export declare function revertRevision(cwd: string, revision: string): Promise<void>;
//# sourceMappingURL=svn.d.ts.map