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

- 所有海报生成在浏览器本地完成，没有真实 AI API 调用，不需要密钥。
- 本机收藏使用 IndexedDB，最多 24 个配方。重复保存更新顺序；满额时提示用户主动删除，不覆盖旧作。
- 收藏不跨设备同步，清除浏览器网站数据会移除收藏。
- 分享链接包含短句和生成参数，请勿填入不希望公开的内容。
- 浏览器禁用存储时仍可生成、分享和下载。

## 结构与素材

模块职责见 [项目现状](project-overview.md)，主视觉原生生成记录见 [图片素材](image-assets.md)，调研见 [dev 重设计](redesign-dev.md)。

旧 `artwork/pet-strips/`、`public/pet/`、`src/pet.js`、`src/pet.css` 与 `tools/prepare_pet_assets.py` 保留为上一版角色素材及实现参考，当前页面不加载。处理旧素材的可选 Python 依赖见 `requirements-assets.txt`；网站开发和构建不需要 Python。

本版浏览器检查截图和临时验收脚本存放于被 Git 忽略的 `output/playwright/`。UI 验收记录见 [验收清单](acceptance.md)。
