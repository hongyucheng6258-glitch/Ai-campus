# 梧桐校园 · 学生端组件规范（Vue 3 + Element Plus）

> 配套设计原型：`ui-prototype/wutong-campus-ui.html`
> 适用工程：`web/frontend/student`（Vue 3.4 / Vite 5 / Element Plus 2.7.5 / Pinia / vue-router 4）
> 设计主张：**暖色编辑风「梧桐校园」**——梧桐绿（智慧/成长）+ 暖珊瑚（能量/AI 高亮），奶油暖纸底色，Fraunces 展示衬线 + Plus Jakarta Sans 界面字体。刻意避开套路化的「紫蓝渐变 + 深色发光」AI 审美。

---

## 1. 设计原则

| 原则 | 落地方式 |
|---|---|
| **单强调色 + 品牌色** | 全局只用梧桐绿(品牌) 与暖珊瑚(强调) 两色，避免多色噪点（60-30-10：中性底 60% / 文字边框 30% / 强调 10%） |
| **4pt 间距节奏** | 间距 token 为 4/8/12/16/24/32/48/64，杜绝随手写魔法数 |
| **可访问性优先** | WCAG AA 对比、44px 触控目标、`:focus-visible` 焦点环、`prefers-reduced-motion` 降级 |
| **状态完整** | 每个交互组件必备 默认 / hover / active / focus / disabled / loading，数据区必备 加载(骨架)/空/错误 |
| **明暗双主题** | 全部变量走 `data-theme`，不写死颜色；换肤零改业务代码 |
| **指数缓动微交互** | 仅动 `transform`/`opacity`，曲线 `cubic-bezier(0.16,1,0.3,1)` |

---

## 2. 新增文件清单

```
web/frontend/student/
├── index.html                         # 已注入字体 link
├── src/
│   ├── main.js                       # 已注入 3 个样式文件
│   ├── styles/
│   │   ├── tokens.css                # 设计 Token（明/暗）★ 唯一真相源
│   │   ├── base.css                  # reset / 字体 / 排版 / 滚动条 / 可访问性
│   │   └── element-theme.css         # 覆盖 Element Plus CSS 变量
│   └── components/wt/                # 品牌组件库（前缀 Wt）
│       ├── WtButton.vue
│       ├── WtTag.vue
│       ├── WtCard.vue
│       ├── WtInput.vue
│       ├── WtAvatar.vue
│       ├── WtTabs.vue
│       ├── WtQuickEntry.vue
│       ├── WtHero.vue
│       ├── WtFeedCard.vue
│       ├── WtEmptyState.vue
│       └── WtThemeToggle.vue
```

---

## 3. 设计 Token

### 3.1 色彩（OKLCH，位于 `tokens.css`）

| 语义 | 变量 | 明主题 | 说明 |
|---|---|---|---|
| 品牌主色 | `--brand` | `oklch(53% 0.12 168)` | 梧桐绿，主操作/链接/激活 |
| 品牌深 | `--brand-strong` | `oklch(45% 0.12 168)` | 渐变末端、按压态 |
| 品牌浅底 | `--brand-soft` | `oklch(95% 0.045 168)` | 浅色块、soft 按钮底 |
| 强调主色 | `--accent` | `oklch(68% 0.17 48)` | 暖珊瑚，AI 行动/重要 CTA |
| 强调深 | `--accent-strong` | `oklch(60% 0.17 48)` | 渐变末端 |
| 成功 | `--success` | `oklch(58% 0.13 150)` | 审核通过 / 报名中 |
| 警告 | `--warning` | `oklch(72% 0.15 75)` | 待审核 / 寻物 |
| 错误 | `--error` | `oklch(58% 0.18 25)` | 驳回 / 校验失败 |
| 纸面底 | `--paper` | `oklch(98% 0.012 95)` | 页面背景 |
| 表面 | `--surface` | `oklch(100% 0 0)` | 卡片/弹层背景 |
| 次表面 | `--surface-2/3` | `oklch(97%/94%)` | 输入框/分区底 |
| 文字 | `--ink / --ink-2 / --ink-3` | `oklch(26%/45%/62%)` | 主/次/辅助文字 |
| 描边 | `--line / --line-strong` | `oklch(90%/83%)` | 边框/强边框 |
| 圆角 | `--r-xs…--r-pill` | 6→999px | 统一圆角档位 |
| 阴影 | `--shadow-sm/md/lg` | 三层 | 克制的层次 |
| 缓动 | `--ease-out` | `cubic-bezier(0.16,1,0.3,1)` | 入场缓动 |

