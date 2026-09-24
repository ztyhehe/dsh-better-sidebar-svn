/**
 * HTTP 路由辅助函数：与 dsh-better-sidebar 的 wire.ts 保持一致的 JSON 响应格式。
 * 所有响应统一为 `{ ok: true, value: ... }` 或 `{ ok: false, error: { code, message } }`。
 *
 * 入参用结构性类型而不是 node:http 的具体类型：0.1.7 起 `ctx.webServer.register`
 * 声明的是 better-sidebar 自己的 `SidebarHttpRequest` / `SidebarHttpResponse`
 * （node `IncomingMessage` / `ServerResponse` 的结构子集，刻意不让 Node 全局类型
 * 漏进声明图）。这里声明等价的请求/响应最小面，运行时传进来的仍是真正的 node req/res，
 * 既不用取私有子路径的类型，也不用强制类型断言。
 */
/** 请求面：url / method / headers / 异步可迭代的 body。 */
export interface SidebarRequestLike {
    url?: string;
    method?: string;
    headers: Record<string, string | string[] | undefined>;
    [Symbol.asyncIterator](): AsyncIterator<string | Uint8Array>;
}
/** 响应面：路由实际用到的状态码、响应头与响应体写入。 */
export interface SidebarResponseLike {
    writeHead(status: number, headers?: Record<string, string>): void;
    end(body?: string | Uint8Array): void;
}
export declare class SidebarError extends Error {
    readonly code: string;
    readonly status: number;
    constructor(code: string, message: string, status?: number);
}
/** 从请求体中读取 JSON。 */
export declare function readJsonBody(req: SidebarRequestLike): Promise<unknown>;
/** 从 payload 中提取字符串字段。 */
export declare function requireString(payload: unknown, field: string): string;
/** 写入成功响应。 */
export declare function writeOk(res: SidebarResponseLike, value: unknown): void;
/** 写入错误响应。 */
export declare function writeError(res: SidebarResponseLike, error: unknown): void;
/** 写入 JSON 响应（自定义状态码）。 */
export declare function writeJson(res: SidebarResponseLike, status: number, body: unknown): void;
/**
 * 构建浏览器信任围栏（与 dsh-better-sidebar 的 trust-fence 保持一致）：
 * Host 必须是本机回环或可信地址，且浏览器标记为同源。
 */
export declare function createTrustFence(trustedHosts: readonly string[]): (req: SidebarRequestLike) => boolean;
//# sourceMappingURL=wire.d.ts.map