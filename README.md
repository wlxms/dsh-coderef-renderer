# dsh-coderef-renderer（fork 版）

影子接管 `conversation.chat.node[assistant-step]`，并**把 DSH 原生 MarkdownText 管线 fork 进插件**：
`mdast` GFM 解析 + 流式增量解析 + `render.tsx` 渲染，保留原生 DOM / CSS token / 安全策略，
同时暴露 Markdown 级别的 coderef 钩子。

```
dsh-coderef（Host 半，已存在）
  ├─ POST /coderef/resolve   证据/索引解析，返回 candidates + status
  └─ POST /coderef/open      IDE 打开
        ▲
        │ fetch（同源）
dsh-coderef-renderer（本插件，Client 半，fork 构建）
  └─ slots.register('conversation.chat.node', key='assistant-step', priority=-100)
       ├─ fork/MarkdownText.tsx    原生 mdast → React 管线
       │    ├─ fork/incremental.ts 流式 frozen-prefix 增量解析
       │    ├─ fork/render.tsx     原生 renderNode switch（改造点）
       │    │    ├─ inlineCode -> 原生 file-mention chip（走 /coderef/resolve）
       │    │    ├─ strong     -> 引用 chip（fork 新增）
       │    │    └─ link       -> coderef: scheme chip（fork 新增）
       │    ├─ fork/parse.ts       GFM + CJK-friendly strong（math 先关闭）
       │    └─ 平台组件：CodeBlock / LinkIcon / classifyLinkPath（直接复用）
       ├─ click: sidebar openFile + 行 ping（always）→ /coderef/open IDE（best effort）
       └─ React error boundary / 宿主 renderer（priority 0）兜底
```

## 点击 / 右键 / 引用列表（本版交互）

- **左键点击引用**：只在 **DSH 窗口**里打开文件（`openFile + 行 ping`）；不启动任何外部 IDE；
- **右键引用**：用平台 `Menu` 组件（`@deepseek-ai/dsh-client-ui-primitives`）渲染**原生 DSH 菜单**
  （portal + 光标定位 + `dense`/`compact` + 原生 row/separator/hover 样式），只有两项：
  - `在资源管理器中打开`（文件夹图标）
  - `复制路径`（复制图标）
- 文件打开/跳转统一走 DSH 自己的预览窗口；`GET /coderef/ides` 仅保留给旧 client 兼容，fork 不再调用。
- **引用列表**：每轮末尾的 `<details data-coderef-refs>`：
  - 分为「文件 / 链接 / 命令」三个**可折叠分类**（默认展开，原生 `<details>`）；
  - 列表区固定最大高度 **320px**，内部滚动展示全部引用，不再截断到前 20 条；
  - 行内文件/链接图标、来源 badge、出现次数，hover/圆角/hairline 走 DSH token；默认折叠。
- **命令捕获/高亮**：命令来自**助手推给用户的命令**（assistant 正文里的 inline code 或
  `bash`/`pwsh`/`shell` 标记的 fenced code），**不收集助手自己 tool-call 用过的命令**；
  命令在正文中按完整 token 高亮为终端 chip（`data-coderef-command`），inline code 中的命令同样渲染；
  点击后通过 DSH 的 `webTerminals` + `sidebarRight` 打开/复用右侧栏终端，把命令 `write()` 进终端
  **但不发送 Enter**；未加载 sidebar-terminal 插件时自动回退为复制命令并提示。
- 右键菜单和列表项都复用同一个 `showContextMenu`，列表项同样支持右键。

## 引用收集分析器 + 高亮跳转器（本版新增）

- **Host 收集器**（`dsh-coderef/lib/references.js`）：从 session 事件提取
  assistant 正文 / grep / read / edit / glob / web_fetch / web_search 的
  文件、URL、符号 + provenance，折叠成内存 ledger；`GET /coderef/refs?sessionId&cwd`
  返回全量 + `visibleStats`（只标记正文里出现过的引用）。
- **插件级 instruction**：host 注册 `systemPrompt.section('coderef:citations')`，装载插件后模型下一次
  请求即可读到 `[label](coderef:<path>#L<line>)` / `coderef:sym:` / `coderef:cmd:` 的引用约定。
