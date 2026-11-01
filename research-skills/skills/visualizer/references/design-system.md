# Design System Reference

> 由 `visualizer/SKILL.md` 引用。生成 HTML 时 Read 此文件获取完整设计规范。

## HTML 模板骨架

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{TICKER} — 买方深度研究报告</title>
<style>
/* === 全局 Reset + 变量 === */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg-primary: #0d0d0d;
  --bg-secondary: #1a1a1a;
  --bg-tertiary: #252525;
  --bg-card: #1e1e1e;
  --text-primary: #e8e6e0;
  --text-secondary: #9c9a92;
  --text-tertiary: #6b6963;
  --border: rgba(255,255,255,0.08);
  --border-hover: rgba(255,255,255,0.15);
  --green-500: #5DCAA5;
  --green-600: #0F6E56;
  --green-bg: rgba(93,202,165,0.12);
  --red-500: #E24B4A;
  --red-bg: rgba(226,75,74,0.12);
  --blue-500: #85B7EB;
  --blue-bg: rgba(133,183,235,0.12);
  --amber-500: #EF9F27;
  --amber-bg: rgba(239,159,39,0.12);
  --purple-500: #AFA9EC;
  --purple-bg: rgba(175,169,236,0.12);
  --coral-500: #F0997B;
  --teal-500: #5DCAA5;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}

body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 16px;
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

/* === 通用组件 === */

