# LC 小游戏厅

https://lc-one.cn/ 的小游戏列表。主页提供两款游戏的独立入口，桌面双列、手机单列；点击卡片即可开始。

| 游戏                      | 地址                   | 玩法                                                             |
| ------------------------- | ---------------------- | ---------------------------------------------------------------- |
| 韭菜生存记 · Trader Quest | `/games/trader-quest/` | 10 万虚拟本金、30 个交易日，买卖股票、使用策略卡、挑战电脑对手   |
| 牛市闯关 · Bull Run       | `/games/bull-run/`     | 像素平台闯关，移动、二段跳、长按连跳、加速，收集筹码并躲开空头熊 |

两款游戏都有「游戏大厅」入口。牛市闯关默认铺满页面，返回入口在游戏底部工具栏中；原有全屏、暂停、重开和触屏操作保留。

## 中英文切换

大厅和两款游戏顶部都有 `EN / 中文` 切换按钮。牛市闯关全屏时按钮在右上角；韭菜生存记的策略卡、指南、事件与结算弹窗内也可切换。

语言偏好使用独立的 `lc-arcade-language` 本地存储键，三个页面共用，刷新和页面跳转后继续生效，同源标签页会同步。切换仅更新界面，不推进交易日、不消耗卡牌，也不重置闯关位置、生命或积分。

`shared/en.mjs` 维护英文文案；`shared/i18n.mjs` 处理语言状态和带数值的文案；`shared/language-ui.mjs` 更新静态文字及动态界面的本地化。中文原文保留为文案键，游戏存档结构不随语言改变。

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

测试覆盖交易规则、策略卡、事件奖惩、存档恢复，以及主页的两个入口、各页面资源路径、游戏返回入口、完整文案覆盖、语言记忆和切换时的进度保留；也检查广告关闭、配置校验、预览环境隔离、重复加载及广告失败时的收起行为。构建先在临时目录准备完整站点，再替换 `dist/`，避免遗留旧根目录下的游戏文件。

## 广告

首页和两款游戏页面的 `<head>` 已加入用户提供的异步 AdSense 自动广告脚本，发布商 ID 为 `ca-pub-1021389829087686`，每页只加载一次。自动广告的开关、投放量、格式和排除区域由 AdSense 后台管理；脚本接入不保证每次访问都有广告。隐私说明位于 `/privacy/`，支持中英文。

`shared/ads-config.mjs` 中的 `enabled` **仅控制额外的手动首页广告位**，当前为 `false`、`homepageSlotId` 留空，不会影响自动广告。首页两个游戏卡片下方的手动广告区域继续隐藏。手动广告加载器会复用已有的自动广告 SDK，避免重复加载；当前不需要提供 `data-ad-slot`。

构建保留首页的 `google-adsense-account` 验证标签，并在 `/ads.txt` 写入该发布商的授权记录。AdSense「隐私权和消息」使用的隐私政策地址为 `https://lc-one.cn/privacy/`；隐私说明需随实际广告供应商、消息设置和数据处理方式同步维护。

广告脚本现已存在于源码 HTML 中，本地 HTTP 预览也可能请求广告。自动化检查只核对脚本配置和模拟加载器，不打开或点击真实广告。关闭自动广告需在 AdSense 后台停用，或移除三个页面中的 SDK 标签后重新发布；修改手动广告位的 `enabled` 不会关闭自动广告。

官方资料：[设置自动广告](https://support.google.com/adsense/answer/9261307)、[ads.txt](https://support.google.com/adsense/answer/12171612)、[隐私披露内容](https://support.google.com/adsense/answer/1348695)、[Google 同意消息](https://support.google.com/adsense/answer/10960768)。

## 目录

```text
index.html                  游戏大厅
home.css                    大厅样式
assets/bull-run-preview.svg  牛市闯关预览插画
games/trader-quest/          韭菜生存记源码及角色素材
games/bull-run/              牛市闯关源码
scripts/build.mjs           静态发布构建
shared/                     共用语言偏好、英文文案和切换控件
shared/ads-config.mjs        AdSense 公开参数及手动首页广告位开关
privacy/                    中英文隐私说明
tests/                      游戏规则、站点集成和双语检查
```

页面使用原生 HTML / CSS / JavaScript，素材随站点发布，无需外部字体或图片服务。首页和两款游戏页面异步加载 Google AdSense 自动广告脚本。

## 部署

沿用 GitHub 仓库 `OrangeManLi/lc-one` 和 Cloudflare Pages 的 `lc-one` 项目。推送至 `main` 后，GitHub Actions 运行校验、测试和构建，将 `dist/` 发布到 https://lc-one.cn/ 。测试、文档和 Git 元数据不包含在发布产物中。

保留已有的 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID` Actions secrets。操作说明见 [GITHUB_GUIDE.md](GITHUB_GUIDE.md)。
