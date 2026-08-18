/**
 * SVN 操作模块：通过系统 `svn` 二进制完成所有版本控制操作。
 * 所有命令带 `--non-interactive --no-auth-cache` 保证非交互式运行，
 * 输出格式固定为 `--xml` 以保证机器解析的稳定性。
 *
 * 与 git.ts 设计对称：每个操作独立 spawn 一个进程，无状态、无库依赖。
 */
import { spawn } from 'node:child_process';
import { SvnCommandError } from "./types.js";
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
/** 从 XML 中提取所有 `<entry>` 块（含开始标签，以读取 path/item 等属性）。 */
function extractEntries(xml) {
    const entries = [];
    const re = /<entry\b[^>]*>[\s\S]*?<\/entry>/gi;
    let match;
    while ((match = re.exec(xml)) !== null) {
        entries.push(match[0]);
    }
    return entries;
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
/** 工作副本状态（`svn status --xml`）。 */
export async function status(cwd) {
    const repo = await isSvnRepo(cwd);
    if (!repo)
        return { isRepo: false, entries: [] };
    const [repoInfo, raw] = await Promise.all([
        info(cwd).catch(() => ({})),
        runSvn(cwd, ['status', '--xml']),
    ]);
    const entries = extractEntries(raw).map((entryXml) => {
        // status 输出中 path 在 <entry path="..."> 属性上
        const pathAttr = extractAttr(entryXml, 'entry', 'path') ?? '';
        const statusMatch = /item="([^"]*)"/.exec(entryXml);
        const propsMatch = /props="([^"]*)"/.exec(entryXml);
        return {
            path: pathAttr,
            status: statusMatch?.[1] ?? 'normal',
            propStatus: propsMatch?.[1] ?? undefined,
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
/** 提交变更。 */
export async function commit(cwd, message) {
    await runSvn(cwd, ['commit', '-m', message]);
}
/** 更新工作副本。 */
export async function update(cwd) {
    return runSvn(cwd, ['update', '--accept', 'postpone']);
}
/** 提交历史（`svn log --xml`，支持分页）。SVN 的 `-l N` 始终返回最新 N 条，切片即可分页。 */
export async function log(cwd, limit = 30, offset = 0) {
    const xml = await runSvn(cwd, ['log', '--xml', '-l', String(limit + offset)]);
    return parseLog(xml).slice(offset);
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