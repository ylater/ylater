# dev 重设计验收记录

日期：2026-10-09。分支：dev。用户已明确授权本版浏览器 UI 验收。

## 自动化结果

| 检查 | 结果 |
| --- | --- |
| `npm run check` | 活动 JS/ES modules 与构建、服务脚本语法通过 |
| `npm test` | 4 项单元测试通过：Unicode 分享往返、无效参数约束、空/超长输入、确定性种子 |
| `npm run build` | 静态产物成功生成 |
| `npm run verify` | 9 个页面引用资源、生成 PNG、module MIME、预览响应及缺失资源 404 通过 |
| 浏览器主链路 | 24 项检查通过；直接访问最终 `dist` 预览，非只验证开发源码 |
| 浏览器边界 | 9 项检查通过；收藏容量、重复保存、长文本、禁用存储、键盘焦点、同源资源 |
| axe-core 4.14.0 | WCAG A/AA 自动规则：桌面初始、展开内容/收藏、手机展开、手机弹窗四种状态，均 0 violations |
| 页面异常 | 上述可访问性和受限存储检查中未捕获到 pageerror；控制台初始检查 0 errors / warnings |
| `git diff --check` | 通过 |

axe 的 color-contrast incomplete 已逐项查看：仅为箭头、构图符号和重新混合符号等非文字字符。对应前景/背景实算对比度为 14.83:1、12.08:1、9.40:1，与已检查的控制文字采用同色；未把 incomplete 当作自动通过或完整无障碍认证。

## 浏览器操作覆盖

- 核验橘点击反馈。
- 关于弹窗打开、Esc 关闭、焦点恢复、Tab 在弹窗内循环。
- 短句、构图、配色、强度修改后画面与可访问描述同步。
- 下载真实 PNG，打开导出文件查看；1500 × 1800。
- IndexedDB 收藏、刷新后恢复相同配方、删除。
- 分享链接包含 Unicode/emoji/特殊字符，可还原同一配方；修改配方后清理旧 URL 参数。
- 剪贴板不可用时展示可选择复制的 URL。
- 一站式理赔顺序、错误提示、三条服务记录、撤回与重置。
- 企业内部项目标识。
- 320、390、768、1024、1440px 无横向溢出。
- 减少动效关闭角色动画，键盘方向键能调整强度。
- 本机收藏 24 条上限，满额不自动删旧作；相同配方再次保存不重复。
- IndexedDB 不可用时明确反馈，下载仍可用，无未捕获异常。
- 当前页面只加载同源资源，不加载在线模型或第三方字体。

## 视觉检查

已实际查看桌面完整页、手机完整页、手机弹窗、导出 PNG 和最长中文海报。主视觉透明边缘、标题层级、深浅区域、控件布局与海报文字均检查。新角色原图已查看，素材与提示词见 `image-assets.md`。

本地证据在 Git 忽略目录 `output/playwright/`：

- `hero-final.png`、`desktop-final.png`、`mobile-final.png`
- `mobile-dialog.png`、`downloaded-poster.png`、`long-text-poster.png`
- `studio-orange.png`、`studio-blue.png`、`storage-unavailable.png`
- `ui-results.log`、`edge-results.log`、`accessibility-results.log`、`contrast-review.log`

## 范围与限制

使用 Chromium/Playwright 的桌面与移动视口进行验收，未声称真实 iPhone/Safari 或完整屏幕阅读器认证。没有生产发布，www.ylater.com 的线上版本不属于本次本地验收。收藏是浏览器本机数据，不是云端数据库。程序海报不是真实在线 AI 推理。
