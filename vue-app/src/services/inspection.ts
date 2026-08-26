/**
 * 乐享 AI 巡检平台 —— Demo mock 数据层
 *
 * 与订单管理 POC（purchaseOrders.ts）保持一致：纯页面演示，数据来自本文件，
 * 暂未连接真实接口。若后续接入 FastAPI 后端，只需替换本文件的查询函数实现，
 * 页面组件无需改动。
 */

// ===== 巡检维度（来自走查清单）=====
export type CheckDimensionKey =
  | 'link'
  | 'soldout'
  | 'activity'
  | 'image'
  | 'consistency'
  | 'interactive'

export interface CheckDimension {
  key: CheckDimensionKey
  label: string
}

export const CHECK_DIMENSIONS: CheckDimension[] = [
  { key: 'link', label: '链接有效性' },
  { key: 'soldout', label: '售罄下架' },
  { key: 'activity', label: '活动时效' },
  { key: 'image', label: '图片加载' },
  { key: 'consistency', label: '图文一致性' },
  { key: 'interactive', label: '互动奖品特效' }
]

export const CHECK_DIMENSION_LABELS: Record<CheckDimensionKey, string> =
  Object.fromEntries(CHECK_DIMENSIONS.map(d => [d.key, d.label])) as Record<CheckDimensionKey, string>

// ===== 站点 =====
export interface InspectionSite {
  id: number
  name: string
  pageCount: number
  anomalyCount: number
  healthRate: number
}

const INSPECTION_SITES: InspectionSite[] = [
  { id: 1, name: '官网首页', pageCount: 12, anomalyCount: 3, healthRate: 92 },
  { id: 2, name: '商城首页', pageCount: 18, anomalyCount: 8, healthRate: 76 },
  { id: 3, name: '活动专题页', pageCount: 9, anomalyCount: 6, healthRate: 68 },
  { id: 4, name: '会员中心', pageCount: 7, anomalyCount: 2, healthRate: 95 },
  { id: 5, name: '帮助中心', pageCount: 14, anomalyCount: 4, healthRate: 88 }
]

// ===== 巡检规则 =====
export interface InspectionRule {
  id: string
  name: string
  pageName: string
  site: string
  dimensions: CheckDimensionKey[]
  frequency: '每小时' | '每日' | '每周'
  notify: '企业微信' | '邮件' | '飞书' | '站内信'
  enabled: boolean
  updatedAt: string
}

const INSPECTION_RULES: InspectionRule[] = [
  {
    id: 'R-1001', name: '官网首页-全维度巡检', pageName: '官网首页', site: '官网首页',
    dimensions: ['link', 'image', 'consistency'], frequency: '每日', notify: '企业微信',
    enabled: true, updatedAt: '2026-08-16'
  },
  {
    id: 'R-1002', name: '商城首页-商品与活动巡检', pageName: '商城首页', site: '商城首页',
    dimensions: ['soldout', 'activity', 'image', 'interactive'], frequency: '每日', notify: '企业微信',
    enabled: true, updatedAt: '2026-08-16'
  },
  {
    id: 'R-1003', name: '活动专题页-时效与特效巡检', pageName: '活动专题页', site: '活动专题页',
    dimensions: ['activity', 'interactive', 'link'], frequency: '每小时', notify: '飞书',
    enabled: true, updatedAt: '2026-08-17'
  },
  {
    id: 'R-1004', name: '会员中心-图文一致性巡检', pageName: '会员中心', site: '会员中心',
    dimensions: ['consistency', 'image'], frequency: '每周', notify: '邮件',
    enabled: true, updatedAt: '2026-08-15'
  },
  {
    id: 'R-1005', name: '帮助中心-链接有效性巡检', pageName: '帮助中心', site: '帮助中心',
    dimensions: ['link', 'image'], frequency: '每日', notify: '站内信',
    enabled: false, updatedAt: '2026-08-12'
  },
  {
    id: 'R-1006', name: '商城首页-售罄下架巡检', pageName: '商城首页', site: '商城首页',
    dimensions: ['soldout', 'consistency'], frequency: '每小时', notify: '企业微信',
    enabled: true, updatedAt: '2026-08-17'
  }
]

