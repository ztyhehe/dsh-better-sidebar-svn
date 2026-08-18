# dsh-better-sidebar-svn

为 [DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) 添加 **SVN（Subversion）源代码管理面板**的插件。

## ✨ 功能

- **📊 状态面板**：显示工作副本中所有变更文件（修改/添加/删除/冲突/未版本控制等）
- **🔍 文件 Diff**：点击文件查看差异对比
- **✅ 提交**：输入提交信息后提交变更
- **🔄 更新**：一键 `svn update` 同步远端
- **↩️ 还原**：还原单个文件修改
- **➕ 添加**：将未版本控制文件添加到版本控制
- **📜 历史**：查看提交历史（分页加载），含变更文件列表
- **🔧 冲突解决**：对冲突文件提供快速解决按钮

## 📦 安装

前置：已安装 [DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar)（≥ 0.12.0，本插件的必需 peer）。

```bash
cd ~/.dsh && dsh plugin --profile web add dsh-better-sidebar && dsh plugin --profile web add git+https://github.com/ztyhehe/dsh-better-sidebar-svn.git
```

> 构建产物（`lib/`）已随仓库提交，git 直装无需本地构建工具链。安装后**硬刷新浏览器**（Cmd/Ctrl+Shift+R）即可看到侧边栏中出现「SVN」标签页。

### 卸载

```bash
cd ~/.dsh && dsh plugin --profile web remove dsh-better-sidebar-svn
```

## ⚙️ 前置条件

- 已安装 [DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) (≥ 0.12.0)
- 系统已安装 `svn` 命令行工具（1.7+）

## 🏗️ 架构

```
dsh-better-sidebar-svn/
├── src/
│   ├── index.ts              # Host 半：注册 /sidebar/api/svn.* 路由
│   ├── svn.ts                # SVN CLI 操作（svn status/diff/log/commit...）
│   ├── wire.ts               # HTTP 辅助函数（JSON 响应格式）
│   ├── types.ts              # 共享类型定义
│   └── client/
│       ├── index.tsx          # Client 半：注册 SVN Tab 到 better-sidebar
│       ├── SvnView.tsx        # SVN 面板 React 组件
│       ├── api.ts             # 类型化 API 封装
│       └── svn.css            # 面板样式
├── package.json
└── tsconfig.json
```

### 设计原则

- **与 Git 面板对称**：API 路由、状态格式、UI 交互均与 better-sidebar 内置的 Git 面板保持对称
- **纯 CLI 驱动**：所有操作通过系统 `svn` 二进制完成，无额外库依赖
- **XML 输出解析**：SVN 命令统一使用 `--xml` 格式输出，保证机器解析稳定性
- **非交互式**：所有命令带 `--non-interactive --no-auth-cache` 参数

### API 路由

| 方法 | 描述 |
|------|------|
| `svn.status` | 工作副本状态快照 |
| `svn.diff` | 文件差异文本 |
| `svn.add` | 添加文件到版本控制 |
| `svn.revert` | 还原文件修改 |
| `svn.commit` | 提交变更 |
| `svn.update` | 更新工作副本 |
| `svn.log` | 提交历史（分页） |
| `svn.cat` | 获取某版本文件内容 |
| `svn.info` | 仓库信息 |
| `svn.resolve` | 解决冲突 |

## 🛠️ 开发

```bash
pnpm install
pnpm typecheck
pnpm build
```

## 📄 许可

MIT