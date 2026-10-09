# Murphy 个人站点

从现有 Sites 源码仓库迁入，保留原有页面、交互、猫咪动画与原始素材。采用原生 HTML、CSS、JavaScript，无运行时 npm 依赖。

## 项目与改造文档

功能升级和重构前，请阅读 [项目文档导航](docs/README.md)，其中包含项目现状、模块与素材契约、升级建议和验收清单。

## 本地开发

需要 Node.js 22 或更高版本。

```sh
npm ci
npm run dev
```

访问 http://127.0.0.1:5173。编辑源码后刷新页面查看变化；开发服务不包含自动热更新。使用 `npm run dev -- --port 3000` 指定端口。

## 检查和构建

```sh
npm run check
npm run build
npm run preview
```

`check` 检查 JavaScript 语法，`build` 将源码和静态资源复制到 `dist/`，`preview` 在本地提供构建产物。没有 TypeScript，因此没有 typecheck。UI、响应式布局和交互需要人工验证。

## 工程结构

- `src/index.html`：页面结构与元信息。
- `src/styles.css`：页面样式。
- `src/main.js`：页面交互。
- `src/pet.js`、`src/pet.css`：猫咪动画逻辑与样式。
- `public/`：图片、动画图集及图集描述文件。
- `artwork/pet-strips/`：猫咪动画原始素材。
- `scripts/`：开发服务和构建脚本。
- `tools/prepare_pet_assets.py`：可选的原始素材图集处理工具。
- `.openai/hosting.json`：原 Sites 项目关联，静态输出目录为 `dist`。

构建会重新生成 `dist/`，请修改 `src/` 或 `public/`，不要直接修改产物。`dist/` 可由任意静态服务器托管。本地构建不会更新线上站点。

## 可选：重新处理猫咪图集

现有图集已包含在 `public/pet/` 中，开发和构建不需要 Python。若需要重新处理已有素材：

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-assets.txt
python tools/prepare_pet_assets.py --sources artwork/pet-strips --out public/pet --qa .asset-qa
npm run build
```

该工具仅处理已有图片，不调用图片生成 API。

原站点：https://murphy-makes-things.murphydeng.chatgpt.site
