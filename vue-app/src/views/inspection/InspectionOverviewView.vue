<template>
  <section class="inspection-overview">
    <header class="insp-page-header">
      <div>
        <h1 class="page-title">巡检驾驶舱</h1>
        <p>面向运营页面质量的自动巡检总览。当前为纯页面演示 POC，数据来自内置 mock 层，暂未连接真实接口。</p>
      </div>
      <button class="primary-action" type="button" @click="goWorkorders">查看工单明细</button>
    </header>

    <section class="insp-kpi-grid" aria-label="巡检概览指标">
      <article class="insp-kpi-card g-blue">
        <span>整体健康率</span>
        <strong>{{ stats.healthyRate }}<i>%</i></strong>
        <small>近 7 日平均</small>
      </article>
      <article class="insp-kpi-card g-cyan">
        <span>巡检任务</span>
        <strong>{{ stats.tasksTotal }}</strong>
        <small>规则执行总数</small>
      </article>
      <article class="insp-kpi-card g-indigo">
        <span>今日巡检次数</span>
        <strong>{{ stats.runsToday }}</strong>
        <small>含运行中</small>
      </article>
      <article class="insp-kpi-card g-purple">
        <span>待处理工单</span>
        <strong>{{ stats.openWorkorders }}</strong>
        <small>待处理 + 处理中</small>
      </article>
    </section>

    <div class="insp-overview-cols">
      <section class="insp-card insp-trend-card" aria-label="健康率趋势">
        <div class="insp-card-head">
          <h2>健康率趋势</h2>
          <p>近 7 日整体健康率（%）</p>
        </div>
        <div class="insp-trend-chart">
          <svg :viewBox="`0 0 ${chartW} ${chartH}`" preserveAspectRatio="none" class="insp-trend-svg" role="img" aria-label="健康率趋势折线图">
            <defs>
              <linearGradient :id="gradId" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#3370ff" stop-opacity="0.18" />
                <stop offset="100%" stop-color="#3370ff" stop-opacity="0" />
              </linearGradient>
            </defs>
            <line v-for="g in gridLines" :key="g" :x1="padL" :x2="chartW - padR" :y1="g" :y2="g" class="insp-grid" />
            <path :d="areaPath" :fill="`url(#${gradId})`" stroke="none" />
            <path :d="linePath" fill="none" stroke="#3370ff" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
            <circle v-for="(p, i) in chartPoints" :key="i" :cx="p.x" :cy="p.y" r="3.5" fill="#fff" stroke="#3370ff" stroke-width="2" />
            <text v-for="(p, i) in chartPoints" :key="`t${i}`" :x="p.x" :y="p.y - 10" class="insp-trend-val">{{ p.rate }}</text>
            <text v-for="(d, i) in trend" :key="`d${i}`" :x="xOf(i)" :y="chartH - 8" class="insp-trend-date">{{ d.date }}</text>
          </svg>
        </div>
      </section>

      <section class="insp-card insp-rank-card" aria-label="站点异常排行">
        <div class="insp-card-head">
          <h2>站点异常排行</h2>
          <p>按异常数排序（Top 5）</p>
        </div>
        <ul class="insp-rank-list">
          <li v-for="(site, i) in ranking" :key="site.id" class="insp-rank-item">
            <span class="insp-rank-no" :data-top="i < 3">{{ i + 1 }}</span>
            <div class="insp-rank-body">
              <div class="insp-rank-row">
                <strong>{{ site.name }}</strong>
                <span class="insp-rank-anomaly">{{ site.anomalyCount }} 处异常</span>
              </div>
              <div class="insp-rank-bar">
                <span :style="{ width: site.healthRate + '%' }" :data-low="site.healthRate < 80"></span>
              </div>
              <div class="insp-rank-meta">
                <span>{{ site.pageCount }} 个页面</span>
                <span>健康率 {{ site.healthRate }}%</span>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <section class="insp-card insp-recent-card" aria-label="最近工单">
      <div class="insp-card-head">
        <h2>最近工单</h2>
        <button class="text-action" type="button" @click="goWorkorders">全部工单 →</button>
      </div>
      <div class="insp-table-scroll">
        <table class="insp-data-table">
          <thead>
            <tr>
              <th>工单</th>
              <th>标题</th>
              <th>页面</th>
              <th>级别</th>
              <th>状态</th>
              <th>创建时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="wo in recentWorkorders" :key="wo.id" @click="goWorkorderDetail(wo.id)">
              <td><strong>{{ wo.id }}</strong></td>
              <td class="insp-title-cell">{{ wo.title }}</td>
              <td>{{ wo.pageName }}</td>
              <td><span class="insp-pill" :data-level="wo.level">{{ levelLabel(wo.level) }}</span></td>
              <td><span class="insp-pill" :data-wo="wo.status">{{ woStatusLabel(wo.status) }}</span></td>
              <td>{{ wo.createdAt }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import {
  getInspectionStats,
  getSiteRanking,
  listWorkorders,
  TASK_LEVEL_LABELS,
  WORKORDER_STATUS_LABELS,
  type TrendPoint
} from '@/services/inspection'

const router = useRouter()
const appStore = useAppStore()
const pageId = 'inspection.overview'

const stats = computed(() => getInspectionStats())
const ranking = computed(() => getSiteRanking())
const recentWorkorders = computed(() => listWorkorders().slice(0, 5))

const trend = computed<TrendPoint[]>(() => stats.value.trend)

onMountedSync()
function onMountedSync() {
  document.title = '联想门户工作台'
  appStore.ensureStaticTab(pageId)
  appStore.setActiveStaticTab(pageId)
}

function goWorkorders() {
  router.push('/inspection/workorders')
}
function goWorkorderDetail(id: string) {
  router.push('/inspection/workorders')
  appStore.notify(`已打开工单 ${id}`)
}

function levelLabel(level: keyof typeof TASK_LEVEL_LABELS) {
  return TASK_LEVEL_LABELS[level]
}
function woStatusLabel(status: keyof typeof WORKORDER_STATUS_LABELS) {
  return WORKORDER_STATUS_LABELS[status]
}

// ===== 趋势折线图坐标计算 =====
const chartW = 600
const chartH = 220
const padL = 36
const padR = 16
const padT = 24
const padB = 28

const gradId = 'inspTrendGrad'
const gridLines = [padT, padT + (chartH - padT - padB) / 2, chartH - padB]

function xOf(i: number) {
  const inner = chartW - padL - padR
  return padL + (inner * i) / Math.max(trend.value.length - 1, 1)
}
function yOf(rate: number) {
  const top = padT
  const bottom = chartH - padB
  // 健康率范围 50~100 映射到底部~顶部
  const min = 50
  const max = 100
  const ratio = (rate - min) / (max - min)
  return bottom - (bottom - top) * ratio
}

const chartPoints = computed(() =>
  trend.value.map((d, i) => ({ x: xOf(i), y: d.rate == null ? 0 : yOf(d.rate), rate: d.rate }))
)
const linePath = computed(() => {
  const pts = chartPoints.value.filter(p => p.rate != null)
  if (!pts.length) return ''
  return 'M' + pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L')
})
const areaPath = computed(() => {
  const pts = chartPoints.value.filter(p => p.rate != null)
  if (!pts.length) return ''
  const first = pts[0]
  const last = pts[pts.length - 1]
  return `M${first.x.toFixed(1)},${(chartH - padB).toFixed(1)} ` +
    pts.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
    ` L${last.x.toFixed(1)},${(chartH - padB).toFixed(1)} Z`
})
</script>

<style scoped>
.inspection-overview {
  container-type: inline-size;
  display: grid;
  min-width: 0;
  gap: 16px;
  color: var(--color-text);
}

.insp-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}
.insp-page-header h1 {
  margin: 0;
  color: var(--color-text);
  font-size: 20px;
}
.insp-page-header p {
  margin: 4px 0 0;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.primary-action,
.text-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  border-radius: var(--radius);
  border: 1px solid transparent;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
}
.primary-action {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-surface);
}
.text-action {
  border: 0;
  padding-inline: 4px;
  background: transparent;
  color: var(--color-primary);
}

