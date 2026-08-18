/**
 * SVN 操作模块：通过系统 `svn` 二进制完成所有版本控制操作。
 * 所有命令带 `--non-interactive --no-auth-cache` 保证非交互式运行，
 * 输出格式固定为 `--xml` 以保证机器解析的稳定性。
 *
 * 与 git.ts 设计对称：每个操作独立 spawn 一个进程，无状态、无库依赖。
 */
import { spawn } from 'node:child_process';
import { SvnCommandError, STAGE_CHANGELIST } from "./types.js";
// ── XML 解析辅助函数 ──────────────────────────────────────────────────────
/** 用正则从 XML 中提取 `<entry>` 块的内容（轻量级，不依赖完整 XML 解析器）。 */
function extractTag(content, tag) {
    const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
    const match = re.exec(content);
    return match?.[1] ?? undefined;
}
/** 提取指定元素的开始标签上的属性值，如 `<commit revision="...">`。 */
function extractAttr(content, element, attr) {
    const re = new RegExp(`<${element}\\b[^>]*\\b${attr}="([^"]*)"`, 'i');
    return re.exec(content)?.[1] ?? undefined;
}
/** 从 XML 中提取所有 `<entry>` 块（含开始标签与整体位置，用于归属 changelist 容器）。 */
function extractEntries(xml) {
    const entries = [];
    const re = /<entry\b[^>]*>[\s\S]*?<\/entry>/gi;
    let match;
    while ((match = re.exec(xml)) !== null) {
        entries.push({ xml: match[0], start: match.index, end: match.index + match[0].length });
    }
    return entries;
}
/** 提取所有 `<changelist name="...">` 容器的名字与区间（成员 entry 落在其内即归属该列表）。 */
function extractChangelistSpans(xml) {
    const spans = [];
    const re = /<changelist\b[^>]*\bname="([^"]*)"[^>]*>[\s\S]*?<\/changelist>/gi;
    let match;
    while ((match = re.exec(xml)) !== null) {
        spans.push({ name: match[1], start: match.index, end: match.index + match[0].length });
    }
    return spans;
}
/** 从 XML 中提取所有 `<logentry>` 块（含开始标签，以读取 revision 属性）。 */
function extractLogEntries(xml) {
    const entries = [];
    const re = /<logentry\b[^>]*>[\s\S]*?<\/logentry>/gi;
    let match;
    while ((match = re.exec(xml)) !== null) {
        entries.push(match[0]);
    }
    return entries;
}
/** 从 `<path>` 元素中提取变更信息。 */
function extractPaths(entryXml) {
    const paths = [];
    const re = /<path\b[^>]*\baction="([^"]*)"[^>]*>([^<]*)<\/path>/gi;
    let match;
    while ((match = re.exec(entryXml)) !== null) {
        paths.push({ action: match[1], path: match[2] });
    }
    return paths;
}
/** 在 `<info>` 中提取 `<entry>` 块（含开始标签，以读取 revision 属性）。 */
function extractInfoEntry(xml) {
    const re = /<entry\b[^>]*>[\s\S]*?<\/entry>/i;
    return re.exec(xml)?.[0];
}
// ── 命令执行 ──────────────────────────────────────────────────────────────
/** 运行一个 svn 命令，返回 stdout。 */
function runSvn(cwd, args, timeoutMs = 30_000) {
    const full = ['--non-interactive', '--no-auth-cache', ...args];
    return new Promise((resolvePromise, reject) => {
        const child = spawn('svn', full, {
            cwd,
            stdio: ['ignore', 'pipe', 'pipe'],
            env: { ...process.env },
        });
        let stdout = '';
        let stderr = '';
        const timer = setTimeout(() => {
            child.kill('SIGKILL');
            reject(new SvnCommandError(`svn ${args[0] ?? ''} timed out after ${timeoutMs}ms`, 'svn-error', args.join(' ')));
        }, timeoutMs);
        child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8'); });
        child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8'); });
        child.on('error', (error) => {
            clearTimeout(timer);
            reject(new SvnCommandError(`cannot run svn: ${error.message}`, 'svn-error', args.join(' ')));
        });
        child.on('close', (code) => {
            clearTimeout(timer);
            if (code === 0) {
                resolvePromise(stdout);
            }
            else {
                reject(new SvnCommandError(stderr.trim() || `svn exited with ${String(code)}`, 'svn-error', args.join(' ')));
            }
        });
    });
}
// ── 核心操作 ──────────────────────────────────────────────────────────────
/** 判断目录是否在 SVN 工作副本中。 */
export async function isSvnRepo(cwd) {
    try {
        await runSvn(cwd, ['info', '--xml']);
        return true;
    }
    catch {
        return false;
    }
}
/** 获取 SVN 工作副本信息（`svn info --xml`）。 */
export async function info(cwd) {
    const xml = await runSvn(cwd, ['info', '--xml']);
    const entry = extractInfoEntry(xml);
    if (entry === undefined)
        return {};
    return {
        rootUrl: extractTag(entry, 'root'),
        relativeUrl: extractTag(entry, 'relative-url'),
        // 展示“最后修改的版本”（<commit revision>），与 svn log 一致
        revision: extractAttr(entry, 'commit', 'revision') ?? extractAttr(entry, 'entry', 'revision'),
        lastAuthor: extractTag(entry, 'author'),
        lastDate: extractTag(entry, 'date'),
    };
}
/** 工作副本状态（`svn status --xml`）。
 *  `svn info` 与 `svn status` 并行执行（info 失败即视为非工作副本），
 *  相比「先 isSvnRepo 再 info+status」少一个串行进程往返。 */
