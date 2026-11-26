# LC 小游戏厅

https://lc-one.cn/ 的小游戏列表。主页提供两款游戏的独立入口，桌面双列、手机单列；点击卡片即可开始。

| 游戏                      | 地址                   | 玩法                                                             |
| ------------------------- | ---------------------- | ---------------------------------------------------------------- |
| 韭菜生存记 · Trader Quest | `/games/trader-quest/` | 10 万虚拟本金、30 个交易日，买卖股票、使用策略卡、挑战电脑对手   |
| 牛市闯关 · Bull Run       | `/games/bull-run/`     | 像素平台闯关，移动、二段跳、长按连跳、加速，收集筹码并躲开空头熊 |

两款游戏都有「游戏大厅」入口。牛市闯关默认铺满页面，返回入口在游戏底部工具栏中；原有全屏、暂停、重开和触屏操作保留。

## 韭菜生存记

- 6 只虚构股票，日 K / 走势与均线，支持持仓和交易记录。
- 每笔交易为 100 股的整数倍，手续费 0.03%（最低 5 元），实行 T+1。
- 先知雷达透视次日涨跌，金钟罩补回一半持仓损失（上限 3,000 元），牛市号角为所选股票次日涨幅额外增加 3.5 个百分点。
- 收盘可接受或跳过老王的涨跌挑战；第 5、10、20 天发放卡牌补给。
- 包含成就、每日战报、电脑对手排名、音效和最终结算。

## 存档

韭菜生存记继续使用原来的 `market-play-v1`、`market-play-best`、`market-play-sound` 本地存储键，原站玩家的进度无需迁移。牛市闯关使用自身的 `pixel-mario-best-v1` 保存最高分，两者互不干扰。存档属于当前浏览器和域名，不包含账号或跨设备同步。

股票、价格、新闻、技能、奖金和对手均为虚构游戏机制，不接入证券账户或实时金融数据。

## 本地开发

需要 Node.js 20+ 和 Python 3，无需安装依赖。

```sh
npm run dev
```

访问 http://127.0.0.1:4173/ 。请通过 HTTP 预览，以便正确加载 JavaScript 模块和根路径资源。

```sh
npm run check
npm test
npm run build
```

17 项测试覆盖交易规则、策略卡、事件奖惩、存档恢复，以及主页的两个入口、各页面资源路径和游戏返回入口。构建先在临时目录准备完整站点，再替换 `dist/`，避免遗留旧根目录下的游戏文件。

## 目录

```text
index.html                  游戏大厅
home.css                    大厅样式
assets/bull-run-preview.svg  牛市闯关预览插画
games/trader-quest/          韭菜生存记源码及角色素材
games/bull-run/              牛市闯关源码
scripts/build.mjs           静态发布构建
tests/                      游戏规则与站点集成检查
```

页面使用原生 HTML / CSS / JavaScript，素材随站点发布，无需外部字体、脚本或图片服务。

## 部署

沿用 GitHub 仓库 `OrangeManLi/lc-one` 和 Cloudflare Pages 的 `lc-one` 项目。推送至 `main` 后，GitHub Actions 运行校验、测试和构建，将 `dist/` 发布到 https://lc-one.cn/ 。测试、文档和 Git 元数据不包含在发布产物中。

保留已有的 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID` Actions secrets。操作说明见 [GITHUB_GUIDE.md](GITHUB_GUIDE.md)。
