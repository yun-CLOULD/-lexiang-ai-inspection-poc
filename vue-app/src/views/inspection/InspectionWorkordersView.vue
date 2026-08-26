<template>
  <section class="inspection-workorders">
    <template v-if="selected">
      <header class="insp-detail-header">
        <button class="text-action" type="button" @click="selectedId = null">返回列表</button>
        <div>
          <p class="section-kicker">工单明细</p>
          <h1>{{ selected.title }}</h1>
          <p>{{ selected.id }} · {{ selected.pageName }} · {{ selected.site }}</p>
        </div>
        <div class="insp-detail-status">
          <span class="insp-pill" :data-level="selected.level">{{ levelLabel(selected.level) }}</span>
          <span class="insp-pill" :data-wo="selected.status">{{ woStatusLabel(selected.status) }}</span>
        </div>
      </header>

      <article class="insp-card insp-basic">
        <h2>基础信息</h2>
        <dl class="insp-detail-list">
          <div><dt>工单 ID</dt><dd>{{ selected.id }}</dd></div>
          <div><dt>所属页面</dt><dd>{{ selected.pageName }}</dd></div>
          <div><dt>所属站点</dt><dd>{{ selected.site }}</dd></div>
          <div><dt>创建时间</dt><dd>{{ selected.createdAt }}</dd></div>
          <div class="insp-full">
            <dt>涉及模块</dt>
            <dd>
              <span v-for="m in selected.modules" :key="m.name" class="insp-module-tag" :data-level="m.level">{{ m.name }}</span>
            </dd>
          </div>
        </dl>
      </article>

      <div class="insp-module-grid">
        <article v-for="(m, i) in selected.modules" :key="m.name" class="insp-card insp-module-card" :data-level="m.level">
          <header class="insp-module-head">
            <h3>{{ m.name }}</h3>
            <span class="insp-pill" :data-level="m.level">{{ levelLabel(m.level) }}</span>
          </header>
          <div v-for="group in groupItems(m.items)" :key="group.type" class="insp-module-group">
            <p class="insp-group-type" :data-type="group.type">{{ group.type }}</p>
            <ul>
              <li v-for="(it, k) in group.items" :key="k">{{ it.text }}</li>
            </ul>
          </div>
        </article>
      </div>
    </template>

    <template v-else>
      <header class="insp-page-header">
        <div>
          <h1 class="page-title">工单明细</h1>
          <p>巡检发现的问题按模块分组（M1~Mn），每个模块含问题明细 / 修改建议 / 故障定位。</p>
        </div>
      </header>

      <section class="insp-workspace">
        <form class="insp-query-panel" aria-label="筛选条件" @submit.prevent="applyQuery">
          <label>
            <span>关键词</span>
            <input v-model="draftFilters.keyword" type="search" placeholder="工单 ID、标题、页面" />
          </label>
          <label>
            <span>级别</span>
            <select v-model="draftFilters.level">
              <option v-for="o in levelOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </label>
          <label>
            <span>状态</span>
            <select v-model="draftFilters.status">
              <option v-for="o in statusOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </label>
          <div class="insp-query-actions">
            <button class="secondary-action" type="button" @click="resetQuery">重置</button>
            <button class="primary-action" type="submit">查询</button>
          </div>
        </form>

        <section class="insp-card insp-table-section" aria-label="工单列表">
          <div class="insp-table-toolbar">
            <div>
              <h2>工单列表</h2>
              <p>共 {{ queryResult.total }} 条，当前第 {{ currentPage }} / {{ totalPages }} 页。</p>
            </div>
          </div>
          <div class="insp-table-scroll">
            <table class="insp-data-table">
              <thead>
                <tr>
                  <th>工单 ID</th>
                  <th>标题</th>
                  <th>页面</th>
                  <th>级别</th>
                  <th>状态</th>
                  <th>创建时间</th>
                  <th class="insp-action-col">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="wo in queryResult.rows" :key="wo.id">
                  <td><strong>{{ wo.id }}</strong></td>
                  <td class="insp-title-cell">{{ wo.title }}</td>
                  <td>{{ wo.pageName }}</td>
                  <td><span class="insp-pill" :data-level="wo.level">{{ levelLabel(wo.level) }}</span></td>
                  <td><span class="insp-pill" :data-wo="wo.status">{{ woStatusLabel(wo.status) }}</span></td>
                  <td>{{ wo.createdAt }}</td>
                  <td class="insp-action-col"><button class="text-action" type="button" @click="openDetail(wo.id)">查看详情</button></td>
                </tr>
                <tr v-if="!queryResult.rows.length">
                  <td class="insp-empty-cell" colspan="7">当前筛选条件下暂无工单。</td>
                </tr>
              </tbody>
            </table>
          </div>
          <footer class="insp-pagination-bar">
            <button class="secondary-action" type="button" :disabled="currentPage <= 1" @click="changePage(currentPage - 1)">上一页</button>
            <button class="secondary-action" type="button" :disabled="currentPage >= totalPages" @click="changePage(currentPage + 1)">下一页</button>
          </footer>
        </section>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import {
  listWorkorders,
  getWorkorderById,
  TASK_LEVEL_LABELS,
  WORKORDER_STATUS_LABELS,
  type InspectionWorkorder,
  type TaskLevel,
  type WorkorderStatus,
  type WorkorderItem
} from '@/services/inspection'