- **正文高亮器**：renderer 拉取 ledger，`render.tsx` 的 `case 'text'` 切成
  plain-text chip（完整 token、大小写敏感、路径按分隔符边界后缀、支持小写字段/属性）；
  inline code / strong / `coderef:` link 仍走原有分支；歧义默认打开最高置信候选。
- **折叠引用卡**：每轮最后一条 assistant 消息底部渲染 `[data-coderef-refs]`，
  只列正文出现过的文件/链接（`visible`），点击跳转；折叠状态只在内存里。
- **测试**：`test/references-smoke.mjs`（collector + commands）、`test/probe-highlighter.mjs`（ledger + prose chip + footer）、
  `test/probe-footer.mjs`（固定高度滚动 / 分类折叠 / 命令写入终端）、`test/probe-ux.mjs`（左键 / 右键 / footer）、`test/probe-click.mjs`（点击链）。

## 为什么 fork 原生 MD，而不是 markstream

- **视觉/DOM 与宿主一致**：同一份 `render.tsx` + 同一份 CSS module 规则（转成 `.dcr-*` 注入），
  流式/表格/代码块/KaTeX（后续）/图片策略/安全清洗都是原生行为；
- **体积小**：browser bundle 约 276KB（不含 Shiki/KaTeX/Mermaid；Shiki 由平台 `CodeBlock` 提供）；
- **不需要宿主补丁**：priority -100 影子 + 平台种子模块，源码构建与打包桌面版都能加载；
- **改造点在 Markdown 节点层**：`inlineCode` / `strong` / `link` 直接改 switch，比“改 blocks 文本 /
  换 resolver”更彻底，也比 markstream 的组件覆盖 API 更贴近原生 DOM。

代价是 fork ~1.3k 行原生源码（`MarkdownText 188 + render 696 + incremental 360 + parse`），
上游 Markdown 子系统变化时需要 diff 同步；构建需要 esbuild/deps。

## fork 内容

`src/fork/` 来自 DSH `packages/client/ui-primitives/src/markdown/`：

- `MarkdownText.tsx`：settled 全量渲染 + streaming 增量渲染入口；新增 `coderefLinks` prop。
- `render.tsx`：原生 mdast→React switch；本插件改造：
  - `inlineCode`：沿用原生 `fileMentions.resolve` 路径，额外标记 `data-coderef-chip`；
  - `strong`：单个 text 子节点命中 resolver 时渲染成引用 chip（`.dcr-strong-chip`）；
  - `link`：`coderef:` scheme 渲染成可点 chip（其余 link 走原生安全协议白名单）。
- `incremental.ts`：原样保留（流式冻结尾块、按 chunk 解析 tail）。
- `parse.ts`：保留 GFM + `cjkFriendlyStrong`；**首版关闭 math**（`katex.tsx` 是文本 fallback）。
- `cjkFriendlyStrong.ts`：原样保留中文加粗。
- `src/CodeBlock.tsx` / `src/LinkIcon.tsx` / `src/fork/katex.tsx`：把原生本地依赖改为平台模块
  re-export / 文本 fallback；`src/fork/css.ts` 把 CSS module 类名映射到注入的 `.dcr-*` 类。

`src/entry.tsx` 是渲染器外壳：收集 text blocks 里的 inline code / **bold** token，批量调
`POST /coderef/resolve`，把命中项装配成原生 `MarkdownFileMentions` resolver；点击复用
`openFile + ping + /coderef/open` 链路。流式期间不解析（保持原生流式渲染），settle 后再出 chip。

## 构建（当前原型）

本机直接用 host 仓库的 pnpm store（离线，不装依赖）：

```powershell
# 从 D:\dsh-mydsh\deepseek-harness 的 node_modules 取 esbuild 与 mdast/micromark
.\scripts\build.ps1
```

脚本等价于：

```text
esbuild src/entry.tsx --bundle --format=cjs --platform=browser --jsx=automatic
  --external:react --external:react/jsx-runtime
  --external:@deepseek-ai/dsh-client-ui-primitives
  --outfile=lib/impl.js
node scripts/wrap.mjs   # 包进 window.__ModuleLoader__.load({ id, factory(require) })
```

