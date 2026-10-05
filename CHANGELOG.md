# Changelog

本文件按版本记录用户可见的变更，按「新增 / 修改 / 修复」分组整理（非 git log 转储）。

## [0.3.1] - 2026-10-05

> 目标：修复「版本声明与运行时版本冲突」——插件在 DSH `0.2.x` 运行时被 profile 兼容性闸门拦下、静默跳过加载。
>
> ✅ **支持线**：DSH `^0.1.7-rc.1 || ^0.2.0-rc.1`（即 `0.1.7-rc.1` ~ `0.2.x`，`< 0.3.0`）+ dsh-better-sidebar ≥ `0.21.1`。
> 未验证的 `0.3.x` 运行时仍会被拒（不提前放行）。

### 修复

- **DSH 0.2.x 被误拦**：四个 `@deepseek-ai/dsh-*` 的 `peerDependencies` 原先写作 `^0.1.7-rc.1`，按 caret 语义上界是 `0.2.0`（不含），因此在 DSH `0.2.0-rc.2` 下被判定为 `incompatible`：
  ```
  dsh: skipping profile bundle "dsh-better-sidebar-svn":
  Plugin dsh-better-sidebar-svn@0.3.0 is incompatible with dsh 0.2.0-rc.2
  ```
  改为并集区间 `^0.1.7-rc.1 || ^0.2.0-rc.1`：解除 0.2.x 误拦，同时保留已在支持的 0.1.7 线。
- **0.2.x 实测结论（本版结论依据）**：在真实 DSH `0.2.0-rc.2` 包集（`dsh-client-ui-primitives` / `dsh-host-webserver` / `dsh-session` / `dsh-settings` 均为 `0.2.0-rc.2`）与 `dsh-better-sidebar@0.24.1` 下，`tsc --noEmit` 0 error、build/bundle exit 0、单测 14/14 通过，且**构建产物 `lib/` 与 0.1.7-rc.1 线下逐字节一致**——无代码改动，纯声明修复。

### 修改

- 文档支持线表述同步为 `0.1.7-rc.1` ~ `0.2.x`（`< 0.3.0`），消除「文档声称的支持线」与「peer 区间」之间的冲突。

## [0.3.0] - 2026-09-24

> 目标：适配 DSH 0.1.7-rc.1 / dsh-better-sidebar 0.21.1 支持线，并让 diff 页签与内置对齐。
>
> ⚠️ **支持线变更**：本版起要求 DSH ≥ `0.1.7-rc.1`、dsh-better-sidebar ≥ `0.21.1`。
> 仍在使用 DSH `0.1.6-alpha.2` 及更早的用户请**留在 0.2.0**，不要升级本版。

### 修复

- **DSH 0.1.7-rc.1 图标导出改名**：`@deepseek-ai/dsh-client-ui-primitives` 把图标具名导出从 `...16` 整族改为 `...OutlineRegular` / `...OutlineMedium`，插件 client 半引用的 9 个旧名全部变成 `undefined`，渲染 SVN 面板与「+」菜单时抛 `Element type is invalid`。9 个名字（共 20 处）已迁到 `...OutlineRegular`。
- **host 半路由 handler 类型**：0.1.7 起 `ctx.webServer.register` 声明的是 better-sidebar 自己的 `SidebarHttpRequest` / `SidebarHttpResponse`（node `IncomingMessage` / `ServerResponse` 的结构子集）。`src/wire.ts` 改为按同一结构面接收（并去掉 `node:http` 类型依赖），`readJsonBody` 改用异步迭代读体，`src/index.ts` 的 handler 参数交给上下文推断；运行时行为不变。

### 修改

