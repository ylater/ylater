# 项目现状：dev 重设计

## 定位
Murphy 的个人展示与互动站点。商业保险理赔相关的技术与服务应用是工作方向，AI 与代码是探索工具。没有企业业务后台、理赔办理或真实模型推理服务。

本版不包含文章栏目、AI 分工工作台或未完成陈列室。数智赔只展示企业内部项目的参与方向，不展示内部数据。

## 页面与交互

| 区域 | 当前行为 | 入口 |
| --- | --- | --- |
| 首页 | 大字个人介绍、原生生成的核验橘；点击角色循环反馈 | `src/index.html`、`src/main.js` |
| 说明书 | 原生 dialog，Esc/按钮/外部点击关闭，焦点恢复与循环 | `#about-dialog` |
| 灵感画布 | 短句、三种程序构图、四组配色、强度、随机种子；指针轻量搅动画面 | `src/studio.mjs`、`src/art-engine.mjs` |
| PNG 导出 | 输出 1500 × 1800 PNG，独立画布导出，不包含临时指针偏移 | `#download` |
| 分享配方 | 参数写入 URL；打开可还原短句、构图、配色、强度与种子；剪贴板失败提供手工复制入口 | `#share-art` |
| 本机收藏 | IndexedDB 保存配方，刷新恢复、去重、删除；最多 24 条，满额不自动删除已有作品 | `src/art-storage.mjs` |
| 工作方向 | 原生 details 展示数智赔、医问百通、AI 与工具 | `.work-item` |
| 一站式理赔 | 入院感知、住院协同、出院理赔；情境、提示、记录、撤回与重置 | `src/flow-play.js` |

画布是本地生成式艺术算法，不冒充在线 AI。短句不上传；分享链接会包含短句。收藏只存在当前设备/浏览器，清除网站数据会删除收藏，不存在跨设备同步。

## 工程

原生 HTML/CSS/JavaScript 与 ES modules，零运行时 npm 依赖。Node.js 22+ 仅用于开发、构建和测试。

- `src/index.html`：内容、语义、入口与 SEO。
- `src/styles.css`：设计变量、响应式、焦点与减少动效。
- `src/main.js`：说明书、核验橘反馈与年份。
- `src/studio.mjs`：画布 UI、下载、分享、收藏交互。
- `src/art-engine.mjs`：纯配方校验、URL 编解码、确定性随机及 Canvas 绘制。
- `src/art-storage.mjs`：IndexedDB 事务、容量与错误处理。
- `src/flow-play.js`：独立的理赔概念体验。
- `public/art/murphy-cat.png`：本版原生生成主视觉，提示词见 `image-assets.md`。
- `scripts/`：开发服务器、构建与产物检查。
- `tests/`：配方、Unicode、无效参数与确定性单元测试。
- `artwork/`、`tools/` 与旧 `public/pet/`：上一版角色原始素材与工具，当前页面不加载。
- `src/pet.js`、`src/pet.css`：上一版动画实现保留作历史参考，本版不加载。

构建将 `public` 与 `src` 复制到 `dist`。开发服务器从 `src`、`public` 读取；preview 仅从 `dist` 读取。`.mjs` 以 JavaScript MIME 类型提供。

## 角色事件
保留 `murphy:pet-react` / `murphy:pet-say` 供流程玩法反馈给首页角色。首页只在成功时更新点击动画和文案，没有持续动画循环。

## 验收
本版用户明确授权浏览器 UI 验收，取代此前仅由用户人工验收的约束。自动化与视觉检查范围见 `acceptance.md`，调研和设计依据见 `redesign-dev.md`。
