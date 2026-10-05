# AGENTS.md

本文件是对本仓库内 AI 编码智能体的工作约定。开始改动前请先阅读。

## 仓库简介

`dsh-better-sidebar-svn` 是为 [DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar)（≥0.21.1，对应 DSH `0.1.7-rc.1` ~ `0.2.x`）提供 **SVN（Subversion）源代码管理面板**的插件。host + client 双半结构：

- **host 半** `src/index.ts`：注册 `/sidebar/api/svn.*` 精确路由，全部通过系统 `svn` 二进制（`--xml` 输出）驱动。
- **client 半** `src/client/`：注册「源代码管理SVN」Tab 与 diff 标签页（`SvnView.tsx` / `SvnDiffTab.tsx`）。
- **构建产物** `lib/` 需随仓库提交（git 直装无需构建）；改动源码后跑 `pnpm build` 重建。
- 交互与内置 Git 面板保持对称（使用 changelist `dsh-commit` 模拟 staged）。

## 修改规划规范（必读）

任何**修改/添加**任务展开前，须先在 `docs/auto/` 下创建**带日期的规划文档**，并按以下规则同步写入本 AGENTS.md。

### 文档命名规则

在 `docs/auto/` 下创建两份文档，日期一律取**当天**（`YYYY-MM-DD`），任务名为**中文**：

```
docs/auto/YYYY-MM-DD-中文任务名-spec.md
docs/auto/YYYY-MM-DD-中文任务名-plan.md
```

示例（2026-08-19）：

```
docs/auto/2026-08-19-SVN面板功能补全-spec.md
docs/auto/2026-08-19-SVN面板功能补全-plan.md
```

### 各文件用途

- **`*-spec.md`**：Spec 修改计划 —— 写清当前版本、目标、现状事实（据源码）、需求细节、非目标、验收标准。
- **`*-plan.md`**：Plan 执行计划 —— 只列执行步骤、涉及文件、依赖关系、阶段/关键路径、验证与风险，不重述 spec 的理由。

> 不要在文件名里用简称/口号，任务名要能概括本次改动主题。

### 每次改动需同步更新本文件

当一次修改任务建立了新的 `docs/auto/` 计划文档后，需在下方「本次规划」区登记，或由人工更新本文件的规划索引，保证 AGENTS.md 始终反映最新规划文档位置与命名规则。

## 工程约定

- 新增 API 路由遵循既有 `${method}` 于 `/sidebar/api/svn.*` 命名与 trust-fence / JSON 响应约定。
- 涉及 `svn` CLI 的命令必须带 `--non-interactive --no-auth-cache`，解析用 `--xml`。
- 危险写操作（还原/回滚/提交等）必须保留确认弹窗；`svn:ignore` 写操作需锁定 `cwd` 的 `realpath`。
- 模块改动后必须过 `pnpm typecheck` 与 `pnpm build`，并重建 `lib/`。
- 提交遵循 conventional commits（`feat:`/`fix:`/`chore:`/`docs:`/`test:`）；版本号、CHANGELOG、tag 三者一致。

## 本次规划

| 日期 | 任务名（中文） | spec | plan |
|------|---------------|------|------|
| 2026-08-19 | SVN面板功能补全 | `docs/auto/2026-08-19-SVN面板功能补全-spec.md` | `docs/auto/2026-08-19-SVN面板功能补全-plan.md` |
| 2026-09-24 | 适配DSH0.1.7图标改名与diff页签对齐 | `docs/auto/2026-09-24-适配DSH0.1.7图标改名与diff页签对齐-spec.md` | `docs/auto/2026-09-24-适配DSH0.1.7图标改名与diff页签对齐-plan.md` |
| 2026-10-05 | 适配DSH0.2.x支持线依赖声明 | `docs/auto/2026-10-05-适配DSH0.2.x支持线依赖声明-spec.md` | `docs/auto/2026-10-05-适配DSH0.2.x支持线依赖声明-plan.md` |