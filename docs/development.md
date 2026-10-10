# 开发说明

个人网站：[www.ylater.com](https://www.ylater.com)。本仓库的 `README.md` 用于 GitHub 个人主页；本文件介绍网站开发。

## 本地运行

需要 Node.js 22+。

```sh
npm ci
npm run dev
```

访问 http://127.0.0.1:5173。修改源码后刷新；开发服务器不做热更新。指定其他端口：`npm run dev -- --port 5174`。

## 检查与构建

```sh
npm run check
npm test
npm run build
npm run verify
npm run preview
```

`check` 检查活动脚本语法；`test` 执行 Node 单元测试；`build` 重建静态产物；`verify` 校验产物引用与模块 MIME；`preview` 在本机提供构建后的站点。未配置独立 lint 或 TypeScript typecheck。

构建不等于发布。按静态网站部署 `dist/`，现有域名为 www.ylater.com。静态主机需要将 `.mjs` 提供为 JavaScript MIME 类型（通常默认支持）。

## 数据与隐私

- 雅间场景在浏览器本地绘制，Three.js 与 OrbitControls 由本站提供，不依赖外部 CDN。
- 设置显式保存至 localStorage，不跨设备同步。清除网站数据会移除记住的雅间。
- 分享链接包含题名、季节、天气、灯光、屋顶状态。
- WebGL 不可用时保留静态预览和配方设置/分享，禁用截图。原版橘猫图集失败时保留静态猫咪。
- 此版本不再使用海报画布和原 IndexedDB 收藏；没有主动清空旧收藏数据。

## 结构与素材

模块职责见 [项目现状](project-overview.md)，用户提供源码与扩展说明见 [雅间升级](song-room-upgrade.md)。原版 pet 图集与 `src/pet.js`、`src/pet.css` 为当前活动实现。

原始宋式源码保存在 `artwork/song-room/original.html`，完整未改。Three.js 的 MIT 许可保存在 `public/vendor/THREE-LICENSE.txt`。上一版生成角色的提示词和 Git 历史保留，未使用的发布素材已清理。

截图、临时浏览器检查脚本与日志位于被 Git 忽略的 `output/playwright/`。UI 验收记录见 [验收记录](acceptance.md)。构建和本地预览不等于生产发布，线上发布以 Sites 返回结果为准。

## 资源维护

发布目录只保留当前页面使用的资源。`npm run verify` 检查 HTML/模块/CSS 引用、显式动态资产和许可文件，并拒绝未引用的产物文件。旧素材实验不要直接输出到 `public/`；原始宋式源码与原始素材仍保留在 `artwork/`，不进入发布包。
