---
name: visualizer
description: 将投研报告可视化为 Obsidian 可读的内联 HTML 版本。在 markdown 中直接嵌入 div + inline style + 内联 SVG，阅读模式渲染。
---

# Research Report Visualizer

在研究报告 markdown 中插入内联 HTML 可视化组件，Obsidian 阅读模式（Ctrl+E）直接渲染。

## 触发条件

用户说"可视化"/"visualize"/"做成网页"/"加上图表" + 指定一份研究报告

## 约束（硬性）

- **零 iframe** — Obsidian 会 JS 崩溃
- **零 `<script>`** — Obsidian 不执行
- **零 `<style>` 块** — 不稳定
- 所有样式写 `style="..."`
- 图表用**内联 SVG**（`<svg viewBox="0 0 680 H">`）
- 报告正文一个字不改，只在适当位置插入 HTML 块
- HTML 块前后保留空行

## 工作流

1. 复制原稿为 `{ticker}-report-visual.md`（原稿不动）
2. Read 原稿，提取关键数据
3. 在对应章节位置插入内联 HTML 可视化
4. 验证：零 iframe / 零 script / 零 style 块

## 亮色主题配色

| 用途 | 色值 |
|---|---|
| 卡片背景 | `#f5f5f0` |
| 白色卡片 | `#ffffff` |
| 主文字 | `#1a1a1a` |
| 次文字 | `#444`（不要用 #6b6b65，太淡） |
| 绿/成功 | 背景 `#E1F5EE` 文字 `#0F6E56` |
| 蓝/信息 | 背景 `#E6F1FB` 文字 `#0C447C` |
| 红/危险 | 背景 `#FCEBEB` 文字 `#A32D2D` |
| 黄/警告 | 背景 `#FAEEDA` 文字 `#854F0B` |
| 紫 | 背景 `#EEEDFE` 文字 `#534AB7` |
| 边框 | `rgba(0,0,0,0.08)` |

## 排版

- 最小字号 **12px**（不要 11px）
- 卡片标签 12px，卡片数值 20px+，正文 14px
- font-weight: 500 或 600（不要 700）
- `font-family:system-ui,sans-serif`（SVG 内也要写）
- opacity 最低 0.85（不要 0.7）

## 可视化组件库

| 组件 | 实现 | 用于 |
|---|---|---|
| Metric 卡片 | div flex/grid | 价格/市值/PE/目标价 |
| 场景卡片 | div grid 3列 | Bear/Base/Bull |
| Range bar | 内联 SVG | 价格区间 + E[P] 标注 |
| 驱动力卡片 | div + `border-left:3px solid` | 核心论点 |
| 圆形指示器 | div `border-radius:50%` | 赚哪种钱 |
| 时间轴 | div + 左边线 + 圆点 | Catalyst / 里程碑 |
| Kill Criteria | div + 左红边框 | 不可协商条件 |
| 柱状图 | SVG `<rect>` | 收入/FCF/UFCF |
| 折线图 | SVG `<polyline>` | 增速趋势 |
| 柱+线混合 | SVG rect + polyline | Cloud 收入+YoY |
| 散点/气泡 | SVG `<circle>` | Comps PEG |
| 横向柱图 | SVG rect 水平 | SOTP 预期差 |
| 瀑布图 | SVG rect 浮动 | EPS bridge |
| Treemap 色块 | div flex 按比例宽度 | 收入结构 |
| 风险矩阵 | SVG circle 散点 | 概率×影响 |
| 技术栈对比 | SVG 嵌套 rect | 垂直整合 vs 竞品 |
| 卖方价格轴 | SVG line + scatter | 目标价对比 |
| 对比卡片 | div grid | 资产负债表 YoY |

## 输出

`workspace/research/synthesis/{ticker}-report-visual.md`