const appStore = useAppStore()
const pageId = 'inspection.workorders'
const pageSize = 7

const allWorkorders = ref<InspectionWorkorder[]>(listWorkorders())
const selectedId = ref<string | null>(null)
const selected = computed(() => (selectedId.value ? getWorkorderById(selectedId.value) : null))

const levelOptions = [
  { value: 'all', label: '全部级别' },
  ...(Object.keys(TASK_LEVEL_LABELS) as TaskLevel[]).map(l => ({ value: l, label: TASK_LEVEL_LABELS[l] }))
]
const statusOptions = [
  { value: 'all', label: '全部状态' },
  ...(Object.keys(WORKORDER_STATUS_LABELS) as WorkorderStatus[]).map(s => ({ value: s, label: WORKORDER_STATUS_LABELS[s] }))
]

const defaultFilters = { keyword: '', level: 'all', status: 'all' }
const draftFilters = reactive({ ...defaultFilters })
const appliedFilters = ref({ ...defaultFilters })
const currentPage = ref(1)

const queryResult = computed(() => {
  const kw = appliedFilters.value.keyword.trim().toLowerCase()
  const filtered = allWorkorders.value.filter(wo => {
    const kwOk = !kw || [wo.id, wo.title, wo.pageName].some(v => v.toLowerCase().includes(kw))
    const lvOk = appliedFilters.value.level === 'all' || wo.level === appliedFilters.value.level
    const stOk = appliedFilters.value.status === 'all' || wo.status === appliedFilters.value.status
    return kwOk && lvOk && stOk
  })
  const maxPage = Math.max(Math.ceil(filtered.length / pageSize), 1)
  const page = Math.min(Math.max(currentPage.value, 1), maxPage)
  const start = (page - 1) * pageSize
  return { rows: filtered.slice(start, start + pageSize), total: filtered.length, page, maxPage }
})
const totalPages = computed(() => queryResult.value.maxPage)

onMounted(() => {
  document.title = '联想门户工作台'
  appStore.ensureStaticTab(pageId)
  appStore.setActiveStaticTab(pageId)
})
watch(totalPages, p => { if (currentPage.value > p) currentPage.value = p })
watch(selectedId, () => { currentPage.value = 1 })