`NODE_PATH` 指向宿主 `node_modules` + `.pnpm/node_modules`（mdast/micromark 依赖）。
正式发布时改回 `dependencies` + tsdown/esbuild 标准构建即可；bundle 仍是手写 lazy-CJS 契约。

## 测试

```powershell
node test/smoke.mjs          # bundle 注册 + priority -100 shadow
$env:CDP_BASE='http://127.0.0.1:9333'
node test/e2e-renderer.mjs '<token>'   # 真实浏览器：fork 渲染、chip、strong chip、ping
node test/probe-footer.mjs '<token>'   # 固定高度滚动 / 分类折叠 / 命令写入终端
node test/probe-ux.mjs '<token>'       # 左键 / 右键菜单 / footer
```

E2E 断言：`[data-coderef-renderer="fork"]` 根、≥8 chip、≥1 个 `.dcr-strong-chip`、
`lib/index.js:1216` / `AssistantNodeView` / `useTurnData` 引用可点、点击后侧边栏打开并 ping 到 1216、
0 console 错误。

## 已知限制（首版）

- **math 关闭**：`$...$` / `$$...$$` 渲染为文本（KaTeX 依赖与字体不进 bundle）；后续可加回。
- **Mermaid 没有**：fence 仍是原生 CodeBlock（与 better-markdown 的差异，需要另加 fence renderer）。
- **AssistantBlock 的附件图片**：显示 `[image]` 占位；Markdown 文本里的外链图片仍走原生策略渲染。
- **ehm fence 没有 first-class 集成**：`ehm` 仍由平台 `CodeBlock` 渲染，理论上保留
  `dsh-enhance-mermaid` 的 DOM takeover 契约（未在本 fork 内验证）。
- 只替换 `assistant-step`；plan/trajectory 等静态 surface 继续用宿主 `MarkdownText`。
- fork 与上游同源，但 DSH 升级后需要手动同步 `src/fork/` 的 diff。

## 引用格式 instruction

`dsh-coderef` Host 通过 `ctx.inject(['systemPrompt'])` 注册 `coderef:citations` section，要求助手主动输出：

- 文件/行：`[lib/index.js:1216](coderef:lib/index.js#L1216)`，范围 `#L14-L18`；
- 文件无行号：`[lib/index.js](coderef:lib/index.js)`；
- 符号：`[AssistantNodeView](coderef:sym:AssistantNodeView)`；
- 命令：`[node test/smoke.mjs](coderef:cmd:node%20test%2Fsmoke.mjs)`（destination percent-encode）；
- 网页正常 Markdown 链接。

`GET /coderef/instruction` 可查看注册状态与文本（order = FILE_REFERENCE + 1 = 901）。

## 覆盖提升：字段/代码段

- Host evidence 现在额外提取 typed field / property / method / `private foo =` 形式的字段；
- Host collector 建立源码行 snippet 索引（整行、`lhs = rhs`、`foo()` 调用）；
- renderer 处理 inline code 时先做 **精确全匹配**，例如 `bIsTickable = true` 命中某行后整段变为
  `file:line` 引用；非源码/注释行不建索引；
- 以 C# 为例，`private bool bIsTickable = false;` 会同时提供 `bIsTickable` 符号和
  `bIsTickable = false` snippet。

## 性能与内存

- `/refs` 由每个 assistant-step 各自轮询改为 **按 sessionId+cwd 共享一个 channel**；N 条消息仍然只有 1 个
  interval、1 次响应解析；
- 请求带 `since=<version>`，内容未变化时 server 返回 `{ok:true,unchanged:true,version}`（约 42B），
  renderer 不再重新构造 ledger/snippet 索引；
- channel 有 in-flight guard、隐藏标签页跳过、最后一个订阅者卸载时 clearInterval；
- toast / resolver retry timer 在 unmount 清理。

实测 30 个 assistant 节点：修复前 12s 90 次请求、heap +72MB；修复后 12s 2~3 次请求，
60s 空闲 heap 稳定、DOM 节点数不增长。