.section { margin-bottom: 3rem; }
.section-title {
  font-size: 18px; font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.metric-card {
  background: var(--bg-secondary);
  border: 0.5px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1rem 1.25rem;
}
.metric-card .label {
  font-size: 13px; color: var(--text-tertiary);
  margin-bottom: 4px;
}
.metric-card .value {
  font-size: 28px; font-weight: 600;
  line-height: 1.2;
}
.metric-card .value.green { color: var(--green-500); }
.metric-card .value.red { color: var(--red-500); }
.metric-card .value.blue { color: var(--blue-500); }

/* === Badge === */
.badge {
  display: inline-block;
  font-size: 13px; font-weight: 500;
  padding: 4px 14px;
  border-radius: 20px;
  vertical-align: middle;
}
.badge.green { background: var(--green-bg); color: var(--green-500); border: 1px solid rgba(93,202,165,0.3); }
.badge.amber { background: var(--amber-bg); color: var(--amber-500); border: 1px solid rgba(239,159,39,0.3); }
.badge.red { background: var(--red-bg); color: var(--red-500); border: 1px solid rgba(226,75,74,0.3); }

/* === Driver Cards === */
.driver-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.driver-card {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  border-left: 3px solid var(--green-500);
}
.driver-card h3 {
  font-size: 16px; font-weight: 500;
  color: var(--green-500);
  margin-bottom: 8px;
}
.driver-card p {
  font-size: 14px; color: var(--text-secondary);
  line-height: 1.6;
}

/* === Scenario Cards === */
.scenario-grid {
  display: grid;
  grid-template-columns: 1fr 1.3fr 1fr;
  gap: 12px;
  margin-bottom: 1.5rem;
}
.scenario-card {
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  border: 0.5px solid var(--border);
}
.scenario-card.bear { background: var(--red-bg); border-color: rgba(226,75,74,0.2); }
.scenario-card.base { background: var(--blue-bg); border-color: rgba(133,183,235,0.3); }
.scenario-card.bull { background: var(--green-bg); border-color: rgba(93,202,165,0.2); }
.scenario-card .scenario-label {
  font-size: 13px; color: var(--text-secondary);
  margin-bottom: 4px;
}
.scenario-card .scenario-price {
  font-size: 32px; font-weight: 600;
}
.scenario-card.bear .scenario-price { color: var(--red-500); }
.scenario-card.base .scenario-price { color: var(--blue-500); }
.scenario-card.bull .scenario-price { color: var(--green-500); }
.scenario-card .scenario-delta {
  font-size: 14px; margin-top: 4px;
}
.scenario-card.bear .scenario-delta { color: var(--red-500); }
.scenario-card.base .scenario-delta { color: var(--blue-500); }
.scenario-card.bull .scenario-delta { color: var(--green-500); }

/* === Price Range Bar === */
.range-bar-container {
  position: relative;
  height: 40px;
  margin: 1.5rem 0;
}
.range-bar {
  position: absolute;
  top: 50%; left: 0; right: 0;
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  transform: translateY(-50%);
}
.range-segment {
  position: absolute; top: 0; height: 100%;
  border-radius: 2px;
}

/* === Thesis Circle Indicators === */
.thesis-circles {
  display: flex;
  justify-content: center;
  gap: 4rem;
  margin: 2rem 0;
}
.thesis-circle {
  text-align: center;
}
.thesis-circle .circle {
  width: 80px; height: 80px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 28px; font-weight: 600;
  margin: 0 auto 12px;
}
.thesis-circle .circle.primary { background: var(--green-bg); color: var(--green-500); border: 1.5px solid rgba(93,202,165,0.3); }
.thesis-circle .circle.secondary { background: var(--blue-bg); color: var(--blue-500); border: 1.5px solid rgba(133,183,235,0.3); }
.thesis-circle .circle.negative { background: var(--bg-tertiary); color: var(--text-tertiary); border: 1.5px solid var(--border); }
.thesis-circle .desc {
  font-size: 13px; color: var(--text-secondary);
  line-height: 1.5;
}

/* === Data Table === */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.data-table th {
  text-align: left;
  padding: 10px 12px;
  font-weight: 500;
  color: var(--text-tertiary);
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.data-table td {
  padding: 10px 12px;
  border-bottom: 0.5px solid var(--border);
  color: var(--text-primary);
}
.data-table tr:nth-child(even) td {
  background: rgba(255,255,255,0.02);
}
.data-table td.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* === Risk / Kill Criteria === */
.kill-criteria {
  display: flex; flex-direction: column; gap: 8px;
}
.kill-item {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 12px 16px;
  background: var(--red-bg);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--red-500);
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
}
.kill-item .kill-num {
  color: var(--red-500);
  font-weight: 600;
  min-width: 20px;
}

/* === Catalyst Timeline === */
.timeline {
  position: relative;
  padding-left: 24px;
}
.timeline::before {
  content: '';
  position: absolute;
  left: 7px; top: 0; bottom: 0;
  width: 2px;
  background: var(--border);
}
.timeline-item {
  position: relative;
  padding: 0 0 1.5rem 24px;
}
.timeline-item::before {
  content: '';
  position: absolute;
  left: -20px; top: 6px;
  width: 10px; height: 10px;
  border-radius: 50%;
  background: var(--blue-500);
  border: 2px solid var(--bg-primary);
}
.timeline-item .timeline-date {
  font-size: 13px; color: var(--text-tertiary);
  margin-bottom: 4px;
}
.timeline-item .timeline-event {
  font-size: 14px; color: var(--text-primary);
  line-height: 1.5;
}

/* === Chart Container === */
.chart-container {
  position: relative;
  width: 100%;
  height: 320px;
  margin: 1rem 0;
}
.chart-legend {
  display: flex; flex-wrap: wrap;
  gap: 16px; margin-bottom: 8px;
  font-size: 12px; color: var(--text-secondary);
}
.chart-legend-item {
  display: flex; align-items: center; gap: 6px;
}
.chart-legend-dot {
  width: 10px; height: 10px;
  border-radius: 2px;
}

/* === Paragraph === */
.thesis-text {
  font-size: 16px;
  line-height: 1.8;
  color: var(--text-secondary);
  margin-bottom: 2rem;
  max-width: 900px;
}

/* === Header === */
.header {
  margin-bottom: 2.5rem;
  padding-bottom: 2rem;
  border-bottom: 0.5px solid var(--border);
}
.header .company-name {
  font-size: 15px;
  color: var(--text-tertiary);
  margin-bottom: 8px;
}
.header .title-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 4px;
}
.header .ticker {
  font-size: 28px;
  font-weight: 600;
}
.header .date {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-top: 8px;
}
</style>
</head>
<body>
<div class="container">
  <!-- Modules go here -->
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
<script>
  // Chart.js configs go here
</script>
</body>
</html>
```

## Chart.js 暗色主题配置

```javascript
Chart.defaults.color = '#9c9a92';
Chart.defaults.borderColor = 'rgba(255,255,255,0.08)';
Chart.defaults.font.family = "system-ui, -apple-system, sans-serif";
Chart.defaults.font.size = 12;

// 配色
const COLORS = {
  blue: '#85B7EB',
  purple: '#AFA9EC',
  green: '#5DCAA5',
  amber: '#EF9F27',
  coral: '#F0997B',
  red: '#E24B4A',
  teal: '#1D9E75',
  gray: '#6b6963',
  blue_light: 'rgba(133,183,235,0.3)',
  purple_light: 'rgba(175,169,236,0.3)',
  green_light: 'rgba(93,202,165,0.3)',
};
```

## Module 实现模板

### Module 1: Hero Header

```html
<div class="header">
  <div class="company-name">{公司全名}</div>
  <div class="title-row">
    <span class="ticker">{TICKER}</span>
    <span class="badge green">{评级}</span>
  </div>
  <div class="date">报告日期: {日期}</div>
