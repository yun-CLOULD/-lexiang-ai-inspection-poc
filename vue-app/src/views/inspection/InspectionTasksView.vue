<template>
  <section class="inspection-tasks">
    <header class="insp-page-header">
      <div>
        <h1 class="page-title">巡检任务</h1>
        <p>规则执行产生的巡检任务与结果。状态含通过 / 部分异常 / 未通过 / 告警 / 运行中。</p>
      </div>
    </header>

    <section class="insp-workspace">
      <form class="insp-query-panel" aria-label="筛选条件" @submit.prevent="applyQuery">
        <label>
          <span>关键词</span>
          <input v-model="draftFilters.keyword" type="search" placeholder="任务 ID、规则、页面" />
        </label>
        <label>
          <span>状态</span>
          <select v-model="draftFilters.status">
            <option v-for="o in statusOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </label>
        <label>
          <span>级别</span>
          <select v-model="draftFilters.level">
            <option v-for="o in levelOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </label>
        <div class="insp-query-actions">
          <button class="secondary-action" type="button" @click="resetQuery">重置</button>
          <button class="primary-action" type="submit">查询</button>
        </div>
      </form>

      <section class="insp-card insp-table-section" aria-label="巡检任务列表">
        <div class="insp-table-toolbar">
          <div>
            <h2>任务列表</h2>
            <p>共 {{ queryResult.total }} 条，当前第 {{ currentPage }} / {{ totalPages }} 页。</p>
          </div>
        </div>
        <div class="insp-table-scroll">
          <table class="insp-data-table">
            <thead>
              <tr>
                <th>任务 ID</th>
                <th>巡检规则</th>
                <th>页面</th>
                <th>状态</th>
                <th>级别</th>
                <th>巡检时间</th>
                <th>健康率</th>
                <th>问题数</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in queryResult.rows" :key="t.id">
                <td><strong>{{ t.id }}</strong></td>
                <td>{{ t.ruleName }}</td>
                <td>{{ t.pageName }}</td>
                <td><span class="insp-task-pill" :data-status="t.status">{{ taskStatusLabel(t.status) }}</span></td>
                <td><span class="insp-pill" :data-level="t.level">{{ levelLabel(t.level) }}</span></td>
                <td>{{ t.runAt }}</td>
                <td>
                  <span class="insp-rate" :data-low="t.healthRate > 0 && t.healthRate < 80">{{ t.healthRate > 0 ? t.healthRate + '%' : '—' }}</span>
                </td>
                <td>{{ t.issues }}</td>
              </tr>
              <tr v-if="!queryResult.rows.length">
                <td class="insp-empty-cell" colspan="8">当前筛选条件下暂无巡检任务。</td>
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
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import {
  listTasks,
  TASK_STATUS_LABELS,
  TASK_LEVEL_LABELS,
  type InspectionTask,
  type TaskStatus,
  type TaskLevel
} from '@/services/inspection'

const appStore = useAppStore()
const pageId = 'inspection.tasks'
const pageSize = 8

const allTasks = ref<InspectionTask[]>(listTasks())