> 暗主题由 `:root[data-theme="dark"]` 自动切换，组件无需感知。

### 3.2 间距 / 字阶 / 字体

| 组 | Token | 值 |
|---|---|---|
| 间距(4pt) | `--s-1…--s-9` | 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 px |
| 字阶 | `--fs-display…--fs-cap` | 2.5 / 1.75 / 1.375 / 1.125 / 1 / .875 / .75 / .6875 rem |
| 字体 | `--font-sans` / `--font-display` | Plus Jakarta Sans(+中文系统字体) / Fraunces |

### 3.3 与 Element Plus 变量映射（换肤）

`element-theme.css` 已把下列 EP 变量指向梧桐校园 token，**现有 `el-*` 组件自动换肤**，无需改业务代码：

| Element Plus 变量 | 映射目标 |
|---|---|
| `--el-color-primary` / `-dark-2` / `-light-3/5/7/8/9` | `--brand` 系列 |
| `--el-color-success` / `-warning` / `-danger` / `-error` | `--success` / `--warning` / `--error` |
| `--el-text-color-*` | `--ink` 系列 |
| `--el-border-color*` | `--line` 系列 |
| `--el-fill-color*` / `--el-bg-color*` | `--surface` / `--paper` 系列 |
| `--el-border-radius-base/small/round` | 10 / 8 / 999 px |
| `--el-font-family` | `--font-sans` |

---

## 4. 组件 API

> 通用约定：全部组件 `import` 路径为 `@/components/wt/WtXxx.vue`（或相对路径 `../components/wt/WtXxx.vue`）。图标统一用内联 `<svg>`，不依赖外部图标库。

### WtButton — 按钮
| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `type` | `primary\|accent\|soft\|ghost` | `primary` | 视觉变体 |
| `size` | `md\|sm` | `md` | 尺寸 |
| `block` | `Boolean` | `false` | 占满宽度 |
| `loading` | `Boolean` | `false` | 转圈并禁用 |
| `disabled` | `Boolean` | `false` | 禁用 |
| **Event** | `click` | — | 点击（禁用/加载时不触发） |

```vue
<WtButton type="primary" @click="save">保存</WtButton>
<WtButton type="accent" :loading="submitting">提交 AI 任务</WtButton>
<WtButton type="ghost" size="sm">取消</WtButton>
```

### WtTag — 状态标签
| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `type` | `brand\|accent\|success\|warning\|neutral` | `brand` | 配色 |
| `dot` | `Boolean` | `false` | 前置圆点 |

```vue
<WtTag type="success" dot>报名中</WtTag>
<WtTag type="warning">待审核</WtTag>
```

### WtCard — 卡片容器
| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `hover` | `Boolean` | `true` | 悬浮浮起 |
| `flush` | `Boolean` | `false` | 图文贴边（去内边距+溢出隐藏） |
| `pad` | `String` | `''` | 覆盖内边距，如 `var(--s-4)` |

### WtInput — 表单输入（label 上、error 下）
| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `modelValue` | `String\|Number` | `''` | 支持 `v-model` |
| `label` | `String` | — | 上方标签 |
| `error` | `String` | — | 非空即红框+红字提示 |
| `disabled` | `Boolean` | `false` | 禁用 |
| `size` | `md\|sm` | `md` | 尺寸 |
| **Event** | `update:modelValue` | — | 输入同步 |

```vue
<WtInput v-model="title" label="活动标题" placeholder="给活动起个名字"
         :error="errs.title" />
```

### WtAvatar — 头像
| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `name` | `String` | `''` | 无图时取末字作首字母 |
| `src` | `String` | `''` | 有图则显示图片 |
| `size` | `sm\|md\|lg\|Number` | `md` | 或传像素数字 |

### WtTabs — 分段标签栏（胶囊）
| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `modelValue` | `String\|Number` | `''` | v-model |
| `options` | `{value,label}[]` | `[]` | 选项 |
| **Event** | `update:modelValue` / `change` | — | 选中变化 |

```vue
<WtTabs v-model="tab" :options="[{value:'activity',label:'活动'},{value:'idle',label:'闲置'}]" />
```

