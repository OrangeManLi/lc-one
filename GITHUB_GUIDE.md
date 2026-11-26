# 开发与发布

此项目已连接 GitHub 仓库 `OrangeManLi/lc-one`，由 GitHub Actions 自动部署到 Cloudflare Pages 的 `lc-one` 项目，线上域名为 https://lc-one.cn/ 。

## 发布改动

先在本地运行校验，再提交并推送需要发布的文件：

```sh
npm run check
npm test
npm run build
git status --short
git add index.html home.css games/ assets/ favicon.svg
# 如果修改了其他文件，也应将对应文件加入提交。
git commit -m "Describe the game change"
git push origin main
```

在 GitHub 仓库的 **Actions** 页面查看 `Deploy to Cloudflare Pages` 工作流。工作流依次运行语法检查、规则测试、静态构建和部署。成功后刷新站点查看最新内容。

## 发布内容

`scripts/build.mjs` 把大厅页面、样式、预览插画、两个游戏目录和缓存头配置复制到 `dist/`。构建会替换旧发布目录，避免已迁移文件残留。测试、文档和 Git 元数据不会发布。不要直接把整个仓库作为发布目录。

## 配置

GitHub 仓库 **Settings → Secrets and variables → Actions** 中需要已有的：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

无需将这些值写进项目文件。自定义域名继续由现有 Cloudflare Pages 项目管理。

## 排查

- 检查失败：先运行 `npm run check` 和 `npm test`，修复失败后再提交。
- 部署失败：查看 Actions 中 Wrangler 的错误输出，核对现有 Cloudflare 权限与项目配置。
- 新代码未显示：确认对应提交的工作流已成功，再强制刷新页面。
- 本地空白页：使用 `npm run dev`，不要以 `file://` 直接打开 JavaScript 模块页面。