const statusOptions = [
  { value: 'all', label: '全部状态' },
  ...(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map(s => ({ value: s, label: TASK_STATUS_LABELS[s] }))
]
const levelOptions = [
  { value: 'all', label: '全部级别' },
  ...(Object.keys(TASK_LEVEL_LABELS) as TaskLevel[]).map(l => ({ value: l, label: TASK_LEVEL_LABELS[l] }))
]

const defaultFilters = { keyword: '', status: 'all', level: 'all' }
const draftFilters = reactive({ ...defaultFilters })
const appliedFilters = ref({ ...defaultFilters })
const currentPage = ref(1)

const queryResult = computed(() => {
  const kw = appliedFilters.value.keyword.trim().toLowerCase()
  const filtered = allTasks.value.filter(t => {
    const kwOk = !kw || [t.id, t.ruleName, t.pageName].some(v => v.toLowerCase().includes(kw))
    const stOk = appliedFilters.value.status === 'all' || t.status === appliedFilters.value.status
    const lvOk = appliedFilters.value.level === 'all' || t.level === appliedFilters.value.level
    return kwOk && stOk && lvOk
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

function applyQuery() { appliedFilters.value = { ...draftFilters }; currentPage.value = 1 }
function resetQuery() { Object.assign(draftFilters, defaultFilters); appliedFilters.value = { ...defaultFilters }; currentPage.value = 1 }
function changePage(p: number) { currentPage.value = Math.min(Math.max(p, 1), totalPages.value) }
function taskStatusLabel(s: TaskStatus) { return TASK_STATUS_LABELS[s] }
function levelLabel(l: TaskLevel) { return TASK_LEVEL_LABELS[l] }
</script>

<style scoped>
.inspection-tasks { container-type: inline-size; display: grid; min-width: 0; gap: 16px; color: var(--color-text); }
.insp-page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.insp-page-header h1 { margin: 0; font-size: 20px; color: var(--color-text); }
.insp-page-header p { margin: 4px 0 0; color: var(--color-text-secondary); font-size: 13px; line-height: 1.5; }

.primary-action, .secondary-action {
  display: inline-flex; align-items: center; justify-content: center; min-height: 34px;
  border-radius: var(--radius); border: 1px solid transparent; padding: 0 16px;
  font-size: 13px; font-weight: 700; white-space: nowrap; cursor: pointer;
}
.primary-action { border-color: var(--color-primary); background: var(--color-primary); color: var(--color-surface); }
.secondary-action { border-color: var(--color-border); background: var(--color-surface); color: var(--color-text-secondary); }
.secondary-action:disabled { cursor: not-allowed; opacity: .45; }

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

.insp-card { border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); background: var(--color-surface); box-shadow: var(--shadow); }
.insp-table-section { overflow: hidden; }
.insp-table-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px; border-bottom: 1px solid var(--color-border-subtle); }
.insp-table-toolbar h2 { margin: 0 0 4px; font-size: 16px; color: var(--color-text); }
.insp-table-toolbar p { margin: 0; color: var(--color-text-secondary); font-size: 13px; }
.insp-table-scroll { overflow-x: auto; }
.insp-data-table { width: 100%; min-width: 920px; border-collapse: separate; border-spacing: 0; }
.insp-data-table th, .insp-data-table td {
  border-bottom: 1px solid var(--color-border-subtle); padding: 12px 16px; text-align: left;
  vertical-align: middle; font-size: 13px;
}
.insp-data-table th { background: var(--color-bg-muted); color: var(--color-text-secondary); font-weight: 800; }
.insp-data-table td { color: var(--color-text-secondary); }
.insp-data-table td strong { color: var(--color-text); font-weight: 800; }
.insp-empty-cell { height: 120px; text-align: center; color: var(--color-text-tertiary); }
.insp-pagination-bar { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; }

.insp-pill {
  display: inline-flex; align-items: center; width: max-content; min-height: 24px;
  border-radius: 9999px; padding: 0 8px; font-size: 12px; font-weight: 800; line-height: 1;
}
.insp-pill[data-level="normal"] { background: var(--color-success-bg); color: var(--color-success); }
.insp-pill[data-level="notice"] { background: var(--color-bg-muted); color: var(--color-text-secondary); }
.insp-pill[data-level="warning"] { background: var(--color-warning-bg); color: var(--color-warning); }
.insp-pill[data-level="critical"] { background: var(--color-danger-bg); color: var(--color-danger); }

.insp-task-pill {
  display: inline-flex; align-items: center; width: max-content; min-height: 24px;
  border-radius: 9999px; padding: 0 8px; font-size: 12px; font-weight: 800; line-height: 1;
}
.insp-task-pill[data-status="pass"] { background: var(--color-success-bg); color: var(--color-success); }
.insp-task-pill[data-status="partial"] { background: var(--color-warning-bg); color: var(--color-warning); }
.insp-task-pill[data-status="fail"] { background: var(--color-danger-bg); color: var(--color-danger); }
.insp-task-pill[data-status="warn"] { background: var(--color-primary-subtle); color: var(--color-primary); }
.insp-task-pill[data-status="running"] { background: var(--color-bg-muted); color: var(--color-text-secondary); }

.insp-rate { font-weight: 800; color: var(--color-text); }
.insp-rate[data-low="true"] { color: var(--color-warning); }

@container (max-width: 1039px) {
  .insp-query-panel { grid-template-columns: 1fr; }
  .insp-query-actions { grid-column: 1 / -1; }
}
</style>
