export class SidebarError extends Error {
    code;
    status;
    constructor(code, message, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
    }
}
/** 从请求体中读取 JSON。 */
export function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => { chunks.push(chunk); });
        req.on('end', () => {
            try {
                const body = Buffer.concat(chunks).toString('utf8');
                resolve(body === '' ? {} : JSON.parse(body));
            }
            catch (error) {
                reject(new SidebarError('bad-request', 'invalid JSON body'));
            }
        });
        req.on('error', (error) => {
            reject(new SidebarError('bad-request', error.message));
        });
    });
}
/** 从 payload 中提取字符串字段。 */
export function requireString(payload, field) {
    if (payload === null || typeof payload !== 'object') {
        throw new SidebarError('bad-request', `"${field}" is required`);
    }
    const record = payload;
    const value = record[field];
    if (typeof value !== 'string' || value === '') {
        throw new SidebarError('bad-request', `"${field}" must be a non-empty string`);
    }
    return value;
}
/** 写入成功响应。 */
export function writeOk(res, value) {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, value }));
}
/** 写入错误响应。 */
export function writeError(res, error) {
    if (error instanceof SidebarError) {
        res.writeHead(error.status, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: { code: error.code, message: error.message } }));
    }
    else {
        const message = error instanceof Error ? error.message : String(error);
        res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: { code: 'internal', message } }));
    }
}
/** 写入 JSON 响应（自定义状态码）。 */
export function writeJson(res, status, body) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(body));
}
/** 读取请求头（小写键）。 */
function header(headers, name) {
    const value = headers[name];
    return typeof value === 'string' ? value : undefined;
}
/** 解析 Host 头授权信息，无法解析时返回 undefined。 */
function parseAuthority(authority) {
    try {
        return new URL(`http://${authority}`);
    }
    catch {
        return undefined;
    }
}
/** 是否为本地回环地址。 */
function isLoopbackHostname(hostname) {
    if (hostname === 'localhost' || hostname === '[::1]')
        return true;
    const parts = hostname.split('.');
    return parts.length === 4 && parts[0] === '127' && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}
/** 权威地址规范化：带端口则保留端口。 */
function canonicalAuthority(entry, entryUrl) {
    const port = entryUrl.port !== '' ? entryUrl.port : new URL(`https://${entry}`).port;
    return port === '' ? entryUrl.hostname : `${entryUrl.hostname}:${port}`;
}
/** 请求 Host 是否命中可信地址列表（精确或忽略端口）。 */
function isTrustedAuthority(hostUrl, trustedHosts) {
    return trustedHosts.some((entry) => {
        const entryUrl = parseAuthority(entry);
        if (entryUrl === undefined)
            return false;
        return canonicalAuthority(entry, entryUrl) === entryUrl.hostname
            ? entryUrl.hostname === hostUrl.hostname
            : entryUrl.host === hostUrl.host;
    });
}
/**
 * 构建浏览器信任围栏（与 dsh-better-sidebar 的 trust-fence 保持一致）：
 * Host 必须是本机回环或可信地址，且浏览器标记为同源。
 */
export function createTrustFence(trustedHosts) {
    return (req) => {
        const host = header(req.headers, 'host');
        if (host === undefined)
            return false;
        const hostUrl = parseAuthority(host);
        if (hostUrl === undefined)
            return false;
        if (!isLoopbackHostname(hostUrl.hostname) && !isTrustedAuthority(hostUrl, trustedHosts))
            return false;
        if (header(req.headers, 'sec-fetch-site') === 'cross-site')
            return false;
        const origin = header(req.headers, 'origin');
        if (origin === undefined)
            return true;
        try {
            return new URL(origin).host === hostUrl.host;
        }
        catch {
            return false;
        }
    };
}
//# sourceMappingURL=wire.js.map