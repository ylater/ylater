# 当前项目：宋式雅间版本

Murphy 的个人展示与互动站点。商业保险理赔相关的技术与服务应用是工作方向，AI 与代码是探索工具；不提供企业业务办理或真实模型推理服务。

## 页面

| 区域 | 当前行为 | 入口 |
| --- | --- | --- |
| 标题 | 保留黑色大字与荧光绿下划线；点击/8 秒定时换词，可暂停、减少动效与离屏控制 | `src/hero.mjs`、`src/headline-cycle.mjs` |
| 橘猫 | 原版动画图集；点击、拖拽、走动、注视、打盹、关键词与菜单 | `src/pet.js`、`src/pet.css`、`src/hero.mjs` |
| 宋式雅间 | 容器内真实 Three.js 场景；题名、四季、天气、灯光、开屋顶、视角 | `src/song-scene.mjs`、`src/room.css` |
| 雅间设置 | 保存到本机、分享配方、PNG 快照；存储/剪贴板/WebGL 失败反馈 | `src/studio.mjs`、`src/room-state.mjs` |
| 工作方向 | 数智赔、医问百通、AI 与工具，原生 details | `.work-item` |
| 一站式理赔 | 入院感知、住院协同、出院理赔情境与服务记录 | `src/flow-play.js` |
| 说明书 | 原生 dialog；关闭、焦点恢复与循环 | `src/main.js` |

studio 已取代上一版海报画布，不恢复 AI 分工工作台、未完成陈列室或文章栏目。原海报收藏数据没有被主动清除，当前页面不再读写原 IndexedDB。

## 架构

原生 HTML/CSS/JS 与 ES modules。Three.js 0.169.0、OrbitControls 自托管；Node.js 22+ 用于开发/构建/测试。没有在线 AI 调用、业务后端或登录。

- `artwork/song-room/original.html`：用户提供的原始雅间源码，保持不变。
- `public/vendor/`：固定版本的 Three.js、OrbitControls 与 MIT 许可。
- `public/pet/`：当前活动橘猫图集与降级图。
- `public/room/song-room-preview.png`：WebGL 不可用时的原场景预览。
- `public/art/murphy-cat.png`：上一版原生生成角色资产，当前页面不加载。
- `src/room-state.mjs`：纯状态校验、描述与 URL 编解码。
- `src/song-scene.mjs`：保留原场景并增加环境与生命周期控制。
- `src/studio.mjs`：界面、懒加载、设置、分享与快照。
- `src/headline-cycle.mjs`：换词计时器与可组合暂停原因。
- `tests/`：雅间状态与标题计时器测试。
- `scripts/`：开发、构建、资源/MIME/预览检查。

设置只保存在当前浏览器的 localStorage，不跨设备同步；分享链接会包含题名。季节与天气是用户自选的场景设定，不是实时天气。

## 生命周期与可访问性

场景将要进入视口时载入；离屏/后台停止绘制。减少动效停止天气粒子与自动换词，保留手动控制。三维画布可通过方向键旋转、加减键缩放、Home 归位；也提供按钮。原生橘猫、关键词及菜单保留键盘操作。

构建复制 `src` 与 `public` 至 `dist`。`.mjs` 需作为 JavaScript MIME 提供；开发/预览服务器已支持。用户已授权本版浏览器验收，结果见 [验收记录](acceptance.md)。