// ===== 巡检任务 =====
export type TaskStatus = 'pass' | 'partial' | 'fail' | 'warn' | 'running'
export type TaskLevel = 'normal' | 'notice' | 'warning' | 'critical'

export interface InspectionTask {
  id: string
  ruleName: string
  pageName: string
  site: string
  status: TaskStatus
  level: TaskLevel
  runAt: string
  healthRate: number
  issues: number
  durationSec: number
}

const INSPECTION_TASKS: InspectionTask[] = [
  { id: 'T-2601', ruleName: '官网首页-全维度巡检', pageName: '官网首页', site: '官网首页', status: 'partial', level: 'warning', runAt: '2026-08-18 09:12', healthRate: 86, issues: 3, durationSec: 42 },
  { id: 'T-2602', ruleName: '商城首页-商品与活动巡检', pageName: '商城首页', site: '商城首页', status: 'fail', level: 'critical', runAt: '2026-08-18 09:10', healthRate: 61, issues: 8, durationSec: 58 },
  { id: 'T-2603', ruleName: '活动专题页-时效与特效巡检', pageName: '活动专题页', site: '活动专题页', status: 'warn', level: 'warning', runAt: '2026-08-18 09:05', healthRate: 72, issues: 5, durationSec: 35 },
  { id: 'T-2604', ruleName: '会员中心-图文一致性巡检', pageName: '会员中心', site: '会员中心', status: 'pass', level: 'normal', runAt: '2026-08-18 08:50', healthRate: 98, issues: 0, durationSec: 29 },
  { id: 'T-2605', ruleName: '帮助中心-链接有效性巡检', pageName: '帮助中心', site: '帮助中心', status: 'partial', level: 'notice', runAt: '2026-08-18 08:40', healthRate: 90, issues: 2, durationSec: 47 },
  { id: 'T-2606', ruleName: '商城首页-售罄下架巡检', pageName: '商城首页', site: '商城首页', status: 'partial', level: 'warning', runAt: '2026-08-18 08:30', healthRate: 78, issues: 4, durationSec: 51 },
  { id: 'T-2607', ruleName: '官网首页-全维度巡检', pageName: '官网首页', site: '官网首页', status: 'pass', level: 'normal', runAt: '2026-08-17 21:12', healthRate: 95, issues: 1, durationSec: 40 },
  { id: 'T-2608', ruleName: '活动专题页-时效与特效巡检', pageName: '活动专题页', site: '活动专题页', status: 'fail', level: 'critical', runAt: '2026-08-17 21:05', healthRate: 55, issues: 9, durationSec: 38 },
  { id: 'T-2609', ruleName: '会员中心-图文一致性巡检', pageName: '会员中心', site: '会员中心', status: 'pass', level: 'normal', runAt: '2026-08-17 20:48', healthRate: 99, issues: 0, durationSec: 27 },
  { id: 'T-2610', ruleName: '商城首页-商品与活动巡检', pageName: '商城首页', site: '商城首页', status: 'partial', level: 'warning', runAt: '2026-08-17 20:30', healthRate: 74, issues: 6, durationSec: 60 },
  { id: 'T-2611', ruleName: '帮助中心-链接有效性巡检', pageName: '帮助中心', site: '帮助中心', status: 'warn', level: 'notice', runAt: '2026-08-17 20:10', healthRate: 88, issues: 3, durationSec: 45 },
  { id: 'T-2612', ruleName: '官网首页-全维度巡检', pageName: '官网首页', site: '官网首页', status: 'running', level: 'normal', runAt: '2026-08-18 09:15', healthRate: 0, issues: 0, durationSec: 0 },
  { id: 'T-2613', ruleName: '商城首页-售罄下架巡检', pageName: '商城首页', site: '商城首页', status: 'partial', level: 'warning', runAt: '2026-08-17 14:25', healthRate: 80, issues: 4, durationSec: 52 },
  { id: 'T-2614', ruleName: '活动专题页-时效与特效巡检', pageName: '活动专题页', site: '活动专题页', status: 'warn', level: 'warning', runAt: '2026-08-16 18:40', healthRate: 70, issues: 5, durationSec: 36 }
]