export async function status(cwd) {
    const [repoInfo, rawPromise] = await Promise.all([
        info(cwd).catch(() => null),
        // status 的失败要等 info 判定后再决定如何上报，先包一层避免 unhandled rejection
        runSvn(cwd, ['status', '--xml']).catch((error) => error),
    ]);
    if (repoInfo === null)
        return { isRepo: false, entries: [] };
    if (rawPromise instanceof Error)
        throw rawPromise;
    const raw = rawPromise;
    const changelistSpans = extractChangelistSpans(raw);
    const entries = extractEntries(raw).map(({ xml: entryXml, start, end }) => {
        // status 输出中 path 在 <entry path="..."> 属性上
        const pathAttr = extractAttr(entryXml, 'entry', 'path') ?? '';
        const statusMatch = /item="([^"]*)"/.exec(entryXml);
        const propsMatch = /props="([^"]*)"/.exec(entryXml);
        const changelist = changelistSpans.find(span => start > span.start && end < span.end)?.name;
        return {
            path: pathAttr,
            status: statusMatch?.[1] ?? 'normal',
            propStatus: propsMatch?.[1] ?? undefined,
            changelist,
            isDir: /kind="dir"/.test(entryXml),
            repoPath: pathAttr,
        };
    });
    return { isRepo: true, ...repoInfo, entries };
}
/** 获取 diff 文本：工作副本变更（`svn diff -- path`）或某版本的完整补丁（`svn diff -c REV`）。 */
export async function diff(cwd, path, revision) {
    const args = ['diff'];
    if (revision !== undefined) {
        args.push('-c', revision);
        if (path !== undefined)
            args.push(path);
    }
    else if (path !== undefined) {
        args.push(path);
    }
    return runSvn(cwd, args);
}
/** 添加文件到版本控制。 */
export async function add(cwd, paths) {
    await runSvn(cwd, ['add', '--depth', 'infinity', ...paths]);
}
/** 还原文件修改。 */
export async function revert(cwd, paths) {
    await runSvn(cwd, ['revert', ...paths]);
}
/** 暂存到待提交列表（对应 Git 的 stage）：
 *  `adds` 中的未版本控制文件先 `svn add`（changelist 只接受已版本控制路径，
 *  与 Git 中 untracked 需先 add 语义一致），随后把全部路径加入 STAGE_CHANGELIST。 */
export async function stage(cwd, adds, paths) {
    if (adds.length > 0)
        await runSvn(cwd, ['add', '--depth', 'infinity', ...adds]);
    if (paths.length > 0)
        await runSvn(cwd, ['changelist', STAGE_CHANGELIST, ...paths]);
}
/** 取消暂存（对应 Git 的 unstage）：paths 为空数组时移出待提交列表的全部成员。 */
export async function unstage(cwd, paths) {
    if (paths.length > 0) {
        await runSvn(cwd, ['changelist', '--remove', ...paths]);
    }
    else {
        await runSvn(cwd, ['changelist', '--remove', '--changelist', STAGE_CHANGELIST, '--depth', 'infinity', '.']);
    }
}
/** 提交待提交列表中的变更（对应 Git 的 `git commit -m`，只提交已暂存内容；
 *  提交后 SVN 自动把已提交文件移出 changelist，无需清理）。 */