.insp-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 12px;
  margin: 0 !important;
}
.insp-kpi-card {
  min-height: 104px;
  padding: 16px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
}
.insp-kpi-card.g-blue   { background: linear-gradient(135deg, #eaf1ff, #f7faff); }
.insp-kpi-card.g-cyan   { background: linear-gradient(135deg, #e6f6fb, #f6fcfd); }
.insp-kpi-card.g-indigo { background: linear-gradient(135deg, #eef0ff, #f8f9ff); }
.insp-kpi-card.g-purple { background: linear-gradient(135deg, #f3ecff, #fbf8ff); }
.insp-kpi-card span {
  color: var(--color-text-secondary);
  font-size: 12px;
}
.insp-kpi-card strong {
  display: block;
  margin-top: 8px;
  color: var(--color-text);
  font-size: 28px;
  line-height: 1.1;
}
.insp-kpi-card strong i {
  font-style: normal;
  font-size: 16px;
  margin-left: 2px;
}
.insp-kpi-card small {
  display: block;
  margin-top: 6px;
  color: var(--color-text-tertiary);
  font-size: 12px;
}

.insp-overview-cols {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 16px;
}
.insp-card {
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow);
  padding: 16px;
}
.insp-card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.insp-card-head h2 {
  margin: 0;
  color: var(--color-text);
  font-size: 16px;
}
.insp-card-head p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.insp-trend-chart {
  height: 220px;
}
.insp-trend-svg {
  width: 100%;
  height: 100%;
}
.insp-grid {
  stroke: var(--color-border-subtle);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}
.insp-trend-val {
  fill: var(--color-text);
  font-size: 11px;
  font-weight: 700;
  text-anchor: middle;
}
.insp-trend-date {
  fill: var(--color-text-tertiary);
  font-size: 11px;
  text-anchor: middle;
}

.insp-rank-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 14px;
}
.insp-rank-item {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}
.insp-rank-no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--color-bg-muted);
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 800;
}
.insp-rank-no[data-top="true"] {
  background: var(--color-primary-subtle);
  color: var(--color-primary);
}
.insp-rank-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.insp-rank-row strong {
  color: var(--color-text);
  font-size: 14px;
}
.insp-rank-anomaly {
  color: var(--color-danger);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
.insp-rank-bar {
  height: 8px;
  margin: 8px 0 6px;
  border-radius: 9999px;
  background: var(--color-bg-muted);
  overflow: hidden;
}
.insp-rank-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--color-success);
}
.insp-rank-bar span[data-low="true"] {
  background: var(--color-warning);
}
.insp-rank-meta {
  display: flex;
  justify-content: space-between;
  color: var(--color-text-tertiary);
  font-size: 12px;
}

.insp-recent-card {
  margin-top: 0;
}
.insp-table-scroll {
  overflow-x: auto;
}
.insp-data-table {
  width: 100%;
  min-width: 760px;
  border-collapse: separate;
  border-spacing: 0;
}
.insp-data-table th,
.insp-data-table td {
  border-bottom: 1px solid var(--color-border-subtle);
  padding: 12px 16px;
  text-align: left;
  vertical-align: middle;
  font-size: 13px;
}
.insp-data-table th {
  background: var(--color-bg-muted);
  color: var(--color-text-secondary);
  font-weight: 800;
}
.insp-data-table td {
  color: var(--color-text-secondary);
}
.insp-data-table td strong {
  color: var(--color-text);
  font-weight: 800;
}
.insp-data-table tbody tr {
  cursor: pointer;
}
.insp-data-table tbody tr:hover {
  background: var(--color-primary-subtle);
}
.insp-title-cell {
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.insp-pill {
  display: inline-flex;
  align-items: center;
  width: max-content;
  min-height: 24px;
  border-radius: 9999px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
}
.insp-pill[data-level="normal"], .insp-pill[data-wo="resolved"], .insp-pill[data-wo="closed"] {
  background: var(--color-success-bg);
  color: var(--color-success);
}
.insp-pill[data-level="notice"] {
  background: var(--color-bg-muted);
  color: var(--color-text-secondary);
}
.insp-pill[data-level="warning"], .insp-pill[data-wo="processing"] {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}
.insp-pill[data-level="critical"], .insp-pill[data-wo="open"] {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}

@container (max-width: 1039px) {
  .insp-kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .insp-overview-cols {
    grid-template-columns: 1fr;
  }
}
@container (max-width: 719px) {
  .insp-kpi-grid {
    grid-template-columns: 1fr;
  }
  .insp-page-header {
    flex-direction: column;
  }
}
</style>
