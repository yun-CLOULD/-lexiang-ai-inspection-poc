<template>
  <section class="inspection-rules">
    <header class="insp-page-header">
      <div>
        <h1 class="page-title">巡检规则</h1>
        <p>配置「页面 → 巡检维度」的自动巡检规则。新增规则仅含四步：选择页面、巡检维度、巡检频率、异常通知。</p>
      </div>
      <button class="primary-action" type="button" @click="openCreate">+ 新建规则</button>
    </header>

    <section class="insp-workspace">
      <form class="insp-query-panel" aria-label="筛选条件" @submit.prevent="applyQuery">
        <label>
          <span>关键词</span>
          <input v-model="draftFilters.keyword" type="search" placeholder="规则名称、页面、站点" />
        </label>
        <label>
          <span>巡检维度</span>
          <select v-model="draftFilters.dimension">
            <option v-for="d in dimensionOptions" :key="d.value" :value="d.value">{{ d.label }}</option>
          </select>
        </label>
        <div class="insp-query-actions">
          <button class="secondary-action" type="button" @click="resetQuery">重置</button>
          <button class="primary-action" type="submit">查询</button>
        </div>
      </form>

      <section class="insp-card insp-table-section" aria-label="巡检规则列表">
        <div class="insp-table-toolbar">
          <div>
            <h2>规则列表</h2>
            <p>共 {{ queryResult.total }} 条，当前第 {{ currentPage }} / {{ totalPages }} 页。</p>
          </div>
        </div>
        <div class="insp-table-scroll">
          <table class="insp-data-table">
            <thead>
              <tr>
                <th>规则名称</th>
                <th>页面</th>
                <th>站点</th>
                <th>巡检维度</th>
                <th>频率</th>
                <th>通知</th>
                <th>状态</th>
                <th class="insp-action-col">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rule in queryResult.rows" :key="rule.id">
                <td>
                  <strong>{{ rule.name }}</strong>
                  <span class="insp-cell-subline">{{ rule.id }}</span>
                </td>
                <td>{{ rule.pageName }}</td>
                <td>{{ rule.site }}</td>
                <td>
                  <span v-for="dim in rule.dimensions" :key="dim" class="insp-dim-tag">{{ dimLabel(dim) }}</span>
                </td>
                <td>{{ rule.frequency }}</td>
                <td>{{ rule.notify }}</td>
                <td>
                  <span class="insp-pill" :data-on="rule.enabled">{{ rule.enabled ? '已启用' : '已停用' }}</span>
                </td>
                <td class="insp-action-col">
                  <button class="text-action" type="button" @click="toggleRule(rule)">
                    {{ rule.enabled ? '停用' : '启用' }}
                  </button>
                </td>
              </tr>
              <tr v-if="!queryResult.rows.length">
                <td class="insp-empty-cell" colspan="8">当前筛选条件下暂无巡检规则。</td>
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

    <!-- 新建规则模态 -->
    <Teleport to="body">
      <div v-if="createVisible" class="insp-modal-mask" @click.self="closeCreate">
        <div class="insp-modal" role="dialog" aria-modal="true" aria-label="新建巡检规则">
          <header class="insp-modal-head">
            <h3>新建巡检规则</h3>
            <button class="insp-modal-close" type="button" @click="closeCreate" aria-label="关闭">×</button>
          </header>

          <ol class="insp-steps">
            <li v-for="(s, i) in steps" :key="s.key" :data-active="i === activeStep" :data-done="i < activeStep">
              <span>{{ i + 1 }}</span>{{ s.label }}
            </li>
          </ol>

          <div class="insp-modal-body">
            <template v-if="activeStep === 0">
              <label class="insp-field">
                <span>选择页面</span>
                <select v-model="form.pageName">
                  <option v-for="p in pageOptions" :key="p" :value="p">{{ p }}</option>
                </select>
              </label>
              <p class="insp-hint">选择页面后自动带出其所属站点。</p>
            </template>

            <template v-else-if="activeStep === 1">
              <span class="insp-field-label">页面模块（可多选巡检维度）</span>
              <div class="insp-check-grid">
                <label v-for="d in CHECK_DIMENSIONS" :key="d.key" class="insp-check">
                  <input type="checkbox" :value="d.key" v-model="form.dimensions" />
                  <span>{{ d.label }}</span>
                </label>
              </div>
            </template>

            <template v-else-if="activeStep === 2">
              <label class="insp-field">
                <span>巡检频率</span>
                <select v-model="form.frequency">
                  <option v-for="f in frequencyOptions" :key="f" :value="f">{{ f }}</option>
                </select>
              </label>
            </template>

            <template v-else>
              <label class="insp-field">
                <span>异常通知</span>
                <select v-model="form.notify">
                  <option v-for="n in notifyOptions" :key="n" :value="n">{{ n }}</option>
                </select>
              </label>
            </template>
          </div>

          <footer class="insp-modal-foot">
            <button class="secondary-action" type="button" @click="closeCreate">取消</button>
            <div class="insp-modal-nav">
              <button class="secondary-action" type="button" :disabled="activeStep === 0" @click="activeStep--">上一步</button>
              <button v-if="activeStep < steps.length - 1" class="primary-action" type="button" @click="nextStep">下一步</button>
              <button v-else class="primary-action" type="button" :disabled="!canSubmit" @click="submitCreate">创建规则</button>
            </div>
          </footer>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import {
  CHECK_DIMENSIONS,
  CHECK_DIMENSION_LABELS,
  listRules,
  type CheckDimensionKey,
  type InspectionRule
} from '@/services/inspection'