export async function commit(cwd, message) {
    await runSvn(cwd, ['commit', '--changelist', STAGE_CHANGELIST, '-m', message]);
}
/** 更新工作副本。 */
export async function update(cwd) {
    return runSvn(cwd, ['update', '--accept', 'postpone']);
}
/** 提交历史（`svn log --xml`，支持分页）。SVN 的 `-l N` 始终返回最新 N 条，切片即可分页。
 *  `svn log` 是唯一必须访问仓库服务器的命令（网络往返可能数百毫秒），
 *  因此带缓存：TTL 内命中即返回（切换会话/面板重挂载零网络），过期后下一次
 *  访问重新走网络取最新；`force: true` 绕过缓存强制重取（刷新按钮用）；
 *  commit / update / revertRevision 后自动失效，另有同 cwd 并发去重与分页前缀复用。 */
export async function log(cwd, limit = 30, offset = 0, force = false) {
    const need = limit + offset;
    const cached = logCache.get(cwd);
    // TTL 内命中即返回：已缓存足够条数，或此前已翻到底（拉过 need 条而不足 need）
    if (!force && cached !== undefined && Date.now() - cached.at < LOG_CACHE_TTL_MS
        && (cached.entries.length >= need || cached.fetchedCount >= need)) {
        return cached.entries.slice(offset, offset + limit);
    }
    // 同 cwd 的并发请求合并为一次网络往返（正在拉取的请求必然是新鲜的）
    const inflight = logInflight.get(cwd);
    if (inflight !== undefined && inflight.need >= need) {
        const entries = await inflight.promise;
        return entries.slice(offset, offset + limit);
    }
    // -r HEAD:1 显式指定范围：混合版本工作副本（部分提交/未 update）下，
    // 不带 -r 的默认范围（BASE:1）可能算出空集，历史无声变空
    const promise = runSvn(cwd, ['log', '--xml', '-r', 'HEAD:1', '-l', String(need)])
        .then(xml => parseLog(xml))
        .finally(() => { logInflight.delete(cwd); });
    logInflight.set(cwd, { need, promise });
    const entries = await promise;
    logCache.set(cwd, { at: Date.now(), fetchedCount: need, entries });
    return entries.slice(offset, offset + limit);
}
const logCache = new Map();
const logInflight = new Map();
/** 历史缓存 TTL（1 小时）：窗口内命中缓存零网络（切换会话即命中）；
 *  过期后下一次访问重新走网络取最新，保证历史不至于无限期陈旧。
 *  此外刷新按钮 force、commit / update / revertRevision 失效都能即时取新。 */
const LOG_CACHE_TTL_MS = 60 * 60 * 1000;
/** 失效某工作副本的历史缓存（commit / update / 撤销提交后调用）。 */
export function invalidateLogCache(cwd) {
    logCache.delete(cwd);
}
/** 解析 `svn log --xml` 输出。 */
function parseLog(xml) {
    return extractLogEntries(xml).map((entryXml) => ({
        // <logentry revision="..."> 中版本号是属性而非元素
        revision: extractAttr(entryXml, 'logentry', 'revision') ?? '0',
        author: extractTag(entryXml, 'author') ?? '',
        date: extractTag(entryXml, 'date') ?? '',
        message: (extractTag(entryXml, 'msg') ?? '').trim(),
        paths: extractPaths(entryXml),
    }));
}
/** 获取某个版本的文件内容（`svn cat -r REV PATH`）。 */
export async function cat(cwd, rev, path) {
    try {
        return await runSvn(cwd, ['cat', '-r', rev, path]);
    }
    catch {
        return null;
    }
}
/** 解决冲突（接受当前版本）。 */
export async function resolve(cwd, path, accept = 'working') {
    await runSvn(cwd, ['resolve', '--accept', accept, path]);
}
/** 撤销某次提交（`svn merge -c -REV`，等价 `git revert`），改动落回工作副本待提交。 */
export async function revertRevision(cwd, revision) {
    await runSvn(cwd, ['merge', '-c', `-${revision}`, '.']);
}
//# sourceMappingURL=svn.js.map