function applyQuery() { appliedFilters.value = { ...draftFilters }; currentPage.value = 1 }
function resetQuery() { Object.assign(draftFilters, defaultFilters); appliedFilters.value = { ...defaultFilters }; currentPage.value = 1 }
function changePage(p: number) { currentPage.value = Math.min(Math.max(p, 1), totalPages.value) }
function openDetail(id: string) { selectedId.value = id }
function levelLabel(l: TaskLevel) { return TASK_LEVEL_LABELS[l] }
function woStatusLabel(s: WorkorderStatus) { return WORKORDER_STATUS_LABELS[s] }

function groupItems(items: WorkorderItem[]) {
  const types: WorkorderItem['type'][] = ['问题明细', '修改建议', '故障定位']
  return types
    .map(type => ({ type, items: items.filter(it => it.type === type) }))
    .filter(g => g.items.length)
}
</script>

<style scoped>
.inspection-workorders { container-type: inline-size; display: grid; min-width: 0; gap: 16px; color: var(--color-text); }
.insp-page-header, .insp-detail-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.insp-page-header h1, .insp-detail-header h1 { margin: 4px 0 0; font-size: 20px; color: var(--color-text); }
.insp-page-header p, .insp-detail-header p { margin: 4px 0 0; color: var(--color-text-secondary); font-size: 13px; line-height: 1.5; }
.section-kicker { color: var(--color-primary) !important; font-size: 13px; font-weight: 700; }
.insp-detail-status { display: flex; gap: 8px; }

.primary-action, .secondary-action, .text-action {
  display: inline-flex; align-items: center; justify-content: center; min-height: 34px;
  border-radius: var(--radius); border: 1px solid transparent; padding: 0 16px;
  font-size: 13px; font-weight: 700; white-space: nowrap; cursor: pointer;
}
.primary-action { border-color: var(--color-primary); background: var(--color-primary); color: var(--color-surface); }
.secondary-action { border-color: var(--color-border); background: var(--color-surface); color: var(--color-text-secondary); }
.secondary-action:disabled { cursor: not-allowed; opacity: .45; }
.text-action { border: 0; padding-inline: 4px; background: transparent; color: var(--color-primary); }

.insp-workspace { display: grid; gap: 12px; min-width: 0; }
.insp-query-panel {
  display: grid; grid-template-columns: minmax(220px, 1fr) minmax(150px, .5fr) minmax(150px, .5fr) auto;
  gap: 12px; align-items: end; padding: 16px;
  border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg);
  background: var(--color-surface); box-shadow: var(--shadow);
}
.insp-query-panel label { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.insp-query-panel label span { color: var(--color-text); font-size: 13px; font-weight: 700; }
.insp-query-panel input, .insp-query-panel select {
  width: 100%; min-height: 36px; border: 1px solid var(--color-border); border-radius: var(--radius);
  background: var(--color-surface); color: var(--color-text); font-size: 13px; padding: 0 12px; outline: none;
}
.insp-query-panel input:focus, .insp-query-panel select:focus {
  border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-subtle);
}
.insp-query-actions { display: flex; justify-content: flex-end; gap: 8px; }