const appStore = useAppStore()
const pageId = 'inspection.rules'
const pageSize = 6

const allRules = ref<InspectionRule[]>(listRules())

const defaultFilters = { keyword: '', dimension: 'all' }
const draftFilters = reactive({ ...defaultFilters })
const appliedFilters = ref({ ...defaultFilters })
const currentPage = ref(1)

const dimensionOptions = [
  { value: 'all', label: '全部维度' },
  ...CHECK_DIMENSIONS.map(d => ({ value: d.key, label: d.label }))
]

const queryResult = computed(() => {
  const kw = appliedFilters.value.keyword.trim().toLowerCase()
  const dim = appliedFilters.value.dimension
  const filtered = allRules.value.filter(r => {
    const kwOk = !kw || [r.id, r.name, r.pageName, r.site].some(v => v.toLowerCase().includes(kw))
    const dimOk = dim === 'all' || r.dimensions.includes(dim as CheckDimensionKey)
    return kwOk && dimOk
  })
  const maxPage = Math.max(Math.ceil(filtered.length / pageSize), 1)
  const page = Math.min(Math.max(currentPage.value, 1), maxPage)
  const start = (page - 1) * pageSize
  return {
    rows: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    maxPage
  }
})
const totalPages = computed(() => queryResult.value.maxPage)

onMounted(() => {
  document.title = '联想门户工作台'
  appStore.ensureStaticTab(pageId)
  appStore.setActiveStaticTab(pageId)
})
watch(totalPages, p => { if (currentPage.value > p) currentPage.value = p })

function applyQuery() {
  appliedFilters.value = { ...draftFilters }
  currentPage.value = 1
}
function resetQuery() {
  Object.assign(draftFilters, defaultFilters)
  appliedFilters.value = { ...defaultFilters }
  currentPage.value = 1
}
function changePage(p: number) {
  currentPage.value = Math.min(Math.max(p, 1), totalPages.value)
}
function toggleRule(rule: InspectionRule) {
  rule.enabled = !rule.enabled
  appStore.notify(`${rule.name} 已${rule.enabled ? '启用' : '停用'}`)
}
function dimLabel(key: CheckDimensionKey) {
  return CHECK_DIMENSION_LABELS[key]
}

