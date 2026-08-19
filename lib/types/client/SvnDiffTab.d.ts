import type { SessionScope } from './api.ts';
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
export { parseUnifiedDiff } from './diff.ts';
export type { DiffLine, DiffHunk, DiffFile } from './diff.ts';
//# sourceMappingURL=SvnDiffTab.d.ts.map