.insp-card { border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); background: var(--color-surface); box-shadow: var(--shadow); padding: 16px; }
.insp-card h2 { margin: 0 0 12px; font-size: 16px; color: var(--color-text); }
.insp-table-section { overflow: hidden; padding: 0; }
.insp-table-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px; border-bottom: 1px solid var(--color-border-subtle); }
.insp-table-toolbar h2 { margin: 0 0 4px; }
.insp-table-toolbar p { margin: 0; color: var(--color-text-secondary); font-size: 13px; }
.insp-table-scroll { overflow-x: auto; }
.insp-data-table { width: 100%; min-width: 880px; border-collapse: separate; border-spacing: 0; }
.insp-data-table th, .insp-data-table td {
  border-bottom: 1px solid var(--color-border-subtle); padding: 12px 16px; text-align: left;
  vertical-align: middle; font-size: 13px;
}
.insp-data-table th { background: var(--color-bg-muted); color: var(--color-text-secondary); font-weight: 800; }
.insp-data-table td { color: var(--color-text-secondary); }
.insp-data-table td strong { color: var(--color-text); font-weight: 800; }
.insp-title-cell { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.insp-action-col { position: sticky; right: 0; min-width: 96px; background: var(--color-surface); box-shadow: var(--shadow); }
.insp-empty-cell { height: 120px; text-align: center; color: var(--color-text-tertiary); }
.insp-pagination-bar { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; }

.insp-pill {
  display: inline-flex; align-items: center; width: max-content; min-height: 24px;
  border-radius: 9999px; padding: 0 8px; font-size: 12px; font-weight: 800; line-height: 1;
}
.insp-pill[data-level="normal"], .insp-pill[data-wo="resolved"], .insp-pill[data-wo="closed"] { background: var(--color-success-bg); color: var(--color-success); }
.insp-pill[data-level="notice"] { background: var(--color-bg-muted); color: var(--color-text-secondary); }
.insp-pill[data-level="warning"], .insp-pill[data-wo="processing"] { background: var(--color-warning-bg); color: var(--color-warning); }
.insp-pill[data-level="critical"], .insp-pill[data-wo="open"] { background: var(--color-danger-bg); color: var(--color-danger); }

.insp-basic { margin-bottom: 0; }
.insp-detail-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 20px; margin: 0; }
.insp-detail-list div { min-width: 0; }
.insp-detail-list dt { margin-bottom: 4px; color: var(--color-text-secondary); font-size: 12px; }
.insp-detail-list dd { margin: 0; color: var(--color-text); font-weight: 700; }
.insp-full { grid-column: 1 / -1; }
.insp-module-tag {
  display: inline-flex; align-items: center; margin: 0 6px 6px 0; min-height: 24px;
  border-radius: 9999px; padding: 0 10px; font-size: 12px; font-weight: 700;
  background: var(--color-primary-subtle); color: var(--color-primary);
}
.insp-module-tag[data-level="warning"] { background: var(--color-warning-bg); color: var(--color-warning); }
.insp-module-tag[data-level="critical"] { background: var(--color-danger-bg); color: var(--color-danger); }
.insp-module-tag[data-level="notice"] { background: var(--color-bg-muted); color: var(--color-text-secondary); }

.insp-module-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.insp-module-card { border-left: 4px solid var(--color-border-subtle); }
.insp-module-card[data-level="warning"] { border-left-color: var(--color-warning); }
.insp-module-card[data-level="critical"] { border-left-color: var(--color-danger); }
.insp-module-card[data-level="notice"] { border-left-color: var(--color-text-tertiary); }
.insp-module-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.insp-module-head h3 { margin: 0; font-size: 15px; color: var(--color-text); }
.insp-module-group { margin-top: 12px; }
.insp-group-type {
  display: inline-flex; margin: 0 0 6px; padding: 2px 8px; border-radius: 6px;
  font-size: 12px; font-weight: 800; background: var(--color-bg-muted); color: var(--color-text-secondary);
}
.insp-group-type[data-type="问题明细"] { background: var(--color-danger-bg); color: var(--color-danger); }
.insp-group-type[data-type="修改建议"] { background: var(--color-success-bg); color: var(--color-success); }
.insp-group-type[data-type="故障定位"] { background: var(--color-primary-subtle); color: var(--color-primary); }
.insp-module-group ul { margin: 0; padding-left: 18px; }
.insp-module-group li { color: var(--color-text-secondary); font-size: 13px; line-height: 1.6; }

@container (max-width: 1039px) {
  .insp-query-panel { grid-template-columns: 1fr; }
  .insp-query-actions { grid-column: 1 / -1; }
  .insp-detail-list { grid-template-columns: 1fr; }
  .insp-module-grid { grid-template-columns: 1fr; }
}
</style>