// ===== 工单（按模块分组）=====
export type WorkorderStatus = 'open' | 'processing' | 'resolved' | 'closed'

export interface WorkorderItem {
  type: '问题明细' | '修改建议' | '故障定位'
  text: string
}

export interface WorkorderModule {
  name: string
  level: TaskLevel
  items: WorkorderItem[]
}

export interface InspectionWorkorder {
  id: string
  title: string
  pageName: string
  site: string
  status: WorkorderStatus
  level: TaskLevel
  createdAt: string
  modules: WorkorderModule[]
}

const INSPECTION_WORKORDERS: InspectionWorkorder[] = [
  {
    id: 'WO-8801', title: '商城首页轮播活动已过期仍在前台展示', pageName: '商城首页', site: '商城首页',
    status: 'processing', level: 'critical', createdAt: '2026-08-18 09:11',
    modules: [
      {
        name: 'M1 活动时效', level: 'critical',
        items: [
          { type: '问题明细', text: '首页顶部轮播第三位「夏日焕新季」活动结束时间为 2026-08-15，当前仍正常曝光。' },
          { type: '修改建议', text: '下线该轮播位或替换为进行中活动，建议同步更新活动落地页入口。' },
          { type: '故障定位', text: '活动配置表 active=1 但未校验 end_time，定时下线任务缺失。' }
        ]
      },
      {
        name: 'M2 互动奖品特效', level: 'warning',
        items: [
          { type: '问题明细', text: '该活动关联的抽奖转盘动画在 Safari 下偶发不触发。' },
          { type: '修改建议', text: '补充 prefers-reduced-motion 兼容与 WebKit 前缀动画。' }
        ]
      }
    ]
  },
  {
    id: 'WO-8802', title: '官网首页 Banner 图片加载失败（404）', pageName: '官网首页', site: '官网首页',
    status: 'open', level: 'warning', createdAt: '2026-08-18 09:13',
    modules: [
      {
        name: 'M1 图片加载', level: 'warning',
        items: [
          { type: '问题明细', text: '官网首页主视觉 Banner 资源 /assets/hero-0812.webp 返回 404。' },
          { type: '修改建议', text: '确认资源是否随 0812 改版一同发布，缺失则回滚至上一版本资源。' },
          { type: '故障定位', text: 'CDN 回源未命中，疑似发布流水线未同步静态资源目录。' }
        ]
      }
    ]
  },
  {
    id: 'WO-8803', title: '活动专题页图文不一致（价格与落地页不符）', pageName: '活动专题页', site: '活动专题页',
    status: 'open', level: 'warning', createdAt: '2026-08-18 09:06',
    modules: [
      {
        name: 'M1 图文一致性', level: 'warning',
        items: [
          { type: '问题明细', text: '专题页标称「到手价 ¥2999」，落地页同款显示 ¥3299。' },
          { type: '修改建议', text: '统一两处价格口径，或由 CMS 单一数据源驱动渲染。' }
        ]
      },
      {
        name: 'M2 链接有效性', level: 'notice',
        items: [
          { type: '问题明细', text: '专题页「立即抢购」按钮中有 1 条指向已下架 SKU 的短链。' },
          { type: '修改建议', text: '更新为在售 SKU 链接，并增加下架 SKU 自动拦截。' }
        ]
      }
    ]
  },
  {
    id: 'WO-8804', title: '会员中心等级权益文案错位', pageName: '会员中心', site: '会员中心',
    status: 'resolved', level: 'notice', createdAt: '2026-08-17 21:00',
    modules: [
      {
        name: 'M1 图文一致性', level: 'notice',
        items: [
          { type: '问题明细', text: '白银会员权益列表第 3 条与黄金会员重复。' },
          { type: '修改建议', text: '按等级去重权益文案，已修复并回归验证通过。' }
        ]
      }
    ]
  },
  {
    id: 'WO-8805', title: '帮助中心文档锚点链接失效', pageName: '帮助中心', site: '帮助中心',
    status: 'processing', level: 'notice', createdAt: '2026-08-17 20:12',
    modules: [
      {
        name: 'M1 链接有效性', level: 'notice',
        items: [
          { type: '问题明细', text: '「退换货流程」文档内 3 处锚点指向已删除的小节。' },
          { type: '修改建议', text: '重建小节锚点并补充 301 跳转。' },
          { type: '故障定位', text: '文档重构时未保留旧锚点映射。' }
        ]
      }
    ]
  },
  {
    id: 'WO-8806', title: '商城首页部分商品售罄未下架', pageName: '商城首页', site: '商城首页',
    status: 'open', level: 'warning', createdAt: '2026-08-18 08:31',
    modules: [
      {
        name: 'M1 售罄下架', level: 'warning',
        items: [
          { type: '问题明细', text: '首页「热销榜单」含 5 个库存为 0 的商品仍可加购。' },
          { type: '修改建议', text: '库存为 0 的商品从榜单与搜索置顶移除，加购前校验库存。' },
          { type: '故障定位', text: '榜单缓存未订阅库存变更事件。' }
        ]
      }
    ]
  },
  {
    id: 'WO-8807', title: '活动专题页抽奖特效遮挡关闭按钮', pageName: '活动专题页', site: '活动专题页',
    status: 'resolved', level: 'warning', createdAt: '2026-08-16 18:42',
    modules: [
      {
        name: 'M1 互动奖品特效', level: 'warning',
        items: [
          { type: '问题明细', text: '满屏彩带特效 z-index 过高，遮住弹层关闭按钮。' },
          { type: '修改建议', text: '特效层限制在非交互区域，已修复。' }
        ]
      }
    ]
  },
  {
    id: 'WO-8808', title: '官网首页底部备案链接跳转异常', pageName: '官网首页', site: '官网首页',
    status: 'closed', level: 'notice', createdAt: '2026-08-15 16:20',
    modules: [
      {
        name: 'M1 链接有效性', level: 'notice',
        items: [
          { type: '问题明细', text: '备案号链接指向 http 而非 https，被浏览器标记不安全。' },
          { type: '修改建议', text: '改为 https 并统一外链协议，已修复并关闭。' }
        ]
      }
    ]
  }
]

