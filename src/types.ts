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
export const STAGE_CHANGELIST = 'dsh-commit'

/** SVN `status --xml` 中单条 entry 的解析结果。 */
export interface SvnStatusEntry {
  /** 文件路径（相对于仓库根目录）。 */
  path: string
  /** SVN 文件状态：
   *  - 'modified'   (M)  已修改
   *  - 'added'      (A)  已添加
   *  - 'deleted'    (D)  已删除
   *  - 'conflicted' (C)  冲突
   *  - 'replaced'   (R)  已替换
   *  - 'unversioned'(?)  未纳入版本控制
   *  - 'missing'    (!)  丢失
   *  - 'normal'         正常（无变更）
   */
  status: string
  /** 属性状态（同上，仅当属性变更时非空）。 */
  propStatus?: string
  /** 所属 changelist（status --xml 的 <changelist> 容器；undefined = 不在任何列表）。 */
  changelist?: string
  /** 是否为目录。 */
  isDir: boolean
  /** 仓库相对路径（用于 diff 等操作）。 */
  repoPath: string
}

/** SVN 状态快照。 */
export interface SvnStatusResult {
  isRepo: boolean
  /** 仓库根 URL。 */
  rootUrl?: string
  /** 当前分支 / 相对路径。 */
  relativeUrl?: string
  /** 当前版本号（HEAD）。 */
  revision?: string
  /** 最后修改者。 */
  lastAuthor?: string
  /** 最后修改时间。 */
  lastDate?: string
  /** 变更条目列表。 */
  entries: SvnStatusEntry[]
}

/** 一条 SVN 日志记录。 */
export interface SvnLogEntry {
  /** 版本号。 */
  revision: string
  /** 提交者。 */
  author: string
  /** ISO 日期。 */
  date: string
  /** 提交信息。 */
  message: string
  /** 该版本变更的文件列表。 */
  paths: SvnLogPath[]
}

/** 一条日志中的路径变更。 */
export interface SvnLogPath {
  /** 操作类型：A (添加) / D (删除) / M (修改) / R (替换)。 */
  action: string
  /** 文件路径。 */
  path: string
}

/** SVN 命令错误。 */
export class SvnCommandError extends Error {
  readonly code: string
  readonly command: string
  constructor(
    message: string,
    code = 'svn-error',
    command: string,
  ) {
    super(message)
    this.code = code
    this.command = command
  }
}