# dsh-better-sidebar-svn

为 [DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) 添加 **SVN（Subversion）源代码管理面板**的插件。

## ✨ 功能

- **📊 状态面板**：变更分「已暂存 / 未暂存」两段显示（修改/添加/删除/冲突/未版本控制等）
- **🔍 文件 Diff**：点击文件查看差异对比；diff 页签与内置 `diff` 页签对齐（标题「文件变动」、同款 changes 图标），标题栏支持**关键词搜索**（命中行高亮、`n/m` 计数、Enter / Shift+Enter 上下跳转、可选折叠无命中 hunk）与**路径过滤**（按文件路径子串过滤，纯前端、不新增网络请求）
- **✅ 暂存式提交**：与内置 Git 面板逻辑一致——行尾 `+`/`−` 按钮把文件加入/移出「待提交」列表（SVN changelist `dsh-commit`，纯本地元数据），提交**只提交已暂存的文件**；支持全部暂存/全部取消、Ctrl+Enter 提交；未版本控制文件暂存时自动先 `svn add`
- **🔄 更新**：一键 `svn update` 同步远端
- **↩️ 还原**：还原单个文件修改
- **➕ 添加**：将未版本控制文件添加到版本控制
- **🙈 忽略规则**：标题栏「忽略规则」弹窗读写当前目录 `svn:ignore`（换行分隔模式），非空规则经临时文件 `propset -F` 写入、清空走 `propdel`；规则仅作用于当前目录、不递归，保存后自动刷新状态区
- **📜 历史**：查看提交历史（分页加载），含变更文件列表
- **🔧 冲突解决**：对冲突文件提供快速解决按钮
- **🛡️ 降级与容错**：系统缺失 `svn` 时面板显示友好提示（`svn-missing`）而非空白报错；`SvnView` / `SvnDiffTab` 均有 React ErrorBoundary，渲染异常显示可读占位而非整面板白屏

## 📦 安装

前置：已安装 [DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar)（≥ 0.21.1，对应 DSH `0.1.7-rc.1` ~ `0.2.x`；本插件的必需 peer）。

```bash
cd ~/.dsh && dsh plugin --profile web add dsh-better-sidebar && dsh plugin --profile web add git+https://github.com/ztyhehe/dsh-better-sidebar-svn.git
```

> 构建产物（`lib/`）已随仓库提交，git 直装无需本地构建工具链。安装后**硬刷新浏览器**（Cmd/Ctrl+Shift+R）即可看到侧边栏中出现「SVN」标签页。

### 卸载

```bash
cd ~/.dsh && dsh plugin --profile web remove dsh-better-sidebar-svn
```

## ⚙️ 前置条件

- 已安装 [DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) (≥ 0.21.1，DSH `0.1.7-rc.1` ~ `0.2.x`)
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
│       ├── SvnView.tsx        # SVN 面板 React 组件（v0.2.0 增 ignore 弹窗）
│       ├── SvnDiffTab.tsx     # diff 标签页（v0.2.0 增搜索 / 过滤）
│       ├── ErrorBoundary.tsx  # 渲染错误边界
│       ├── diff.ts            # 统一 diff 解析纯函数（可测）
│       ├── api.ts             # 类型化 API 封装
│       └── svn.css            # 面板样式
├── tests/                     # Node 内置 test runner 单测
├── package.json
└── tsconfig.json
```

### 设计原则

- **与 Git 面板对称**：API 路由、状态格式、UI 交互均与 better-sidebar 内置的 Git 面板保持对称；SVN 无本地暂存区，用 changelist `dsh-commit` 模拟 Git 的 staged/unstaged（提交后 SVN 自动把已提交文件移出列表）
- **纯 CLI 驱动**：所有操作通过系统 `svn` 二进制完成，无额外库依赖
- **XML 输出解析**：SVN 命令统一使用 `--xml` 格式输出，保证机器解析稳定性
- **非交互式**：所有命令带 `--non-interactive --no-auth-cache` 参数
- **性能**（`svn status` 纯本地读 wc.db，几十毫秒即回；`svn log` 是唯一必须访问仓库服务器的命令，网络往返可能数百毫秒）：
  - 状态区与历史区独立加载，首屏只等本地的 `svn status`，不被 `svn log` 的网络往返拖住
  - `svn log` 服务端缓存（TTL 1 小时）：窗口内命中即返回（切换会话零网络）；过期后下一次访问自动重取最新；刷新按钮传 `force` 立即强制重取；commit / update / 撤销提交后自动失效；同 cwd 并发请求合并为一次往返，分页复用已拉取前缀
  - 客户端历史快照（模块级缓存，切换会话 / 面板重挂载不丢失）：切回会话时历史区直接上屏，无加载占位闪烁
  - `svn info` 与 `svn status` 并行执行（原先 info 先串行判一次仓库再跑一遍，少一个进程往返）
  - `svn log` 显式 `-r HEAD:1`：混合版本工作副本（部分提交后未 update）下，默认范围 `BASE:1` 可能算出空集导致历史无声变空

### API 路由

| 方法 | 描述 |
|------|------|
| `svn.status` | 工作副本状态快照（含 changelist 归属） |
| `svn.diff` | 文件差异文本 |
| `svn.add` | 添加文件到版本控制 |
| `svn.revert` | 还原文件修改 |
| `svn.stage` | 暂存到待提交列表（未版本控制文件自动先 add） |
| `svn.unstage` | 取消暂存（不传 paths = 全部取消） |
| `svn.commit` | 提交待提交列表中的变更（`--changelist`，只提交已暂存） |
| `svn.update` | 更新工作副本 |
| `svn.log` | 提交历史（分页；`force: true` 绕过缓存强制重取） |
| `svn.cat` | 获取某版本文件内容 |
| `svn.info` | 仓库信息 |
| `svn.resolve` | 解决冲突 |
| `svn.revertRevision` | 撤销某次提交（`svn merge -c -REV`） |
| `svn.ignoreGet` | 读取当前目录 `svn:ignore`（按行拆分） |
| `svn.ignoreSet` | 写入 / 清空当前目录 `svn:ignore`（非空 `propset -F` 临时文件，空规则 `propdel`；写操作锁定 cwd realpath） |

> 所有路由均走 trust-fence 与统一 JSON 响应（`{ ok, value }` / `{ ok:false, error:{code,message} }`）约定；
> 系统无 `svn` 时统一返回 `svn-missing` 错误码。

## 🛠️ 开发

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

## 📄 许可

MIT