// ===== 健康率趋势（近 7 日，含 null 表示当日未出全量）=====
export interface TrendPoint {
  date: string
  rate: number | null
}

const HEALTH_TREND: TrendPoint[] = [
  { date: '08-12', rate: 83 },
  { date: '08-13', rate: 85 },
  { date: '08-14', rate: 81 },
  { date: '08-15', rate: 84 },
  { date: '08-16', rate: 82 },
  { date: '08-17', rate: 86 },
  { date: '08-18', rate: 80 }
]

// ===== 查询/筛选类型 =====
export interface InspectionFilters {
  keyword: string
  status: string
  level: string
}

export interface InspectionQuery extends InspectionFilters {
  page: number
  pageSize: number
}

export interface InspectionQueryResult<T> {
  rows: T[]
  filteredRows: T[]
  total: number
  page: number
  pageSize: number
}

// ===== 标签/枚举 =====
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pass: '通过', partial: '部分异常', fail: '未通过', warn: '告警', running: '运行中'
}
export const TASK_LEVEL_LABELS: Record<TaskLevel, string> = {
  normal: '正常', notice: '提示', warning: '警告', critical: '严重'
}
export const WORKORDER_STATUS_LABELS: Record<WorkorderStatus, string> = {
  open: '待处理', processing: '处理中', resolved: '已解决', closed: '已关闭'
}

// ===== 查询函数 =====
export function listSites(): InspectionSite[] {
  return [...INSPECTION_SITES]
}

export function getSiteRanking(): InspectionSite[] {
  return [...INSPECTION_SITES].sort((a, b) => b.anomalyCount - a.anomalyCount)
}

export function listRules(): InspectionRule[] {
  return [...INSPECTION_RULES]
}

export function queryRules(query: InspectionQuery): InspectionQueryResult<InspectionRule> {
  const filteredRows = applyInspectionFilters(INSPECTION_RULES, query, (r) => [
    r.id, r.name, r.pageName, r.site,
    ...r.dimensions.map(d => CHECK_DIMENSION_LABELS[d])
  ])
  return paginate(filteredRows, query)
}