### WtQuickEntry — 快捷入口磁贴
| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `title` | `String` | — | 标题 |
| `desc` | `String` | — | 描述 |
| `variant` | `Number(1-6)` | `1` | 图标底色变体 |
| **Slot** | `icon` | — | 图标 SVG |
| **Event** | `click` | — | 点击 |

### WtHero — 门户 Hero
| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `greet` / `title` / `subtitle` | `String` | — | 文案 |
| `aiPlaceholder` | `String` | 内置 | AI 输入框占位 |
| `stats` | `{value,label}[]` | `[]` | 数据条 |
| `spark` | `String` | `''` | 右下角角标文案 |
| **Event** | `ai-submit` | — | 回车/点击提交，带 query |
| **Slot** | 默认 | — | Hero 内追加内容 |

### WtFeedCard — 推荐流条目
| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `title` | `String` | — | 标题 |
| `meta` | `String[]` | `[]` | 元信息（以 `·` 分隔） |
| `tag` | `{type,label}` | `null` | 状态标签 |
| `price` | `String` | — | 价格（替代标签右侧） |
| `actionLabel` | `String` | `查看` | 操作按钮文案 |
| **Slot** | `thumb` | — | 左侧缩略图/图标 |
| **Event** | `action` | — | 操作按钮点击 |

### WtEmptyState — 空/加载/错误三态
| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `type` | `empty\|loading\|error` | `empty` | 状态 |
| `title` / `description` | `String` | — | 文案 |
| `actionLabel` | `String` | — | 操作按钮 |
| **Slot** | `icon` | — | 自定义图标（empty/error） |
| **Event** | `action` | — | 操作按钮点击 |

```vue
<WtEmptyState type="loading" v-if="loading" />
<WtEmptyState v-else-if="!list.length" title="还没有内容" description="发布第一条动态试试"
              action-label="去发布" @action="goPublish" />
<WtEmptyState v-else-if="error" type="error" :title="error" action-label="重试" @action="reload" />
```

### WtThemeToggle — 明暗切换
写 `<html data-theme>` 并持久化 `localStorage['wutong-theme']`；挂载即读取。**Event** `change(theme)`。

---

## 5. 集成步骤（已为你改好，可跳过）

1. `src/main.js`：在 `import 'element-plus/dist/index.css'` **之后**引入
   ```js
   import './styles/tokens.css'
   import './styles/base.css'
   import './styles/element-theme.css'
   ```
2. `index.html`：`<head>` 注入字体 preconnect + Fraunces / Plus Jakarta Sans（离线自动回退系统字体，不影响功能）。
3. 使用：`import WtButton from '@/components/wt/WtButton.vue'`（若未配 `@` 别名，用相对路径）。

---

## 6. 可访问性与状态规范（验收必查）

- [ ] 所有可点击元素 ≥ 44px 触控目标（按钮 `min-height:44px` 已内置）
- [ ] 键盘可达：`:focus-visible` 焦点环清晰，Tab 顺序合理
- [ ] 色彩不单独表意：状态同时用「色 + 文字/图标」
- [ ] 表单：label 关联、错误 `role="alert"`、占位符对比度达标
- [ ] 数据区必备 加载(骨架)/空/错误 三态（用 `WtEmptyState`）
- [ ] 动效遵守 `prefers-reduced-motion`（`base.css` 已全局降级）
- [ ] 图片 `alt`、装饰 SVG `aria-hidden`

---

## 7. 渐进式落地建议

不必一次性重写现有页面，按优先级推进：

1. **零成本换肤**：接好样式后，现有 `el-button`/`el-card`/`el-input` 已变梧桐绿——先让整站「统一调性」。
2. **新页面用 Wt\***：门户首页、AI 助手页等新建页直接用组件库，形成样板。
3. **旧页面局部替换**：把纯展示卡、按钮、标签逐步换成 `WtCard/WtButton/WtTag`，保留 `el-table`/`el-dialog` 等复杂组件（已被主题覆盖）。
4. **状态补齐**：列表/表单接入 `WtEmptyState` 的加载/空/错误态，提升完成度。

---

## 8. 演示前 Checklist

- [ ] `npm install && npm run dev` 正常，无样式 404
- [ ] 明/暗切换（WtThemeToggle）两端对比正常，无纯黑大面积
- [ ] `el-*` 与原生 `Wt*` 视觉协调，无「两套皮肤打架」
- [ ] 移动窄屏（≤820px）门户两栏折叠为单栏、侧栏收起
- [ ] 关键列表具备 loading/空/错误 三态演示数据
