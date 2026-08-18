import type { SessionScope } from './api.ts';
/** 一条渲染的 diff 行。 */
interface DiffLine {
    kind: 'ctx' | 'del' | 'add' | 'meta';
    text: string;
    oldNum: number | null;
    newNum: number | null;
}
/** 一个 hunk。 */
interface DiffHunk {
    oldStart: number;
    newStart: number;
    header: string;
    lines: DiffLine[];
}
/** 一个文件区块。 */
interface DiffFile {
    oldPath: string;
    newPath: string;
    binary: boolean;
    hunks: DiffHunk[];
}
/** 解析 `svn diff` 的统一 diff 文本（容忍 `Index:`/`====` 前导行与 `(revision N)` 路径后缀）。 */
export declare function parseUnifiedDiff(text: string): DiffFile[];
/** diff tab 的 meta 载荷（JSON 可序列化，随布局持久化）。 */
export interface SvnDiffMeta {
    kind: 'worktree' | 'commit';
    /** worktree：变更文件路径。 */
    path?: string;
    /** commit：版本号与主题（标题展示用）。 */
    revision?: string;
    subject?: string;
}
export declare function SvnDiffTab(props: {
    scope: SessionScope;
    meta: SvnDiffMeta;
}): import("react").JSX.Element;
export {};
//# sourceMappingURL=SvnDiffTab.d.ts.map