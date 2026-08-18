/**
 * SVN 面板共享类型（host 半与 client 半共用）。
 * 设计原则：所有 SVN 操作通过系统 `svn` 二进制完成，输出格式固定为 `--xml`，
 * 保证解析不依赖语言环境或颜色配置。
 */
/** SVN 命令错误。 */
export class SvnCommandError extends Error {
    code;
    command;
    constructor(message, code = 'svn-error', command) {
        super(message);
        this.code = code;
        this.command = command;
    }
}
//# sourceMappingURL=types.js.map