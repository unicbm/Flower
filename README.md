# Flower Randomizer

中文 | English

## 中文简介

`Flower Randomizer` 是一个基于 `React` 和 `Vite` 的随机花束生成器。每次生成都会基于一个随机种子创建新的花艺画面，并支持通过链接分享当前作品，以及导出为 `SVG` 或 `PNG`。

## English Overview

`Flower Randomizer` is a small `React` + `Vite` app for generating randomized floral artwork. Each bouquet is produced from a seed, can be shared through the URL, and can be exported as `SVG` or `PNG`.

## 功能 Features

- 随机生成新的花束构图 / Generate a new bouquet composition
- 通过链接恢复和分享当前作品 / Restore and share the current artwork through the URL
- 导出为 `SVG` 或 `PNG` / Export artwork as `SVG` or `PNG`
- 轻量前端项目，无后端依赖 / Lightweight frontend-only project with no backend dependency

## 本地运行 Local Development

### 环境要求 Requirements

- `Node.js`
- `npm`

### 安装与启动 Setup

```bash
npm install
npm run dev
```

默认情况下，Vite 会启动本地开发服务器。  
By default, Vite starts a local development server.

在 Windows 上也可以直接运行：  
On Windows, you can also run:

```bat
start.bat
```

## 构建 Build

```bash
npm run build
```

构建结果会输出到 `dist/`。  
The production build is written to `dist/`.

## 项目结构 Project Structure

```text
src/
  App.jsx                Main app shell and interactions
  ArtworkCard.jsx        Artwork rendering
  flowerGenerator.js     Bouquet generation logic
  exportArtwork.js       SVG/PNG export helpers
  shareState.js          Share-link serialization and parsing
```

## 部署 Deployment

这是一个静态前端项目，可以部署到任意支持静态站点的平台，例如 `Vercel`、`Cloudflare Pages` 或 `GitHub Pages`。  
This is a static frontend app and can be deployed on any static hosting platform such as `Vercel`, `Cloudflare Pages`, or `GitHub Pages`.

## License

暂未声明许可证。  
No license has been declared yet.