export function listTasks(): InspectionTask[] {
  return [...INSPECTION_TASKS]
}

export function queryTasks(query: InspectionQuery): InspectionQueryResult<InspectionTask> {
  const filteredRows = applyInspectionFilters(INSPECTION_TASKS, query, (t) => [
    t.id, t.ruleName, t.pageName, t.site, TASK_STATUS_LABELS[t.status], TASK_LEVEL_LABELS[t.level]
  ])
  // 状态/级别精确匹配（若指定）
  const afterExact = filteredRows.filter(t => {
    const statusOk = query.status === 'all' || t.status === query.status
    const levelOk = query.level === 'all' || t.level === query.level
    return statusOk && levelOk
  })
  return paginate(afterExact, query)
}

export function listWorkorders(): InspectionWorkorder[] {
  return [...INSPECTION_WORKORDERS]
}

export function queryWorkorders(query: InspectionQuery): InspectionQueryResult<InspectionWorkorder> {
  const filteredRows = applyInspectionFilters(INSPECTION_WORKORDERS, query, (w) => [
    w.id, w.title, w.pageName, w.site, WORKORDER_STATUS_LABELS[w.status], TASK_LEVEL_LABELS[w.level]
  ])
  const afterExact = filteredRows.filter(w => {
    const statusOk = query.status === 'all' || w.status === query.status
    const levelOk = query.level === 'all' || w.level === query.level
    return statusOk && levelOk
  })
  return paginate(afterExact, query)
}

export function getWorkorderById(id: string): InspectionWorkorder | null {
  return INSPECTION_WORKORDERS.find(w => w.id === id) || null
}

export function getHealthTrend(): TrendPoint[] {
  return [...HEALTH_TREND]
}

export interface InspectionStats {
  healthyRate: number
  tasksTotal: number
  runsToday: number
  openWorkorders: number
  dist: { pass: number; partial: number; fail: number; warn: number }
  levelDist: { normal: number; notice: number; warning: number; critical: number }
  trend: TrendPoint[]
}

export function getInspectionStats(): InspectionStats {
  const dist = { pass: 0, partial: 0, fail: 0, warn: 0 }
  const levelDist = { normal: 0, notice: 0, warning: 0, critical: 0 }
  for (const t of INSPECTION_TASKS) {
    if (t.status in dist) dist[t.status as keyof typeof dist]++
    if (t.level in levelDist) levelDist[t.level as keyof typeof levelDist]++
  }
  const openWorkorders = INSPECTION_WORKORDERS.filter(w => w.status === 'open' || w.status === 'processing').length
  const finished = INSPECTION_TASKS.filter(t => t.status !== 'running')
  const avgRate = finished.length
    ? Math.round(finished.reduce((s, t) => s + t.healthRate, 0) / finished.length)
    : 0
  return {
    healthyRate: avgRate,
    tasksTotal: INSPECTION_TASKS.length,
    runsToday: INSPECTION_TASKS.filter(t => t.runAt.startsWith('2026-08-18')).length,
    openWorkorders,
    dist,
    levelDist,
    trend: getHealthTrend()
  }
}

// ===== 工具函数 =====
function applyInspectionFilters<T>(rows: T[], query: InspectionFilters, toText: (row: T) => string[]): T[] {
  const keyword = query.keyword.trim().toLowerCase()
  if (!keyword) return rows
  return rows.filter(row => toText(row).some(v => v.toLowerCase().includes(keyword)))
}

function paginate<T>(filteredRows: T[], query: InspectionQuery): InspectionQueryResult<T> {
  const safePageSize = Math.max(query.pageSize, 1)
  const maxPage = Math.max(Math.ceil(filteredRows.length / safePageSize), 1)
  const page = Math.min(Math.max(query.page, 1), maxPage)
  const start = (page - 1) * safePageSize
  return {
    rows: filteredRows.slice(start, start + safePageSize),
    filteredRows,
    total: filteredRows.length,
    page,
    pageSize: safePageSize
  }
}
