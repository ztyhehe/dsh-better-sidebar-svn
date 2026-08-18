/**
 * SVN 面板共享类型（host 半与 client 半共用）。
 * 设计原则：所有 SVN 操作通过系统 `svn` 二进制完成，输出格式固定为 `--xml`，
 * 保证解析不依赖语言环境或颜色配置。
 */
/**
 * 「待提交」changelist 名：以 Git 暂存区的方式模拟按文件勾选提交
 * （svn changelist 是纯本地元数据，不进版本库；svn commit --changelist
 * 只提交该列表成员，提交后成员自动移出）。
 */
export const STAGE_CHANGELIST = 'dsh-commit';
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