</div>
<div class="section">
  <div class="metric-grid">
    <div class="metric-card">
      <div class="label">当前价格</div>
      <div class="value">${价格}</div>
    </div>
    <div class="metric-card">
      <div class="label">市值</div>
      <div class="value">${市值}</div>
    </div>
    <div class="metric-card">
      <div class="label">Forward P/E</div>
      <div class="value">{PE}x</div>
    </div>
    <div class="metric-card">
      <div class="label">目标价</div>
      <div class="value">${目标价区间}</div>
    </div>
    <div class="metric-card">
      <div class="label">E[回报]</div>
      <div class="value green">+{回报}%</div>
    </div>
  </div>
</div>
```

### Module 4: Scenario Valuation

```html
<div class="section">
  <div class="section-title">估值与场景分析</div>
  <div class="scenario-grid">
    <div class="scenario-card bear">
      <div class="scenario-label">Bear case · {bear_prob}%</div>
      <div class="scenario-price">${bear_price}</div>
      <div class="scenario-delta">{bear_delta}% downside</div>
    </div>
    <div class="scenario-card base">
      <div class="scenario-label">Base case · {base_prob}%</div>
      <div class="scenario-price">${base_range}</div>
      <div class="scenario-delta">{base_delta}</div>
    </div>
    <div class="scenario-card bull">
      <div class="scenario-label">Bull case · {bull_prob}%</div>
      <div class="scenario-price">${bull_price}</div>
      <div class="scenario-delta">+{bull_delta}% upside</div>
    </div>
  </div>
  <!-- Price range bar -->
  <!-- Metric row: 概率加权回报 / R:R / Forward P/E -->
</div>
```

### Module 5: Chart

```html
<div class="section">
  <div class="section-title">{图表标题}</div>
  <div class="chart-legend">
    <span class="chart-legend-item"><span class="chart-legend-dot" style="background: #85B7EB;"></span>Label 1</span>
    <span class="chart-legend-item"><span class="chart-legend-dot" style="background: #AFA9EC;"></span>Label 2</span>
  </div>
  <div class="chart-container">
    <canvas id="chart1"></canvas>
  </div>
  <div class="metric-grid" style="margin-top: 1rem;">
    <!-- 关键 metric cards -->
  </div>
</div>
```

## Chart.js 图表类型指南

| 数据类型 | 推荐图表 | Chart.js type |
|---|---|---|
| 收入分解 | Stacked Bar | bar (stacked) |
| 时间序列增长 | Line | line |
| 业务占比 | Donut | doughnut |
| 估值敏感性 | HTML 热力图 | 纯 HTML table |
| 场景对比 | Grouped Bar | bar |
| SOTP | Horizontal Stacked Bar | bar (horizontal, stacked) |

### Chart.js 暗色主题基础配置

```javascript
new Chart(document.getElementById('chart1'), {
  type: 'bar',
  data: {
    labels: ['2025', '2026E', '2027E', '2028E'],
    datasets: [{
      label: 'Dataset',
      data: [100, 120, 150, 170],
      backgroundColor: COLORS.blue_light,
      borderColor: COLORS.blue,
      borderWidth: 1.5,
      borderRadius: 4,
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#252525',
        titleColor: '#e8e6e0',
        bodyColor: '#9c9a92',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 0.5,
        padding: 12,
        cornerRadius: 8,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#6b6963' },
        border: { display: false },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: {
          color: '#6b6963',
          callback: v => '$' + v + 'B',
        },
        border: { display: false },
      }
    }
  }
});
```

## 数字格式化

```javascript
function fmt(v, unit='') {
  if (Math.abs(v) >= 1e12) return '$' + (v/1e12).toFixed(1) + 'T';
  if (Math.abs(v) >= 1e9) return '$' + (v/1e9).toFixed(1) + 'B';
  if (Math.abs(v) >= 1e6) return '$' + (v/1e6).toFixed(1) + 'M';
  return '$' + v.toLocaleString() + unit;
}
function pct(v) { return (v >= 0 ? '+' : '') + v.toFixed(1) + '%'; }
```

## 质量检查

生成 HTML 后自检：
1. 所有数字与报告正文一致
2. 颜色语义正确（green = 正面，red = 负面）
3. 图表数据正确映射
4. 页面在浏览器中可正常打开
5. 无 JS 报错
