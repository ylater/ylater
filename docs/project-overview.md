# 项目现状

## 定位与边界

Murphy 的个人展示站点，表达“把复杂，做简单”，展示商业保险理赔相关的技术与服务应用、AI 与产品实践。页面中的数智赔、医问百通、AI 工具、交互实验是作品方向的介绍，本仓库不包含这些业务系统的实现。

当前为单页静态站点，无运行时 npm 依赖。已读实现中没有业务后端、登录、数据库、内容管理后台或持久化用户状态。详情由本地对象提供，刷新页面会重新初始化交互。

## 已实现功能

| 模块 | 当前行为 | 主要入口 |
| --- | --- | --- |
| 首页 | 品牌、自我介绍、四个作品方向、自动更新年份 | `src/index.html`、`src/main.js` |
| 标题互动 | 简单 → 好用 → 好玩 → 清楚循环，更新提示及无障碍播报 | `#word-button` |
| 详情弹窗 | 个人说明书与四项作品；关闭按钮、Esc、点击弹窗外部关闭；关闭后恢复触发器焦点 | `[data-open]`、`#detail-dialog` |
| 关键词 | 界面、流程、规则、AI；点击显示观点，拖动调整位置；方向键移动，Shift 加大步长，Home 复位 | `.orbit-word` |
| 关键词整理 | 小猫点击和菜单切换散开/整齐排列 | `tidyWords` |
| `src/flow-play.js` | 独立的简化理赔流程小游戏，通过现有事件触发小猫反馈 |
| `src/pet.js` |
| 猫咪菜单 | 理顺关键词、打盹、回到中央、暂停/恢复自动走动；支持方向键导航 | `.pet-controls` |
| 流程小挑战 | 作品列表下方展开；跟随住院情境连接入院感知、住院协同、出院理赔，逐步展示服务记录，支持提示、撤回与重新打乱，完成触发小猫反馈 | `src/flow-play.js`、`#flow-play` |
| 首页复位 | 点击品牌恢复标题、关键词、提示并让猫咪回到中央 | `.wordmark` |
| 动效控制 | CSS 减少动效模式；猫咪对应调整行为；页面隐藏或舞台离屏时停止动画循环 | 两份 CSS、`src/pet.js` |
| 素材降级 | 图集加载失败保留静态猫图，点击仍可整理关键词 | `loadImage` 的失败处理 |

猫咪焦点下：左右键移动，上键挥手，下键切换休息，Home 回中央。菜单“暂停走动”只控制自动游走，不表示停止所有绘制和主动交互。

## 工程与数据流

| 位置 | 职责与改动边界 |
| --- | --- |
| `src/index.html` | DOM、元信息、基础可访问名称、作品入口；修改 ID 或 data 属性需同步脚本 |
| `src/styles.css` | 页面布局、设计变量、弹窗、关键词和响应式样式 |
| `src/main.js` | 自执行函数；关键词、文案、详情数据 `entries`、弹窗与首页复位 |
| `src/flow-play.js` | 独立的简化理赔流程小游戏，通过现有事件触发小猫反馈 |
| `src/pet.js` | 自执行函数；猫咪状态、图集绘制、输入、菜单与生命周期观察 |
| `src/pet.css` | 动画激活后的猫咪样式、菜单、触屏适配；覆盖基础样式 |
| `public/` | 按原路径复制到产物的静态资源 |
| `artwork/pet-strips/` | 猫咪原始素材，非浏览器直接加载入口 |
| `tools/prepare_pet_assets.py` | 可选图片处理流程，Python 依赖见 `requirements-assets.txt` |
| `scripts/serve.mjs` | 开发读取 `src` 后 `public`，预览只读取 `dist`；绑定本机，无热更新 |
| `scripts/build.mjs` | 清空并重建 `dist`，先复制 `public` 再复制 `src`；同名路径以后者为准 |
| `.openai/hosting.json` | 原 Sites 托管关联；本地构建不等于发布 |

浏览器先加载 `pet.js`，再加载 `main.js`，均为 defer 脚本。两个模块通过 DOM 和 document 自定义事件协作；无需框架状态管理。

### 模块事件契约

| 事件 | 发出方 → 消费方 | detail / 行为 |
| --- | --- | --- |
| `murphy:pet-tidy` | pet → main | 无载荷；切换关键词布局 |
| `murphy:pet-say` | pet → main | `{ message, duration }`；提示时长默认 2600ms |
| `murphy:pet-react` | main → pet | `{ kind }`；happy / wave / review，对其他值采用 look |
| `murphy:pet-home` | main → pet | 无载荷；返回舞台中央 |

新增事件时同时明确载荷、触发时机、资源未就绪及拖拽时的处理。当前 pet 会忽略未就绪或拖拽中的 react 事件。

## 猫咪资源契约

运行时直接加载 `public/pet/heyanju.webp`，要求 8 列 × 11 行，每格 192 × 208，即整图 1536 × 2288。回退图片为 `public/pet/heyanju-idle.png`。Canvas 逻辑尺寸为 192 × 208，显示尺寸按舞台测量调整。

状态包括 idle、look、walk、wave、happy、sleep、drag、fall、review。帧映射硬编码在 `frame()`：idle/sleep 第 0 行、左右行走第 1/2 行、挥手第 3 行、拖拽/落地第 4 行、开心第 6 行、查看第 8 行、注视第 9/10 行（均从 0 开始）。不能仅替换同名图片就假定动画语义一致。

`public/pet/manifest.json` 描述的是 384 × 256、6 帧及 idle/walk/reactions，与运行时代码的规格不同；当前 `pet.js` 不读取该文件。后续应核实其对应的素材，不可直接将它作为核验橘的运行时配置。

## 样式与兼容约束

基础设计变量在 `styles.css` 的 `:root`：近白背景、深色文本、蓝色强调、系统字体。断点包括 1500、1050、760、360px；760px 以下主区域单列、作品两列。文件末尾存在字体覆盖规则，改造需检查最终层叠结果。

依赖原生 dialog、Canvas 2D、Pointer Events、ResizeObserver、IntersectionObserver 和 matchMedia。源码存在图集加载降级，但尚无完整浏览器兼容验证记录；API 不支持不能视作已有完整降级。
