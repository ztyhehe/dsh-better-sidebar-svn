import { type SvnLogEntry, type SvnLogPath, type SvnStatusResult } from './types.ts';
/** `svn` 二进制缺失 / 无法运行时的统一错误码与可读文案。 */
export declare const SVN_MISSING_MESSAGE = "\u7CFB\u7EDF\u672A\u5B89\u88C5 svn \u547D\u4EE4\u884C\uFF0C\u8BF7\u5B89\u88C5\u540E\u91CD\u8BD5";
/** 用正则从 XML 中提取 `<entry>` 块的内容（轻量级，不依赖完整 XML 解析器）。 */
export declare function extractTag(content: string, tag: string): string | undefined;
/** 提取指定元素的开始标签上的属性值，如 `<commit revision="...">`。 */
export declare function extractAttr(content: string, element: string, attr: string): string | undefined;
/** 从 XML 中提取所有 `<entry>` 块（含开始标签与整体位置，用于归属 changelist 容器）。 */
export declare function extractEntries(xml: string): {
    xml: string;
    start: number;
    end: number;
}[];
/** 提取所有 `<changelist name="...">` 容器的名字与区间（成员 entry 落在其内即归属该列表）。 */
export declare function extractChangelistSpans(xml: string): {
    name: string;
    start: number;
    end: number;
}[];
/** 从 XML 中提取所有 `<logentry>` 块（含开始标签，以读取 revision 属性）。 */
export declare function extractLogEntries(xml: string): string[];
/** 从 `<path>` 元素中提取变更信息。 */
export declare function extractPaths(entryXml: string): SvnLogPath[];
/** 在 `<info>` 中提取 `<entry>` 块（含开始标签，以读取 revision 属性）。 */
export declare function extractInfoEntry(xml: string): string | undefined;
/** 解码 `svn --xml` 输出中最常见的实体。 */
export declare function decodeXmlText(text: string): string;
/** 从 `svn prop* --xml` 输出中提取指定 property 的文本值。 */
export declare function extractPropertyValue(xml: string, propertyName: string): string | undefined;
export declare function ensureSvnAvailable(): Promise<true>;
/** 写操作目标锁定：把 cwd 解析为 realpath，避免相对路径/软链把 svn:ignore 写到工作副本外。 */
export declare function lockCwd(cwd: string): Promise<string>;
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
/** 解析 `svn log --xml` 输出。 */
export declare function parseLog(xml: string): SvnLogEntry[];
/** 获取某个版本的文件内容（`svn cat -r REV PATH`）。 */
export declare function cat(cwd: string, rev: string, path: string): Promise<string | null>;
/** 解决冲突（接受当前版本）。 */
export declare function resolve(cwd: string, path: string, accept?: 'base' | 'working' | 'mine-conflict' | 'theirs-conflict' | 'mine-full' | 'theirs-full'): Promise<void>;
/** 撤销某次提交（`svn merge -c -REV`，等价 `git revert`），改动落回工作副本待提交。 */
export declare function revertRevision(cwd: string, revision: string): Promise<void>;
/** 读取当前工作副本目录的 `svn:ignore`（不递归、不包含继承属性）。 */
export declare function ignoreGet(cwd: string): Promise<string[]>;
/** 写入当前工作副本目录的 `svn:ignore`：
 *  - 非空规则经临时文件 `propset svn:ignore -F <tmp> .`（避免转义 / 命令行长度问题）；
 *  - 清空规则走 `propdel`（`propset` 空串不等价于删除属性，属性必须真正删除）。
 *  目标 cwd 先 realpath 锁定，避免相对路径 / 软链写到工作副本外。
 */
export declare function ignoreSet(cwd: string, rules: readonly string[]): Promise<string[]>;
//# sourceMappingURL=svn.d.ts.map