// ===== 新建规则 =====
const createVisible = ref(false)
const activeStep = ref(0)
const steps = [
  { key: 'page', label: '选择页面' },
  { key: 'dim', label: '巡检维度' },
  { key: 'freq', label: '巡检频率' },
  { key: 'notify', label: '异常通知' }
]
const pageOptions = ['官网首页', '商城首页', '活动专题页', '会员中心', '帮助中心']
const frequencyOptions = ['每小时', '每日', '每周']
const notifyOptions = ['企业微信', '邮件', '飞书', '站内信']

const form = reactive({
  pageName: '官网首页',
  dimensions: [] as CheckDimensionKey[],
  frequency: '每日' as InspectionRule['frequency'],
  notify: '企业微信' as InspectionRule['notify']
})
const canSubmit = computed(() => form.dimensions.length > 0)

function openCreate() {
  activeStep.value = 0
  Object.assign(form, { pageName: '官网首页', dimensions: [], frequency: '每日', notify: '企业微信' })
  createVisible.value = true
}
function closeCreate() {
  createVisible.value = false
}
function nextStep() {
  if (activeStep.value === 1 && !form.dimensions.length) {
    appStore.notify('请至少选择一个巡检维度')
    return
  }
  activeStep.value = Math.min(activeStep.value + 1, steps.length - 1)
}
function submitCreate() {
  const seq = allRules.value.length + 1001
  const newRule: InspectionRule = {
    id: `R-${seq}`,
    name: `${form.pageName}-自定义巡检`,
    pageName: form.pageName,
    site: form.pageName,
    dimensions: [...form.dimensions],
    frequency: form.frequency,
    notify: form.notify,
    enabled: true,
    updatedAt: new Date().toISOString().slice(0, 10)
  }
  allRules.value = [newRule, ...allRules.value]
  appliedFilters.value = { ...defaultFilters }
  currentPage.value = 1
  closeCreate()
  appStore.notify(`已创建规则 ${newRule.id}`)
}
</script>