- **diff 页签对齐内置**：`dsh-better-sidebar-svn:diff` 的标题由「源代码管理SVN」改为「文件变动」，图标由自定义 diff 图形改为内置 git / diff 两条共用的 changes 字形（内联 `VscGitCommit`，MIT，`fill: currentColor`）。主面板 `svn` 保持「源代码管理SVN」不变。
- **依赖声明收敛**：`peerDependencies` 抬到 `^0.1.7-rc.1`、`dsh-better-sidebar` 抬到 `^0.21.1`，移除 0.1.7 线已不存在的 `@deepseek-ai/dsh-client-runtime` 与 `@deepseek-ai/dsh-client-web-react`；`dsh.client.inject` 同步移除前者。

## [0.2.0] - 2026-08-19

> 目标：工程规范化 + UI 可用性补全 + 能力补齐。新增 diff 搜索/过滤、svn:ignore 管理、
> svn 缺失降级提示，版本按语义 minor 升级。

### 新增

- **diff 关键词搜索**：标题栏搜索框，命中行高亮、`n/m` 计数、Enter / Shift+Enter 上下跳转；可选折叠无命中的 hunk（纯前端，无新增网络请求）。
- **diff 路径过滤**：按文件路径子串过滤，只渲染匹配的文件区块（纯前端）。
- **`svn:ignore` 管理弹窗**：读取/编辑/保存当前目录的忽略规则（换行分隔），保存后自动刷新状态区，被忽略的未版本控制文件即刻从面板消失；UI 明确提示"规则仅作用于当前目录、不递归"。
  - 非空规则通过临时文件 `svn propset svn:ignore -F <tmp> .` 写入，避免命令行转义/长度问题；
  - 规则清空走 `svn propdel svn:ignore .`（`propset` 空串不等价于删除属性）；
  - 写操作锁定 `cwd` 的 `realpath`。
- **`svn` 缺失降级提示**：宿主启动后首个请求惰性探测 `svn` 二进制；缺失时返回 `svn-missing` 错误码与可读提示，前端展示友好占位而非空白报错。
- **React ErrorBoundary**：`SvnView` / `SvnDiffTab` 渲染异常时显示可读错误占位，不再整面板白屏。
- **API**：新增 `svn.ignoreGet` / `svn.ignoreSet` 两个 `/sidebar/api/svn.*` 精确路由（沿用 trust-fence 与 JSON 响应约定）。
- **测试**：`parseUnifiedDiff` 与 `svn.ts` 的 XML 提取函数（`extractTag` / `extractAttr` / `extractEntries` / `extractChangelistSpans` / `extractLogEntries` / `extractPaths` / `extractInfoEntry` / `parseLog`）使用 Node 内置 test runner 覆盖。
- **`package.json`**：`pnpm test` 单测脚本；`pnpm version` 前后自动跑 typecheck / test / build 并推送 tag，保证版本号与 tag 不脱节。

### 修改

- README 补齐 diff 搜索/过滤、`svn:ignore` 管理、`svn-missing` 提示与完整 API 路由表。

## [0.1.0] - 2026-08-19

首个已发布版本。

### 新增

- 侧边栏「源代码管理SVN」Tab，交互对齐内置 Git 面板。
- 状态面板：已暂存/未暂存两段，badge 显示 M/A/D/C/?/!/R，分支与版本号。
- 暂存式提交：用 changelist `dsh-commit` 模拟 Git staged，只提交已暂存内容；支持全部暂存/取消、Ctrl+Enter；未版本控制文件暂存时自动先 `svn add`。
- 文件/提交 diff 标签页：VSCode 式渲染（分文件 + hunk + 新旧行号着色）。
- 更新、文件还原、添加进版本控制、冲突解决。
- 历史浏览：懒加载分页、服务端缓存（TTL 1h）+ 客户端快照、右键查看/复制/还原。
- 14 个 API 路由（status/diff/add/revert/stage/unstage/commit/update/log/cat/info/resolve/revertRevision）。

### 修改

- host + client 双半架构；纯系统 `svn` 二进制驱动、`--xml` 输出解析；危险操作走确认弹窗。
- 性能：`svn status` 纯本地、`svn log` 并发去重 + force 刷新、`svn info` 与 `svn status` 并行。