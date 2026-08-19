/**
 * 统一 diff 解析（纯函数，无 React 依赖）：与 dsh-better-sidebar DiffTab 同构，
 * 单独成文件以便 SvnDiffTab 与 Node 单测共用。
 */
/** 一条渲染的 diff 行。 */
export interface DiffLine {
    kind: 'ctx' | 'del' | 'add' | 'meta';
    text: string;
    oldNum: number | null;
    newNum: number | null;
}
/** 一个 hunk。 */
export interface DiffHunk {
    oldStart: number;
    newStart: number;
    header: string;
    lines: DiffLine[];
}
/** 一个文件区块。 */
export interface DiffFile {
    oldPath: string;
    newPath: string;
    binary: boolean;
    hunks: DiffHunk[];
}
/** 解析 hunk 头 `@@ -a[,b] +c[,d] @@ section`。 */
export declare function parseHunkHeader(line: string): {
    oldStart: number;
    newStart: number;
    header: string;
} | null;
/** 解析 `svn diff` 的统一 diff 文本（容忍 `Index:`/`====` 前导行与 `(revision N)` 路径后缀）。 */
export declare function parseUnifiedDiff(text: string): DiffFile[];
/** 在一行文本里找出关键词的全部命中区间（大小写不敏感）。 */
export declare function findMatchRanges(text: string, query: string): Array<{
    start: number;
    end: number;
}>;
/** 路径子串过滤（大小写不敏感）。 */
export declare function pathMatchesFilter(pathText: string, filter: string): boolean;
//# sourceMappingURL=diff.d.ts.map