<style scoped>
.inspection-rules {
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
.insp-page-header h1 { margin: 0; font-size: 20px; color: var(--color-text); }
.insp-page-header p { margin: 4px 0 0; color: var(--color-text-secondary); font-size: 13px; line-height: 1.5; }

.primary-action, .secondary-action, .text-action {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 34px; border-radius: var(--radius); border: 1px solid transparent;
  padding: 0 16px; font-size: 13px; font-weight: 700; white-space: nowrap; cursor: pointer;
}
.primary-action { border-color: var(--color-primary); background: var(--color-primary); color: var(--color-surface); }
.secondary-action { border-color: var(--color-border); background: var(--color-surface); color: var(--color-text-secondary); }
.secondary-action:disabled { cursor: not-allowed; opacity: .45; }
.text-action { border: 0; padding-inline: 4px; background: transparent; color: var(--color-primary); }

.insp-workspace { display: grid; gap: 12px; min-width: 0; }
.insp-query-panel {
  display: grid;
  grid-template-columns: minmax(260px, 1.2fr) minmax(180px, .6fr) auto;
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

.insp-card {
  border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg);
  background: var(--color-surface); box-shadow: var(--shadow);
}
.insp-table-section { overflow: hidden; }
.insp-table-toolbar {
  display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px;
  border-bottom: 1px solid var(--color-border-subtle);
}
.insp-table-toolbar h2 { margin: 0 0 4px; font-size: 16px; color: var(--color-text); }
.insp-table-toolbar p { margin: 0; color: var(--color-text-secondary); font-size: 13px; }
.insp-table-scroll { overflow-x: auto; }
.insp-data-table { width: 100%; min-width: 980px; border-collapse: separate; border-spacing: 0; }
.insp-data-table th, .insp-data-table td {
  border-bottom: 1px solid var(--color-border-subtle); padding: 12px 16px; text-align: left;
  vertical-align: middle; font-size: 13px;
}
.insp-data-table th { background: var(--color-bg-muted); color: var(--color-text-secondary); font-weight: 800; }
.insp-data-table td { color: var(--color-text-secondary); }
.insp-data-table td strong { display: block; color: var(--color-text); font-weight: 800; }
.insp-cell-subline { display: block; margin-top: 4px; color: var(--color-text-tertiary); font-size: 12px; }
.insp-action-col { position: sticky; right: 0; min-width: 96px; background: var(--color-surface); box-shadow: var(--shadow); }
.insp-empty-cell { height: 120px; text-align: center; color: var(--color-text-tertiary); }
.insp-pagination-bar { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; }

.insp-dim-tag {
  display: inline-flex; align-items: center; margin: 0 4px 4px 0; min-height: 22px;
  border-radius: 9999px; padding: 0 8px; background: var(--color-primary-subtle);
  color: var(--color-primary); font-size: 12px; font-weight: 700;
}
.insp-pill {
  display: inline-flex; align-items: center; width: max-content; min-height: 24px;
  border-radius: 9999px; padding: 0 8px; font-size: 12px; font-weight: 800; line-height: 1;
}
.insp-pill[data-on="true"] { background: var(--color-success-bg); color: var(--color-success); }
.insp-pill[data-on="false"] { background: var(--color-bg-muted); color: var(--color-text-secondary); }

/* 模态 */
.insp-modal-mask {
  position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center;
  background: rgba(15, 23, 42, .35); padding: 16px;
}
.insp-modal {
  width: 520px; max-width: 100%; max-height: 86vh; overflow: auto;
  background: var(--color-surface); border-radius: var(--radius-lg); box-shadow: 0 20px 60px rgba(0,0,0,.18);
}
.insp-modal-head {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 16px; border-bottom: 1px solid var(--color-border-subtle);
}
.insp-modal-head h3 { margin: 0; font-size: 16px; color: var(--color-text); }
.insp-modal-close {
  border: 0; background: transparent; font-size: 22px; line-height: 1; color: var(--color-text-tertiary); cursor: pointer;
}
.insp-steps {
  display: flex; gap: 8px; list-style: none; margin: 0; padding: 16px;
  border-bottom: 1px solid var(--color-border-subtle); overflow-x: auto;
}
.insp-steps li {
  display: flex; align-items: center; gap: 6px; white-space: nowrap;
  color: var(--color-text-tertiary); font-size: 12px; font-weight: 700;
}
.insp-steps li span {
  display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px;
  border-radius: 9999px; background: var(--color-bg-muted); color: var(--color-text-secondary); font-size: 12px;
}
.insp-steps li[data-active="true"] { color: var(--color-primary); }
.insp-steps li[data-active="true"] span { background: var(--color-primary); color: #fff; }
.insp-steps li[data-done="true"] span { background: var(--color-primary-subtle); color: var(--color-primary); }
.insp-modal-body { padding: 16px; min-height: 140px; }
.insp-field { display: flex; flex-direction: column; gap: 8px; }
.insp-field > span, .insp-field-label { color: var(--color-text); font-size: 13px; font-weight: 700; }
.insp-field select {
  width: 100%; min-height: 36px; border: 1px solid var(--color-border); border-radius: var(--radius);
  background: var(--color-surface); color: var(--color-text); font-size: 13px; padding: 0 12px; outline: none;
}
.insp-field select:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-subtle); }
.insp-hint { margin: 8px 0 0; color: var(--color-text-tertiary); font-size: 12px; }
.insp-check-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.insp-check {
  display: flex; align-items: center; gap: 8px; padding: 10px 12px;
  border: 1px solid var(--color-border-subtle); border-radius: var(--radius); cursor: pointer;
}
.insp-check input { width: 16px; height: 16px; accent-color: var(--color-primary); }
.insp-check span { color: var(--color-text); font-size: 13px; }
.insp-modal-foot {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 16px; border-top: 1px solid var(--color-border-subtle);
}
.insp-modal-nav { display: flex; gap: 8px; }

@container (max-width: 1039px) {
  .insp-query-panel { grid-template-columns: 1fr; }
  .insp-query-actions { grid-column: 1 / -1; }
  .insp-check-grid { grid-template-columns: 1fr; }
}
</style>
