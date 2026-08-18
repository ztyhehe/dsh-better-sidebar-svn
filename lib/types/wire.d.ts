/**
 * HTTP 路由辅助函数：与 dsh-better-sidebar 的 wire.ts 保持一致的 JSON 响应格式。
 * 所有响应统一为 `{ ok: true, value: ... }` 或 `{ ok: false, error: { code, message } }`。
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
export declare class SidebarError extends Error {
    readonly code: string;
    readonly status: number;
    constructor(code: string, message: string, status?: number);
}
/** 从请求体中读取 JSON。 */
export declare function readJsonBody(req: IncomingMessage): Promise<unknown>;
/** 从 payload 中提取字符串字段。 */
export declare function requireString(payload: unknown, field: string): string;
/** 写入成功响应。 */
export declare function writeOk(res: ServerResponse, value: unknown): void;
/** 写入错误响应。 */
export declare function writeError(res: ServerResponse, error: unknown): void;
/** 写入 JSON 响应（自定义状态码）。 */
export declare function writeJson(res: ServerResponse, status: number, body: unknown): void;
/**
 * 构建浏览器信任围栏（与 dsh-better-sidebar 的 trust-fence 保持一致）：
 * Host 必须是本机回环或可信地址，且浏览器标记为同源。
 */
export declare function createTrustFence(trustedHosts: readonly string[]): (req: IncomingMessage) => boolean;
//# sourceMappingURL=wire.d.ts.map