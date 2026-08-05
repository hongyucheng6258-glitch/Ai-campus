<template>
  <WtPageHeader title="数据概览" subtitle="平台运营核心指标" eyebrow="管理后台" />

  <div class="dashboard">
    <!-- 数字卡片行 -->
    <div class="cards">
      <el-card v-for="c in cards" :key="c.label" class="stat-card">
        <div class="stat-value" :style="{ color: c.color }">{{ c.value }}</div>
        <div class="stat-label">{{ c.icon }} {{ c.label }}</div>
      </el-card>
    </div>

    <!-- 双折线图：用户增长 + AI调用趋势 -->
    <el-card class="chart-card">
      <template #header>近30天趋势</template>
      <div ref="trendRef" class="chart" />
    </el-card>

    <!-- 柱状图 + 双饼图 -->
    <div class="chart-row">
      <el-card class="chart-card half">
        <template #header>各模块发布量</template>
        <div ref="moduleRef" class="chart" />
      </el-card>
      <el-card class="chart-card half">
        <template #header>失物状态 / 举报类型</template>
        <div ref="pieRef" class="chart" />
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import WtPageHeader from '../../components/wt/WtPageHeader.vue'
import * as echarts from 'echarts'
import { statsOverview, statsTrend, statsModule, statsPie } from '../../api/stats'
import { chartPalette, seriesColors, chartBase } from '../../utils/chartTheme'

const overview = ref({})
const trendRef = ref()
const moduleRef = ref()
const pieRef = ref()
let charts = []

const cards = computed(() => [
  { label: '总用户数', value: overview.value.totalUsers ?? '-', icon: '👥', color: chartPalette.brand },
  { label: '今日活跃', value: overview.value.todayActiveUsers ?? '-', icon: '⚡', color: chartPalette.success },
  { label: '今日AI调用', value: overview.value.todayAiCalls ?? '-', icon: '🤖', color: chartPalette.accent },
  { label: '待审核内容', value: overview.value.pendingAudits ?? '-', icon: '🕐', color: chartPalette.warning }
])

onMounted(async () => {
  // 数字卡片
  overview.value = await statsOverview()
  // 双折线
  const trend = await statsTrend()
  renderChart(trendRef.value, {
    tooltip: { trigger: 'axis' },
    legend: { data: ['累计用户', 'AI调用量'] },
    xAxis: { type: 'category', data: trend.dates, axisLine: { lineStyle: { color: chartPalette.line } }, axisLabel: { color: chartPalette.ink2 } },
    yAxis: [
      { type: 'value', name: '用户', axisLine: { lineStyle: { color: chartPalette.line } }, axisLabel: { color: chartPalette.ink2 }, splitLine: { lineStyle: { color: chartPalette.line } } },
      { type: 'value', name: '调用', axisLine: { lineStyle: { color: chartPalette.line } }, axisLabel: { color: chartPalette.ink2 }, splitLine: { show: false } }
    ],
    series: [
      { name: '累计用户', type: 'line', smooth: true, data: trend.userGrowth, areaStyle: { color: 'rgba(47,158,138,0.12)' }, color: seriesColors[0] },
      { name: 'AI调用量', type: 'line', smooth: true, yAxisIndex: 1, data: trend.aiCalls, color: seriesColors[1] }
    ],
    grid: { left: 50, right: 50, bottom: 30 }
  })
  // 模块发布量柱状
  const moduleData = await statsModule()
  renderChart(moduleRef.value, {
    tooltip: {},
    xAxis: { type: 'category', data: moduleData.map((d) => d.name), axisLine: { lineStyle: { color: chartPalette.line } }, axisLabel: { color: chartPalette.ink2 } },
    yAxis: { type: 'value', axisLine: { lineStyle: { color: chartPalette.line } }, axisLabel: { color: chartPalette.ink2 }, splitLine: { lineStyle: { color: chartPalette.line } } },
    series: [{ type: 'bar', data: moduleData.map((d) => d.value), color: seriesColors[0], barWidth: 40, itemStyle: { borderRadius: [6, 6, 0, 0] } }],
    grid: { left: 40, right: 20, bottom: 30 }
  })
  // 双饼图
  const pie = await statsPie()
  renderChart(pieRef.value, {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { color: chartPalette.ink2 } },
    series: [
      {
        name: '失物状态', type: 'pie', radius: ['30%', '55%'], center: ['28%', '45%'],
        data: pie.lostStatus, label: { formatter: '{b}: {c}' }, color: seriesColors
      },
      {
        name: '举报类型', type: 'pie', radius: ['30%', '55%'], center: ['74%', '45%'],
        data: pie.reportTypes.length ? pie.reportTypes : [{ name: '暂无举报', value: 0 }],
        label: { formatter: '{b}: {c}' }, color: [...seriesColors].reverse()
      }
    ]
  })
})

// 合并梧桐校园图表基底（文字/提示框/图例色），保证大屏观感统一
function mergeTheme(option) {
  const base = chartBase()
  return {
    ...base,
    ...option,
    textStyle: { ...base.textStyle, ...(option.textStyle || {}) },
    tooltip: option.tooltip ? { ...base.tooltip, ...option.tooltip } : base.tooltip,
    legend: option.legend ? { ...base.legend, ...option.legend } : base.legend,
  }
}

function renderChart(el, option) {
  if (!el) return
  const chart = echarts.init(el)
  chart.setOption(mergeTheme(option))
  charts.push(chart)
  window.addEventListener('resize', () => chart.resize())
}
</script>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}
.stat-card {
  text-align: center;
}
.stat-value {
  font-size: 32px;
  font-weight: 700;
  font-family: var(--font-display);
}
.stat-label {
  margin-top: 8px;
  color: var(--ink-3);
}
.chart-card {
  margin-bottom: 16px;
  border-radius: var(--r-md);
}
.chart-card :deep(.el-card__header) {
  font-weight: 600;
  color: var(--ink);
}
.chart-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.chart {
  height: 320px;
}
</style>
