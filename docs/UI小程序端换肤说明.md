# 小程序端 · 梧桐校园换肤说明

> 与 Web 学生端、管理后台共用同一套「梧桐校园」设计语言：梧桐绿（品牌）+ 暖珊瑚（强调）+ 暖纸底，刻意避开原「校蓝 #2B5AED + 紫蓝渐变」套路审美。

## 1. 改了什么

| 对象 | 原值（校蓝） | 现值（梧桐绿） |
| --- | --- | --- |
| 全局主色 / 按钮 / 激活态 | `#2b5aed` | `#2f9e8a` |
| 渐变浅端（banner/个人页） | `#6f9bff` / `#5b86f5` | `#8fcfc0` / `#7fc7b6` |
| 浅蓝底（标签/头像） | `#ecf2ff` | `#e6f4f0` |
| 禁用按钮 | `#a0b8f5` | `#a9cfc6` |
| FAB 阴影 | `rgba(43,90,237,.35)` | `rgba(47,158,138,.35)` |
| 冷灰表面/边框 | `#f5f7fa` / `#ebeef5` | `#f3f0ea` / `#e7e3d9` |
| `app.json` 导航栏背景 | `#2B5AED` | `#236b5d` |
| `app.json` window 背景 | `#f5f7fa` | `#faf7f1` |
| `app.json` tabBar 未选中/选中 | `#909399` / `#2B5AED` | `#9a9ea4` / `#236b5d` |

覆盖范围：全局 `app.wxss` + 全部主包页面（首页/我的/消息/登录/公告）+
全部子包页面（活动/闲置/失物/AI 学习中心）+ 公共组件（chat-bubble、item-card）。
共批量替换 **24 个 wxss、102 处**，并已脚本校验「零旧校蓝残留」。

## 2. 设计 Token（`styles/wutong.wxss`）

静态色值 + 工具类（WXSS 对 CSS 变量支持因基础库版本而异，核心组件用静态值，变量仅作可选能力）。

```css
page {
  --wt-brand: #2f9e8a;        /* 梧桐绿（品牌） */
  --wt-brand-strong: #236b5d; /* 深绿（导航栏/FAB） */
  --wt-brand-light: #8fcfc0;  /* 浅绿（渐变端） */
  --wt-brand-soft: #e6f4f0;   /* 浅绿底（标签） */
  --wt-accent: #e9784f;       /* 暖珊瑚（强调 / AI 高亮） */
  --wt-accent-soft: #fbe6dc;
  --wt-paper: #faf7f1;        /* 暖纸底 */
  --wt-surface: #ffffff;
  --wt-ink: #35393d;          /* 主文字 */
  --wt-ink-2: #5b6066;
  --wt-ink-3: #9a9ea4;
  --wt-line: #e7e3d9;
  --wt-success: #4ca46a;
  --wt-warning: #e0a93f;
  --wt-error: #d9543f;
}
```

可选工具类（页面按需选用）：`.wt-gradient`、`.wt-sec-title`、`.wt-pill`、`.wt-divider`。

## 3. 接入方式

- `app.wxss` 顶部已 `@import './styles/wutong.wxss';`，全局 `.card / .btn-primary / .tag* / .empty` 已重皮肤，**所有页面自动继承**。
- 导航栏 / tabBar 颜色在 `app.json` 的 `window` 与 `tabBar` 中统一配置。
- 新页面优先复用全局类；需要品牌渐变/胶囊标签时加 `.wt-*` 类即可。

## 4. 与三端一致性

| 端 | 换肤机制 |
| --- | --- |
| 学生 Web 端 | `tokens.css`(OKLCH 变量) + `element-theme.css` + `Wt*` 组件 |
| 管理后台 | 同套 token + `chartTheme.js`(ECharts 梧桐绿配色) |
| 微信小程序 | `wutong.wxss`(静态色值 + 工具类) + `app.json` 配色 |

三端主色均为梧桐绿 `#2f9e8a` / 深绿 `#236b5d`，强对比、WCAG AA 友好。
