# Flower Randomizer

<p align="center">
  <img src="public/flower-randomizer-logo.svg" alt="Flower Randomizer logo" width="108" />
</p>

<h1 align="center">Flower Randomizer</h1>

<p align="center">
  一款基于 <strong>React + Vite</strong> 的生成式花艺创作工具，支持确定性 Seed、模式切换、链接共享与 SVG/PNG 导出。
</p>

<p align="center">
  <a href="#features">功能</a> ·
  <a href="#quick-start">本地运行</a> ·
  <a href="#developer-mode">开发者模式</a> ·
  <a href="#deployment">部署</a> ·
  <a href="#license">授权</a>
</p>

<p align="center">
  GitHub: <a href="https://github.com/unicbm/Flower" target="_blank">https://github.com/unicbm/Flower</a>
</p>

## 预览

![Preview 1](docs/preview-1.svg)
![Preview 2](docs/preview-2.svg)

![Preview 3](docs/preview-3.svg)
![Preview 4](docs/preview-4.svg)

## Features

- Seed-driven generation: 同一组参数可稳定复现同样作品
- 两大主模式：`Bouquet` 与 `Abstract`
- 实时播放自动生成的配乐（支持暂停/继续）
- 一键复制当前状态分享链接（URL 参数中包含作品参数）
- 导出 SVG 与 PNG（适配高分屏缩放）
- 可恢复历史参数：刷新页面后可继续当前作品
- 底部固定展示项目作者与版权信息

## 项目结构

- `src/App.jsx`：页面骨架、交互逻辑、开发者模式开关
- `src/ArtworkCard.jsx`：画布展示与 SVG 渲染容器
- `src/flowerGenerator.js`：花束/抽象画风的作品生成
- `src/musicGenerator.js`：基于作品特征的旋律生成
- `src/shareState.js`：状态序列化与反序列化
- `src/exportArtwork.js`：SVG / PNG 导出逻辑
- `scripts/generate-previews.mjs`：刷新 README 预览图的脚本
- `docs/`：展示图片与社交预览图资源
- `public/`：Logo 等静态资源

## 快速开始

### 运行环境

- Node.js
- npm

### 本地开发

```bash
npm install
npm run dev
```

Windows 下可直接执行：

```bat
start.bat
```

### 构建

```bash
npm run build
```

构建产物默认输出到 `dist/`。

### 更新 README 预览图

```bash
node scripts/generate-previews.mjs
```

## Developer Mode（开发者模式）

`Generator Controls`（参数滑条）默认不显示。

默认开启方式：

- 在链接中添加 `?dev=1`（或 `?developer=true`）即可打开

可关闭方式：

- 访问 `?dev=0`（或 `?developer=false`）可关闭

说明：

- 参数 `?dev=...` 优先级高于浏览器本地存储，支持一次打开后记忆偏好
- 关闭后底部仍保留 GitHub 与版权信息展示

## Deployment

这是一个纯静态前端项目，可部署到任何静态托管平台（Vercel、Cloudflare Pages、GitHub Pages 等）。

## License

© 2026 unicbm. All rights reserved.

## 作者信息

GitHub: <a href="https://github.com/unicbm/Flower" target="_blank">unicbm</a>
