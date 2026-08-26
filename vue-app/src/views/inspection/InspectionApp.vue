<!--
  乐享 AI 智能巡检平台 —— 与共享快照（ai-inspection-poc/snapshot/index.html）1:1 移植。
  做法：把快照的原生 HTML 骨架（skeleton.html，由 gen_insp_skeleton.cjs 抽取）挂载到
  组件根节点，再用快照同名控制器（此处按 Vue 作用域改写：DOM 查询限定在根节点内，
  数据读取走 snapshotApi 适配器）驱动。CSS 已统一加 .lx-insp 命名空间（insp.css），
  不污染工作台 shell。视觉 / 结构 / 交互与链接完全一致。
-->
<template>
  <div class="lx-insp" ref="root"></div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { onMounted, onUnmounted, ref } from 'vue'
import { api } from '@/services/snapshotApi'
import { SNAP_META } from '@/services/snapshotData'
import skeleton from './skeleton.html?raw'
import './insp.css'

const root = ref<HTMLElement | null>(null)
let winFns: string[] = []

onMounted(() => {
  const R = root.value!
  R.innerHTML = skeleton
  const $ = (s: string) => R.querySelector(s) as any
  const $$ = (s: string) => Array.from(R.querySelectorAll(s)) as any[]

  /* ===== 常量 / 文案 ===== */
  const names = { link: '链接有效性', soldout: '售罄下架', activity: '活动时效', image: '图片加载', consistency: '图文一致性', prize: '互动奖品特效', none: '未配置地址' }
  const SUGGEST_CLIENT = {
    link: '检查跳转目标地址与活动/商品是否匹配，修复 404 或异常跳转；若为测试环境链接请替换为生产地址。',
    soldout: '下架该商品或替换为在售 SKU，避免空坑；如为活动坑位请更新选品。',
    activity: '核对活动结束时间，及时下线过期活动物料或延长有效期。',
    image: '替换裂图/加载失败的广告图，检查 CDN 资源与图片地址有效性。',
    consistency: '对齐展示图与商详页主图/私定图，确保视觉一致，避免误导用户。',
    prize: '检查抽奖/红包组件可用性，修复特效脚本与发放逻辑。',
    none: '为该巡检点补充走查地址 URL，以便进行真实链接与页面校验。'
  }
  function groupByModule(arr: any[]) {
    const groups: any = {}, order: string[] = []
    ;(arr || []).forEach((d: any) => {
      const mods = (d.modules && d.modules.length) ? d.modules : ['未归类模块']
      mods.forEach((mn: string) => { if (!groups[mn]) { groups[mn] = []; order.push(mn) } groups[mn].push(d) })
    })
    return { groups, order }
  }
  function itemRow(d: any) {
    const stTxt = { pass: '正常', fail: '异常', warn: '警告' }[d.status] || d.status
    return `<div class="item"><span class="badge b-${d.status}">${stTxt}</span><div><b>${names[d.check] || d.check}</b> <span class="badge b-${d.level}">${lvLabel(d.level)}</span><br><span class="muted">${d.message}</span></div></div>`
  }
  const lvLabel = (l: string) => ({ normal: '正常', notice: '提示', warning: '警告', critical: '严重' }[l] || '正常')
  const levelNum = (l: string) => ({ critical: 'P1', warning: 'P2', notice: 'P3' }[l] || 'P?')
  function fmtTime(s: any) {
    if (!s) return '-'
    const d = new Date(s.replace(/-/g, '/'))
    if (isNaN(d as any)) return s
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return isToday ? `今日 ${hh}:${mm}` : `${s.slice(0, 10)} ${hh}:${mm}`
  }
  function faultLocLabel(f: any) { return { link: '首焦 Banner', soldout: '商品展示位', activity: '活动利益点', image: '广告图位', consistency: '图文展示区', prize: '互动奖品位', none: '未配置地址' }[f] || '未定位' }
  function detectLabel(p: any) { return p === 'heuristic' ? '规则引擎 (确定性检测，100%)' : (p ? `AI 检测 (${p})` : '规则引擎 (确定性检测，100%)') }
  function catLabel(f: any) { return { link: '链接', soldout: '商品', activity: '活动', image: '图片', consistency: '图文', prize: '互动', none: '其他' }[f] || '其他' }
  const chLabel = (c: any) => c || '站内信'
  function freqText(t: any) {
    const ft = t.freq_type
    if (ft === 'manual') return '手动'
    if (ft === 'hourly') return '每小时'
    if (ft === 'daily') return '每天 ' + (t.cron || '09:00')
    if (ft === 'weekly') return '每周 ' + ((t.cron || '').replace(/^w/, '').trim() || '一 09:00')
    if (ft === 'custom') return 'CRON ' + (t.cron || '(未填)')
    return ft || '每天'
  }
  function parseNames(v: any) { return (v || '').split(/[,，]/).map((s: string) => s.trim()).filter(Boolean) }
  function toast(m: string) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1900) }
  function openModal(title: string, body: string, foot?: string) { $('#modal_title').innerHTML = title; $('#modal_body').innerHTML = body; $('#modal_foot').innerHTML = foot || ''; $('#modal').classList.add('show') }
  function closeModal() { $('#modal').classList.remove('show') }

  /* ===== 导航 / 角色 ===== */
  const titles = { rules: ['巡检规则', '一站式配置规则/AI项/频率/通知'], dash: ['AI 巡检 · 数据总览', '全站页面巡检核心指标，实时掌握风险动态'], work: ['问题处理', '问题状态流转与处理'], notify: ['通知记录', '按异常等级派发'], logs: ['运行日志', '系统运行记录'] }
  const PRIV = { admin: ['dash', 'rules', 'work', 'notify', 'logs'], operation: ['dash', 'rules', 'work'] }
  let ROLE = 'admin'
  const roleName = () => ({ admin: '管理员', operation: '运营' }[ROLE] || '管理员')
  function setRole(r: string) { ROLE = r; applyRole() }
  function applyRole() {
    $$('.nav button[data-tab]').forEach((b: any) => { b.style.display = PRIV[ROLE].includes(b.dataset.tab) ? '' : 'none' })
    const bn = $('#box_notify'); if (bn) bn.style.display = (ROLE === 'operation') ? 'none' : ''
    const ws = $('#box_wo_status'); if (ws) ws.style.gridColumn = (ROLE === 'operation') ? '1 / -1' : ''
    const cr = $('#card_run')
    if (cr) { if (ROLE === 'operation') { cr.removeAttribute('onclick'); cr.style.cursor = 'default' } else { cr.setAttribute('onclick', "switchTab('logs')"); cr.style.cursor = 'pointer' } }
    const cur = $('.nav button.active')
    if (cur && !PRIV[ROLE].includes(cur.dataset.tab)) switchTab('dash')
  }
  function switchTab(t: string) {
    if (!PRIV[ROLE].includes(t)) { toast('当前角色（' + roleName() + '）无权限查看该页面'); switchTab('dash'); return }
    $$('.nav button').forEach((b: any) => b.classList.toggle('active', b.dataset.tab === t))
    $$('.panel').forEach((p: any) => p.classList.toggle('show', p.id === t))
    const bc = $('#breadcrumb')
    if (bc) {
      const labels = { rules: '巡检规则', dash: '数据总览', work: '问题处理', notify: '通知记录', logs: '运行日志' }
      bc.innerHTML = `<span class="crumb-tab active" data-tab="${t}"><span>${labels[t] || t}</span><span class="x" onclick="event.stopPropagation();setRole('${ROLE}')">×</span></span>`
    }
    if (t === 'dash') loadDash()
    if (t === 'rules') loadRules()
    if (t === 'work') { loadWoSummary(); loadWork() }
    if (t === 'notify') loadNotify()
    if (t === 'logs') loadLogs()
  }
  $$('.nav button').forEach((b: any) => (b.onclick = () => switchTab(b.dataset.tab)))

  /* ===== 巡检规则 ===== */
  async function loadRules() {
    const ts = await api('/api/tasks')
    const tb = $('#rules_body'); tb.innerHTML = ''
    ts.forEach((t: any) => {
      const items = JSON.parse(t.check_items || '[]')
      const tr = document.createElement('tr')
      const modCount = (t.modules && t.modules.length) ? t.modules.length : 0
      const pageLabel = t.page_name || t.location || '—'
      tr.innerHTML = `<td class="muted">#${t.id}</td><td>${pageLabel} <span class="pill">${modCount ? modCount + ' 模块' : ''}</span></td>
        <td>${items.map((i: any) => `<span class="pill">${names[i] || i}</span>`).join('') || '—'}</td>
        <td>${freqText(t)}</td><td>${t.enabled ? '<span class="pill on">启用</span>' : '<span class="pill">停用</span>'}</td>
        <td class="muted">${t.last_run_at || '—'}</td>
        <td><button class="btn sm gray" onclick="openTask(${t.id})">编辑</button> <button class="btn sm ghost" onclick="runOne(${t.id})">巡检</button> ${t.enabled ? `<button class="btn sm ghost" onclick="toggleTask(${t.id},false)">停用</button>` : `<button class="btn sm green" onclick="toggleTask(${t.id},true)">启用</button>`}</td>`
      tb.appendChild(tr)
    })
    if (!ts.length) tb.innerHTML = `<tr><td colspan="7" class="empty"><svg viewBox="0 0 64 64" fill="none" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="14" width="44" height="38" rx="3"/><line x1="20" y1="26" x2="44" y2="26"/><line x1="20" y1="34" x2="44" y2="34"/><line x1="20" y1="42" x2="36" y2="42"/></svg><span class="empty-text">暂无规则，点击右上角新增</span></td></tr>`
    const rt = $('#rules_total'); if (rt) rt.textContent = ts.length
  }
  async function toggleTask(id: any, en: any) { await api('/api/tasks/' + id, 'PUT', { enabled: en }); toast(en ? '已启用' : '已停用'); loadRules() }
  let ruleCatalog: any[] = []; let rlSeq = 0; let rlFreq = 'daily'; let curPage: any = { site_id: null, site: '' }
  const CHECKS_DEF = [{ key: 'link', name: '链接有效性' }, { key: 'soldout', name: '售罄下架' }, { key: 'activity', name: '活动时效' }, { key: 'image', name: '图片加载' }, { key: 'consistency', name: '图文一致性' }, { key: 'prize', name: '互动奖品特效' }]
  const CMS_PAGES = ['首页·顶部 Banner', '首页·楼层1 商品坑位', '首页·楼层2 商品坑位', '首页·底部公告栏', '活动页·主会场', '活动页·利益点模块', '活动页·商品列表', '商品详情页·主图与标题', '商品详情页·促销信息', '购物车页·推荐位', '搜索结果页·排序筛选', '个人中心·营销弹窗']
  async function openTask(id?: any) {
    const catalog = await api('/api/check-catalog'); ruleCatalog = catalog || []
    let x: any = {}; if (id) { const all = await api('/api/tasks'); x = all.find((z: any) => z.id == id) || {} }
    const nf = JSON.parse(x.notify || '{}') || {}
    const g = (lv: any) => ((nf[lv] && nf[lv].recipients) || []).join('，')
    const c = (lv: any) => ((nf[lv] && nf[lv].channel) || '站内信')
    const body = `
      <div class="sec">
        <div class="sec-h"><span class="sec-t">① 选择页面</span><span class="sec-hint">选择页面后自动带出巡检地址</span></div>
        <div class="row"><div style="flex:2"><label>页面</label><select id="f_page_id" onchange="onPagePick()"><option value="">— 选择页面 —</option></select></div></div>
        <div class="row" style="margin-top:10px"><div style="flex:1"><label>巡检地址 URL（自动带出）</label><input id="f_url" readonly placeholder="选择页面后自动带出"></div></div>
        <div style="margin-top:10px"><label>走查内容说明</label><textarea id="f_content" placeholder="如 检查商品是否在售、利益点是否过期">${x.content || ''}</textarea></div>
      </div>
      <div class="sec">
        <div class="sec-h"><span class="sec-t">② 页面模块与巡检维度</span><span class="sec-hint" id="f_loc_count">已配置 0 个模块</span></div>
        <div class="loc-list" id="f_loc_list"></div>
        <button class="btn ghost sm" style="margin-top:12px;width:100%" onclick="rlAdd()">＋ 添加模块</button>
      </div>
      <div class="sec">
        <div class="sec-h"><span class="sec-t">巡检频率</span><span class="sec-hint">决定该规则进入调度的方式</span></div>
        <div class="freq-seg" id="f_freq_seg">
          <div class="freq-opt" data-f="manual" onclick="freqPick('manual')">手动执行</div>
          <div class="freq-opt" data-f="hourly" onclick="freqPick('hourly')">每小时</div>
          <div class="freq-opt on" data-f="daily" onclick="freqPick('daily')">每天</div>
          <div class="freq-opt" data-f="weekly" onclick="freqPick('weekly')">每周</div>
          <div class="freq-opt" data-f="custom" onclick="freqPick('custom')">自定义 CRON</div>
        </div>
        <div class="freq-extra" id="f_freq_extra"></div>
      </div>
      <div class="sec">
        <div class="sec-h"><span class="sec-t">异常通知</span><span class="sec-hint">按等级配置通知人与渠道</span></div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div style="border:1px solid var(--line);border-radius:10px;padding:12px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span class="badge b-critical">🔴 严重</span></div><input id="f_n_critical" value="${g('critical')}" placeholder="通知人，逗号分隔"><select id="f_c_critical" style="margin-top:8px">${chOpts(c('critical'))}</select></div>
          <div style="border:1px solid var(--line);border-radius:10px;padding:12px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span class="badge b-warning">🟠 警告</span></div><input id="f_n_warning" value="${g('warning')}" placeholder="通知人，逗号分隔"><select id="f_c_warning" style="margin-top:8px">${chOpts(c('warning'))}</select></div>
          <div style="border:1px solid var(--line);border-radius:10px;padding:12px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span class="badge b-notice">🔵 提示</span></div><input id="f_n_notice" value="${g('notice')}" placeholder="通知人，逗号分隔"><select id="f_c_notice" style="margin-top:8px">${chOpts(c('notice'))}</select></div>
        </div>
      </div>
      <div class="result" id="f_result"><div class="rt">提交的数据结构：</div><pre id="f_result_json"></pre></div>`
    openModal(id ? '编辑巡检规则' : '新增巡检规则', body, `<button class="btn gray" onclick="closeModal()">取消</button>${id ? '<button class="btn ghost" onclick="delTask(' + id + ')">删除</button>' : ''}<button class="btn" onclick="saveTask(${id || ''})">保存</button>`)
    await loadPages(x.page_id)
    rlInit(x)
    $('#f_freq_extra').addEventListener('input', () => { if (['daily', 'weekly', 'custom'].includes(rlFreq)) freqPreview() })
  }
  function rlInit(x: any) {
    const wrap = $('#f_loc_list'); wrap.innerHTML = ''
    const mods = (x.modules && x.modules.length) ? x.modules : [{ name: x.location || '', checks: JSON.parse(x.check_items || '[]') }]
    if (mods.length) mods.forEach((m: any) => rlAdd({ name: m.name, checks: m.check_items || [] })); else rlAdd()
    rlFreq = x.freq_type || 'daily'
    $$('#f_freq_seg .freq-opt').forEach((o: any) => o.classList.toggle('on', o.dataset.f === rlFreq))
    freqRender()
  }
  function rlAdd(preset?: any) {
    rlSeq++; const id = 'rloc_' + rlSeq
    const raw = (preset && preset.name) || ''
    const inCms = CMS_PAGES.includes(raw)
    const isCustom = !!raw && !inCms
    const selName = inCms ? raw : ''
    const customName = isCustom ? raw : ''
    const checks = (preset && preset.checks) || []
    const wrap = $('#f_loc_list')
    const empty = wrap.querySelector('.loc-empty'); if (empty) empty.remove()
    const src = (ruleCatalog && ruleCatalog.length) ? ruleCatalog : CHECKS_DEF
    const chips = src.map((c2: any) => { const key = c2.key, on = checks.includes(key) ? 'on' : ''; return `<span class="chip ${on}" data-k="${key}" onclick="rlChip(this)"><span class="dot"></span>${c2.name}</span>` }).join('')
    const div = document.createElement('div'); div.className = 'loc-item'; div.dataset.id = id
    div.innerHTML = `<div class="lh"><span class="loc-idx">${rlSeq}</span><span class="lt">模块 #${rlSeq}</span><button class="loc-del" type="button" onclick="rlDel('${id}')" aria-label="删除">×</button></div>
      <div class="loc-name"><label>模块名称（与 CMS 页面配置一致）</label>
        <select class="loc-sel" onchange="rlNamePick(this)"><option value="">— 从 CMS 页面模块选择 —</option>${CMS_PAGES.map((p: any) => `<option ${p === selName ? 'selected' : ''}>${p}</option>`).join('')}<option value="__custom__" ${isCustom ? 'selected' : ''}>＋ 其他（自定义填写）</option></select>
        <input class="loc-custom" style="display:${isCustom ? 'block' : 'none'};margin-top:8px" placeholder="输入自定义模块名称" value="${customName}"></div>
      <div class="chk-label">本模块巡检维度（可多选）</div><div class="chips">${chips}</div>`
    wrap.appendChild(div); rlCount()
  }
  function rlDel(id: any) { const el = R.querySelector(`.loc-item[data-id="${id}"]`); if (el) el.remove(); const wrap = $('#f_loc_list'); if (!wrap.children.length) wrap.innerHTML = '<div class="loc-empty">尚未配置巡查位置，点击下方「添加巡查位置」开始</div>'; Array.from(wrap.querySelectorAll('.loc-item')).forEach((el2: any, i: number) => { el2.querySelector('.loc-idx').textContent = i + 1; el2.querySelector('.lt').textContent = '巡查位置 #' + (i + 1) }); rlCount() }
  function rlChip(el: any) { el.classList.toggle('on') }
  function rlNamePick(sel: any) { const item = sel.closest('.loc-item'); const ci = item.querySelector('.loc-custom'); if (sel.value === '__custom__') { ci.style.display = 'block'; ci.focus() } else { ci.style.display = 'none'; ci.value = '' } }
  function rlCount() { const n = $$('.loc-item').length; $('#f_loc_count').textContent = '已配置 ' + n + ' 个模块' }
  function rlCollect() { return Array.from($$('.loc-item')).map((el: any) => { const sel = el.querySelector('.loc-sel'), ci = el.querySelector('.loc-custom'); let name = sel.value; if (sel.value === '__custom__') name = ci.value.trim(); return { name, checks: Array.from(el.querySelectorAll('.chip.on')).map((c: any) => c.dataset.k) } }) }
  const F_WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  function freqPick(f: string) { rlFreq = f; $$('#f_freq_seg .freq-opt').forEach((o: any) => o.classList.toggle('on', o.dataset.f === f)); freqRender() }
  function freqRender() {
    const box = $('#f_freq_extra')
    if (rlFreq === 'manual') box.innerHTML = '<div class="muted" style="font-size:13px">规则保存后不会自动调度，需在主列表手动触发「立即巡检」。</div>'
    else if (rlFreq === 'hourly') box.innerHTML = '<div class="muted" style="font-size:13px">系统将于<b style="color:var(--ink)">每小时整点</b>对该规则执行一次巡检。</div>'
    else if (rlFreq === 'daily') box.innerHTML = `<div class="row"><div><label>执行时间</label><input type="time" id="f_time" value="09:00"></div><div style="flex:2;display:flex;align-items:flex-end"><span class="muted" style="font-size:13px">每天定时执行一次</span></div></div>`
    else if (rlFreq === 'weekly') { const wopt = F_WEEK.map((d: any, i: any) => `<option value="${i}" ${i === 1 ? 'selected' : ''}>${d}</option>`).join(''); box.innerHTML = `<div class="row"><div><label>星期</label><select id="f_week">${wopt}</select></div><div><label>执行时间</label><input type="time" id="f_time" value="09:00"></div></div>` }
    else if (rlFreq === 'custom') box.innerHTML = `<div><label>CRON 表达式</label><input id="f_cron" placeholder="分 时 日 月 周，如 0 9 * * 1-5"></div><div class="muted" style="font-size:12px;margin-top:6px">标准 5 字段：分 时 日 月 周（周 0/7=周日）。</div>`
    freqPreview()
  }
  function freqNext() {
    const now = new Date(); const add = (d: any, m: any) => { const x = new Date(d); x.setMinutes(x.getMinutes() + m); return x }
    const fmt = (d: any) => `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    if (rlFreq === 'manual') return '不入调度，手动触发'
    if (rlFreq === 'hourly') return '每小时整点（下次 ' + fmt(add(now, 60 - now.getMinutes())) + '）'
    if (rlFreq === 'daily') { const [h, m] = ($('#f_time') || {}).value?.split(':').map(Number) || [9, 0]; let d = new Date(now); d.setHours(h, m, 0, 0); if (d <= now) d.setDate(d.getDate() + 1); return '每天 ' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + '（下次 ' + fmt(d) + '）' }
    if (rlFreq === 'weekly') { const w = +($('#f_week') || {}).value || 1; const [h, m] = ($('#f_time') || {}).value?.split(':').map(Number) || [9, 0]; let d = new Date(now); let diff = (w - now.getDay() + 7) % 7; if (diff === 0) { diff = (now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m)) ? 7 : 0 } d.setDate(d.getDate() + diff); d.setHours(h, m, 0, 0); return '每周' + F_WEEK[w] + ' ' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + '（下次 ' + fmt(d) + '）' }
    if (rlFreq === 'custom') { const cr = ($('#f_cron') || {}).value?.trim(); if (!cr) return '按自定义表达式执行（请填写 CRON）'; return '按 CRON「' + cr + '」执行' }
    return ''
  }
  function freqPreview() { const box = $('#f_freq_extra'); const old = box.querySelector('.freq-preview'); if (old) old.remove(); box.insertAdjacentHTML('beforeend', `<div class="freq-preview"><span style="color:var(--primary);font-weight:800">⏱</span><span>下次执行：<b>${freqNext()}</b></span></div>`) }
  function chOpts(sel: any) { const cs = ['站内信', '邮件', '短信', '企业微信']; return cs.map((c2: any) => `<option ${c2 === sel ? 'selected' : ''}>${c2}</option>`).join('') }
  async function loadPages(sel_id?: any) {
    const sel = $('#f_page_id'); if (!sel) return
    sel.innerHTML = '<option value="">— 选择页面 —</option>'
    try { const ps = await api('/api/pages'); ps.forEach((p: any) => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; sel.appendChild(o) }); if (sel_id) { sel.value = sel_id; await onPagePick() } } catch (e) { }
  }
  async function onPagePick() {
    const pid = $('#f_page_id').value; curPage = { site_id: null, site: '' }; const u = $('#f_url')
    if (!pid) { if (u) u.value = ''; return }
    try { const ps = await api('/api/pages'); const p = ps.find((z: any) => String(z.id) === String(pid)); if (p) { if (u) u.value = p.url || ''; curPage = { site_id: p.site_id || null, site: p.site || '' } } } catch (e) { }
  }
  async function saveTask(id?: any) {
    const page_id = $('#f_page_id').value || null
    const url = $('#f_url').value.trim()
    const content = $('#f_content').value.trim()
    const modules = rlCollect()
    const nf = { critical: { recipients: parseNames($('#f_n_critical').value), channel: $('#f_c_critical').value }, warning: { recipients: parseNames($('#f_n_warning').value), channel: $('#f_c_warning').value }, notice: { recipients: parseNames($('#f_n_notice').value), channel: $('#f_c_notice').value } }
    if (!page_id) { alert('请选择页面'); return }
    if (!modules.length || modules.some((m: any) => !m.name)) { alert('请至少配置 1 个模块，并填写模块名称'); return }
    if (modules.some((m: any) => !m.checks.length)) { alert('每个模块至少选择 1 个巡检维度'); return }
    let cron = ''
    if (rlFreq === 'daily') cron = ($('#f_time') || {}).value || '09:00'
    else if (rlFreq === 'weekly') { const w = ($('#f_week') || {}).value || '1'; const v = ($('#f_time') || {}).value || '09:00'; cron = 'w' + w + ' ' + v }
    else if (rlFreq === 'custom') cron = ($('#f_cron') || {}).value?.trim() || ''
    const payload = { site_id: curPage.site_id ? Number(curPage.site_id) : null, site: curPage.site || '', type: '', url, content, page_id: page_id ? Number(page_id) : null, modules: modules.map((m: any) => ({ name: m.name, check_items: m.checks })), location: modules[0].name, check_items: [...new Set(modules.flatMap((m: any) => m.checks))], freq_type: rlFreq, cron, enabled: true, notify: nf }
    try { if (id) await api('/api/tasks/' + id, 'PUT', payload); else await api('/api/tasks', 'POST', payload); closeModal(); toast(id ? '巡检规则已更新' : '巡检规则已创建'); loadRules(); loadDash() } catch (e: any) { toast('保存失败：' + (e.message || e)) }
  }
  async function delTask(id: any) { if (!confirm('确认删除该规则？')) return; await api('/api/tasks/' + id, 'DELETE'); closeModal(); toast('已删除'); loadRules() }
  async function runOne(id: any) { toast('巡检中…'); const r = await api('/api/tasks/' + id + '/run', 'POST', {}); toast(`#${id} 完成：${r.status}（${r.level}）`); loadRules(); loadDash() }

  /* ===== 数据驾驶舱 ===== */
  function deltaTag(cur: any, yest: any, invert: any) {
    if (yest == null) return ''
    const diff = cur - yest
    if (diff === 0) return '<span class="delta flat">— 持平</span>'
    const arrow = diff > 0 ? '↑' : '↓'
    const abs = Math.abs(diff)
    const cls = invert ? (diff > 0 ? 'down' : 'up') : (diff > 0 ? 'up' : 'down')
    return `<span class="delta ${cls}">${arrow}${abs > 0 && cur !== 0 ? ` ${Math.round(abs / (yest || 1) * 100)}%` : ''}</span>`
  }
  async function loadDash() {
    const s = await api('/api/stats'); const d = await api('/api/dashboard')
    const y = s.yesterday || {}
    $('#st_rate').innerHTML = s.healthy_rate + '<small>%</small>' + deltaTag(s.healthy_rate, y.healthy_rate, false)
    $('#st_health_sub').textContent = `通过 ${s.pass} · 部分 ${s.partial} · 异常 ${s.fail}`
    $('#st_fail').innerHTML = s.level_dist.critical + deltaTag(s.level_dist.critical, y.critical, true)
    $('#st_sev_sub').textContent = `警告 ${s.level_dist.warning} · 提示 ${s.level_dist.notice}`
    $('#st_wo').innerHTML = (d.workorder_status.pending + d.workorder_status.in_progress) + deltaTag(d.workorder_status.pending + d.workorder_status.in_progress, y.open, true)
    $('#st_wo_sub').textContent = `处理中 ${d.workorder_status.in_progress} · 已解决 ${d.workorder_status.resolved}`
    const wo = d.workorder_status; const woTotal = (wo.pending || 0) + (wo.in_progress || 0) + (wo.resolved || 0)
    const resolveRate = woTotal > 0 ? Math.round((wo.resolved || 0) / woTotal * 100) : 0
    const rrCls = resolveRate >= 80 ? 'style="color:#16A34A"' : resolveRate >= 50 ? 'style="color:#D97706"' : 'style="color:#DC2626"'
    $('#st_resolve_rate').innerHTML = `<span ${rrCls}>${resolveRate}</span><small>%</small>`
    $('#st_resolve_sub').textContent = `已解决 ${wo.resolved || 0} / 共 ${woTotal} 单`
    $('#st_run').innerHTML = s.runs_today + deltaTag(s.runs_today, y.runs, false)
    $('#st_tasks').textContent = s.tasks_total
    drawTopIssues(d.by_check); drawTrend(s.trend); drawByCheck(d.by_check); drawRanking(d.site_ranking); renderWoList(); loadNotifyPreview()
  }
  function drawTopIssues(bc: any) {
    bc = (bc || []).filter((b: any) => b.fail + b.warn > 0).sort((a: any, b: any) => (b.fail + b.warn) - (a.fail + a.warn))
    if (!bc.length) { $('#top_issues').innerHTML = '<div class="empty">暂无异常</div>'; return }
    const total = bc.reduce((a: any, b: any) => a + b.fail + b.warn, 0) || 1
    let acc = 0, parts = '', legend = ''
    const labels = { link: '链接', soldout: '售罄', activity: '活动', image: '图片', consistency: '图文', prize: '奖品' }
    bc.forEach((b: any, i: number) => {
      const v = b.fail + b.warn; if (v <= 0) return
      const col = b.fail > 0 ? '#DC2626' : '#D97706'
      const st = acc / total * 360, en = (acc + v) / total * 360; acc += v
      const pct = Math.round(v / total * 100)
      parts += `<path d="M100,100 L${100 + 54 * Math.cos((st - 90) * Math.PI / 180)},${100 + 54 * Math.sin((st - 90) * Math.PI / 180)} A54,54 0 ${en - st > 180 ? 1 : 0} 1 ${100 + 54 * Math.cos((en - 90) * Math.PI / 180)},${100 + 54 * Math.sin((en - 90) * Math.PI / 180)} Z" fill="${col}"><title>${b.name} ${v} 项（严重${b.fail}·警告${b.warn} · 占比${pct}%）</title></path>`
      const mid = (st + en) / 2; const labR = 70
      const lx = 100 + labR * Math.cos((mid - 90) * Math.PI / 180); const ly = 100 + labR * Math.sin((mid - 90) * Math.PI / 180)
      if (v / total > 0.08) {
        parts += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="700" fill="${b.fail > 0 ? '#fff' : '#633806'}">${labels[b.key] || b.name}</text>`
        parts += `<text x="${lx}" y="${ly + 15}" text-anchor="middle" dominant-baseline="central" font-size="10" fill="${b.fail > 0 ? 'rgba(255,255,255,.85)' : 'rgba(99,56,6,.7)'}">${v} · ${pct}%</text>`
      }
      legend += `<span style="cursor:default"><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${col};margin-right:6px"></span>${b.name}<b>${v}</b> <span style="color:#8A93A2;font-size:12px">${pct}%</span></span>`
    })
    $('#top_issues').innerHTML = `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><div style="flex-shrink:0"><svg viewBox="0 0 200 200" width="100%" height="150">${parts}<circle cx="100" cy="100" r="34" fill="#fff"></circle><text x="100" y="96" text-anchor="middle" font-size="20" font-weight="800" fill="#1C2230">${total}</text><text x="100" y="116" text-anchor="middle" font-size="11" fill="#8A93A2">异常总数</text></svg></div><div style="flex:1;min-width:160px"><div class="legend" style="display:flex;flex-direction:column;gap:4px">${legend}</div></div></div>`
  }
  function drawTrend(t: any) {
    t = t || []; const W = 540, H = 150, pad = 24; const vals = t.map((d: any) => d.rate == null ? 0 : d.rate); const max = 100
    const pts = t.map((d: any, i: number) => { const x = pad + i * (W - pad * 2) / (t.length - 1); const y = H - pad - (d.rate == null ? 0 : d.rate) / max * (H - pad * 2); return [x, y, d] })
    let path = '', area = ''
    pts.forEach((p: any, i: number) => { path += (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1) + ' ' })
    area = path + `L${pts[pts.length - 1][0].toFixed(1)},${H - pad} L${pts[0][0].toFixed(1)},${H - pad} Z`
    let dots = '', lbl = ''
    pts.forEach((p: any) => { if (p[2].rate != null) { dots += `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#3F78C5"></circle><text x="${p[0]}" y="${p[1] - 9}" text-anchor="middle" font-size="10" fill="#4A5468">${p[2].rate}%</text>`; lbl += `<text x="${p[0]}" y="${H - 6}" text-anchor="middle" font-size="10" fill="#8A93A2">${p[2].date}</text>` } })
    $('#trend').innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="150"><defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3F78C5" stop-opacity=".25"/><stop offset="1" stop-color="#3F78C5" stop-opacity="0"/></linearGradient></defs><line x1="${pad}" y1="${H - pad}" x2="${W - pad}" y2="${H - pad}" stroke="#ECEEF3"/><path d="${area}" fill="url(#tg)"/><path d="${path}" fill="none" stroke="#3F78C5" stroke-width="2.5"/>${dots}${lbl}</svg>`
  }
  let checkRange = 'all'
  async function switchCheckRange(r: any, btn: any) {
    if (r === checkRange) return
    checkRange = r
    $$('#check_range_seg button').forEach((b: any) => b.classList.toggle('on', b === btn))
    const d = await api('/api/dashboard?range=' + r); drawByCheck(d.by_check)
  }
  function drawByCheck(bc: any) {
    bc = bc || []; const max = Math.max(1, ...bc.map((b: any) => b.fail + b.warn)); let html = ''
    bc.filter((b: any) => b.fail + b.warn > 0).forEach((b: any) => { const tot = b.fail + b.warn; const pf = b.fail / tot * 100, pw = 100 - pf; html += `<div style="margin:9px 0;cursor:pointer" onclick="gotoWork({check:'${b.key}',status:'pending,in_progress'})" title="点击查看 ${b.name} 的未解决问题"><div style="display:flex;justify-content:space-between;font-size:13px"><b>${b.name}</b><span class="muted">${tot} 项</span></div><div class="bar" style="margin-top:4px"><span style="width:${pf}%;background:#DC2626" title="严重 ${b.fail}"></span><span style="width:${pw}%;background:#D97706" title="警告 ${b.warn}"></span></div><div style="font-size:11px;color:var(--slate);margin-top:2px">严重 ${b.fail} · 警告 ${b.warn}</div></div>` })
    $('#chart_check').innerHTML = html || '<div class="empty">暂无异常</div>'
  }
  function drawRanking(rk: any) {
    rk = rk || []; let html = ''
    rk.forEach((r: any, i: number) => { const t = `<div class="ri" style="cursor:pointer" onclick="gotoWork({site:'${r.site}',status:'pending,in_progress'})" title="点击查看 ${r.name} 的未解决问题"><span class="no ${i < 3 ? 't' + (i + 1) : ''}">${i + 1}</span><div class="nm"><b>${r.name}</b><small>页面 · 未解决 ${r.count}</small></div><span class="ct">${r.count}</span></div>`; html += t })
    $('#ranking').innerHTML = html || '<div class="empty">暂无未解决故障问题</div>'
  }
  async function renderWoList() {
    let ws: any
    try { ws = await api('/api/workorders?status=pending,in_progress&limit=300') } catch (e) { $('#wo_status').innerHTML = '<div class="empty">问题列表加载失败</div>'; return }
    ws = ws || []
    if (!ws.length) { $('#wo_status').innerHTML = '<div class="empty">🎉 暂无待处理 / 处理中问题</div>'; return }
    ws.sort((a: any, b: any) => (a.created_at || '9999').localeCompare(b.created_at || '9999'))
    const p = ws.filter((w: any) => w.status === 'pending').length, ip = ws.length - p
    const head = `<div class="wo-list-head">待处理 <b style="color:#DC2626">${p}</b> · 处理中 <b style="color:#D97706">${ip}</b> · 按创建时间升序</div>`
    const rows = ws.map((w: any) => {
      const sla = calcAge(w.created_at, w.status)
      const stCls = w.status === 'in_progress' ? 'b-warning' : 'b-critical'
      const item = (w.items && w.items.length) ? w.items[0] : {}
      const issue = (item.check ? (names[item.check] || item.check) : '') || w.fault_loc || ''
      return `<div class="wo-li" onclick="openWork(${w.id})"><span class="badge ${stCls}">${stLabel(w.status)}</span><div class="wo-main"><b>#${w.id}</b> <span class="muted">${w.site || '-'}/${w.location || '-'}</span><span class="badge b-${w.level}">${lvLabel(w.level)}</span></div><div class="wo-issue">${issue ? '<span class="muted">' + issue + '</span>' : ''}</div><span class="wo-sla">${sla}</span></div>`
    }).join('')
    $('#wo_status').innerHTML = head + '<div class="wo-list">' + rows + '</div>'
  }
  async function loadNotifyPreview() {
    const ns = await api('/api/notifications?limit=6'); const ts = await api('/api/tasks'); const map: any = {}; ts.forEach((t: any) => map[t.id] = t)
    if (!ns.length) { $('#notify_preview').innerHTML = '<div class="empty">暂无异常通知（全部正常则不派发）</div>'; return }
    $('#notify_preview').innerHTML = ns.map((n: any) => { const t = map[n.task_id] || {}; return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px dashed var(--line)"><span class="badge b-${n.level}">${lvLabel(n.level)}</span><span style="flex:1">${t.site || '?'}/${t.location || '?'}</span><span class="muted" style="font-size:12px">→ ${n.recipients.join('、')}（${chLabel(n.channel)}）</span></div>` }).join('')
  }

  /* ===== 问题处理 ===== */
  let woFilter: any = { status: 'all', level: 'all', site: 'all', check: 'all' }
  $('#wo_status_sel').onchange = () => { woFilter.status = $('#wo_status_sel').value; loadWork() }
  $('#wo_level_sel').onchange = () => { woFilter.level = $('#wo_level_sel').value; loadWork() }
  $('#wo_site_sel').onchange = () => { woFilter.site = $('#wo_site_sel').value; loadWork() }
  $('#wo_check_sel').onchange = () => { woFilter.check = $('#wo_check_sel').value; loadWork() }
  $('#wo_reset').onclick = () => { $('#wo_status_sel').value = 'all'; $('#wo_level_sel').value = 'all'; $('#wo_site_sel').value = 'all'; $('#wo_check_sel').value = 'all'; woFilter = { status: 'all', level: 'all', site: 'all', check: 'all' }; loadWork() }
  async function ensureWoSites() {
    const sel = $('#wo_site_sel'); if (!sel || sel.dataset.loaded) return
    try { const sites = await api('/api/sites'); sites.forEach((s: any) => { const o = document.createElement('option'); o.value = s.name; o.textContent = s.name; sel.appendChild(o) }); sel.dataset.loaded = '1' } catch (e) { }
  }
  function gotoWork(f: any) {
    f = f || {}; woFilter.status = f.status || 'all'; woFilter.level = f.level || 'all'; woFilter.site = f.site || 'all'; woFilter.check = f.check || 'all'
    const ss = $('#wo_status_sel'), ls = $('#wo_level_sel'), cs = $('#wo_site_sel'), ks = $('#wo_check_sel')
    if (ss) ss.value = woFilter.status; if (ls) ls.value = woFilter.level; if (cs) cs.value = woFilter.site; if (ks) ks.value = woFilter.check
    switchTab('work')
  }
  async function drillTask(taskId: any) {
    const ws = await api('/api/workorders?limit=500'); const w = ws.find((x: any) => x.task_id == taskId)
    woFilter = { status: 'all', level: 'all' }; const ss = $('#wo_status_sel'), ls = $('#wo_level_sel'); if (ss) ss.value = 'all'; if (ls) ls.value = 'all'
    switchTab('work'); await loadWork(); if (w) openWork(w.id); else toast('该任务暂无问题')
  }
  let woSummaryText = ''
  async function loadWoSummary() {
    try {
      const d = await api('/api/inspection-summary'); woSummaryText = d.text || ''
      const wrapP = (s: string) => s.replace(/P1 /g, '<span class="p1">P1</span> ').replace(/P2 /g, '<span class="p2">P2</span> ').replace(/P3 /g, '<span class="p3">P3</span> ')
      $('#wo_summary').innerHTML = `<p>${wrapP(d.paragraphs.summary)}</p><p>${wrapP(d.paragraphs.levels)}</p><p>${wrapP(d.paragraphs.recommendations)}</p>`
    } catch (e) { $('#wo_summary').innerHTML = '<p>摘要加载失败，请稍后重试。</p>' }
  }
  function copySummary() {
    const t = woSummaryText || $('#wo_summary').innerText || ''
    if (!t) { toast('暂无内容可复制'); return }
    navigator.clipboard.writeText(t).then(() => toast('摘要已复制到剪贴板')).catch(() => { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('摘要已复制到剪贴板') } catch { toast('复制失败，请手动复制') }; document.body.removeChild(ta) })
  }
  let woSelected = new Set()
  async function loadWork() {
    await ensureWoSites()
    let url = '/api/workorders?limit=300'; if (woFilter.status !== 'all') url += `&status=${woFilter.status}`; if (woFilter.level !== 'all') url += `&level=${woFilter.level}`
    if (woFilter.site !== 'all') url += `&site=${encodeURIComponent(woFilter.site)}`; if (woFilter.check !== 'all') url += `&check=${woFilter.check}`
    const ws = await api(url); const ts = await api('/api/tasks'); const map: any = {}; ts.forEach((t: any) => map[t.id] = t)
    const tb = $('#wo_body'); tb.innerHTML = ''
    ws.forEach((w: any) => {
      const t = map[w.task_id] || {}; const items = w.items || []
      const sla = calcAge(w.created_at, w.status)
      const tr = document.createElement('tr')
      tr.innerHTML = `<td><input type="checkbox" class="wo-chk" value="${w.id}" ${woSelected.has(w.id) ? 'checked' : ''} onchange="toggleWo(${w.id},this.checked)"></td>
        <td class="muted">#${w.id}</td><td>${w.site || t.site || '?'} / ${w.location || t.location || '?'}</td>
        <td><span class="badge b-${w.level}">${lvLabel(w.level)}</span></td>
        <td>${(items[0] && names[items[0].check] || '—')}${items.length > 1 ? ` +${items.length - 1}` : ''}</td>
        <td>${w.owner ? `<span class="pill on">${w.owner}</span>` : '<span class="muted">未指派</span>'}</td>
        <td><span class="badge ${w.status === 'resolved' ? 'b-pass' : w.status === 'in_progress' ? 'b-warning' : 'b-critical'}">${stLabel(w.status)}</span></td>
        <td>${sla}</td>
        <td>${w.last_recheck_at ? `<span class="muted">${w.last_recheck_at.slice(5, 16)}</span> <span class="badge ${w.last_recheck_status === 'pass' ? 'b-pass' : w.last_recheck_status === 'error' ? 'b-fail' : 'b-warning'}">${w.last_recheck_status === 'pass' ? '通过' : w.last_recheck_status === 'error' ? '异常' : '未通过'}</span>` : '<span class="muted">—</span>'}</td>
        <td style="white-space:nowrap"><button class="btn sm" onclick="recheckWo(${w.id})">复检</button>${w.status !== 'resolved' ? '<button class="btn sm gray" onclick="resolveWo(' + w.id + ')">已解决</button>' : ''}<button class="btn sm ghost" onclick="openWork(${w.id})">查看</button></td>`
      tb.appendChild(tr)
    })
    if (!ws.length) tb.innerHTML = '<tr><td colspan="10" class="empty">该筛选下暂无问题</td></tr>'
    $('#wo_count').innerHTML = ws.length ? `共 <b>${ws.length}</b> 条问题` : '无匹配问题'
    const wt = $('#wo_total'); if (wt) wt.textContent = ws.length
    updateBatchBar()
  }
  function calcAge(createdAt: any, status: any) {
    if (status === 'resolved') return '<span class="muted">已处理</span>'
    if (!createdAt) return '<span class="muted">—</span>'
    const diff = Date.now() - new Date(createdAt.replace(/-/g, '/')).getTime()
    if (diff < 0 || !isFinite(diff)) return '<span class="muted">—</span>'
    const d = Math.floor(diff / 86400000); const h = Math.floor((diff % 86400000) / 3600000); const m = Math.floor((diff % 3600000) / 60000)
    const txt = d > 0 ? `${d}天${h}时` : h > 0 ? `${h}时${m}分` : `${m}分`
    const cls = diff < 14400000 ? 'age-new' : 'age-old'
    return `<span class="age ${cls}">已存在 ${txt}</span>`
  }
  function toggleWo(id: any, checked: any) { if (checked) woSelected.add(id); else woSelected.delete(id); updateBatchBar() }
  function toggleAllWo(checked: any) { $$('.wo-chk').forEach((c: any) => { c.checked = checked; const id = parseInt(c.value); if (checked) woSelected.add(id); else woSelected.delete(id) }); updateBatchBar() }
  function updateBatchBar() { const bar = $('#wo_batch_bar'); const cnt = $('#wo_sel_count'); if (woSelected.size > 0) { bar.style.display = 'flex'; cnt.textContent = `已选 ${woSelected.size} 项` } else { bar.style.display = 'none' } }
  async function batchRecheck() {
    const ids = [...woSelected]; if (!ids.length) return
    if (!confirm(`确认对 ${ids.length} 个问题执行批量复检？`)) return
    toast(`正在批量复检 ${ids.length} 个问题…`)
    try { const r = await api('/api/workorders/batch', 'POST', { action: 'recheck', ids }); const fail = r.total - r.success; toast(`批量复检完成：${r.success}/${r.total} 成功` + (fail ? `，${fail} 个异常` : '')); woSelected.clear(); loadWork() } catch (e: any) { toast('批量复检失败：' + (e.message || e)) }
  }
  async function batchClose() {
    const ids = [...woSelected]; if (!ids.length) return
    if (!confirm(`确认批量关闭 ${ids.length} 个问题（标记为已解决）？`)) return
    try { const r = await api('/api/workorders/batch', 'POST', { action: 'close', ids }); toast(`批量关闭完成：${r.success}/${r.total} 成功`); woSelected.clear(); loadWork() } catch (e: any) { toast('批量关闭失败：' + (e.message || e)) }
  }
  function stLabel(s: any) { return { pending: '待处理', in_progress: '处理中', resolved: '已解决' }[s] || s }
  async function recheckWo(id: any, reopen?: any) {
    const oEl = $('#m_owner'); if (oEl && oEl.value.trim()) { try { await api('/api/workorders/' + id, 'PUT', { owner: oEl.value.trim() }) } catch (e) { } }
    toast('正在对该任务重新巡检…')
    try { const r = await api('/api/workorders/' + id + '/recheck', 'POST'); toast(r.recheck_status === 'error' ? '复检异常：' + (r.error || '巡检执行失败，请重试') : '复检完成：' + (r.recheck_status === 'pass' ? '全部正常，已置「已解决」' : '仍存在异常，置「处理中」')); loadWork(); if (reopen && $('#modal').classList.contains('show')) openWork(id) } catch (e: any) { toast('复检失败：' + (e.message || e)) }
  }
  async function resolveWo(id: any, reopen?: any) {
    if (!confirm('确认将问题 #' + id + ' 标记为「已解决」？')) return
    const oEl = $('#m_owner'); const rEl = $('#m_resolution'); const body: any = { status: 'resolved' }
    if (oEl) body.owner = oEl.value.trim()
    if (rEl && rEl.value.trim()) body.resolution = rEl.value.trim()
    await api('/api/workorders/' + id, 'PUT', body); toast('问题 #' + id + ' 已标记为已解决'); loadWork(); if (reopen && $('#modal').classList.contains('show')) openWork(id)
  }
  async function openWork(id: any) {
    let w: any
    try { w = await api('/api/workorders/' + id) } catch (e: any) { toast('问题加载失败：' + (e.message || e)); return }
    if (!w || !w.id) { toast('问题不存在或已被删除'); return }
    const items = w.items || []
    const { groups: mgroups, order: morder } = groupByModule(items)
    const modTags = morder.length ? morder.map((m: any) => `<span class="pill">${m}</span>`).join(' ') : '<span class="muted">—</span>'
    const shot = genScreenshotMulti(mgroups, morder, w.fault_loc, w.site, w.task)
    const url = (w.task && w.task.url) || (w.result && w.result.url) || ''
    let detailHtml = ''
    if (!morder.length) detailHtml = items.map((d: any) => itemRow(d)).join('') || '<div class="muted">无</div>'
    else detailHtml = morder.map((mn: any, i: number) => { const g = mgroups[mn]; const mx = g.filter((x: any) => x.level === 'critical').length; const rows = g.map((d: any) => itemRow(d)).join(''); return `<div class="mod-card"><div class="mod-h"><span class="mod-idx">M${i + 1}</span><span class="mod-name">${mn}</span><span class="badge ${mx ? 'b-critical' : 'b-warning'}">${g.length} 项</span></div>${rows}</div>` }).join('')
    let suggHtml = ''
    if (!morder.length) suggHtml = `<div class="box suggest">${w.suggestion || '—'}</div>`
    else suggHtml = morder.map((mn: any, i: number) => { const g = mgroups[mn]; const seen = new Set(); const parts: any[] = []; g.forEach((d: any) => { const k = d.check; if (SUGGEST_CLIENT[k as keyof typeof SUGGEST_CLIENT] && !seen.has(k)) { seen.add(k); parts.push(SUGGEST_CLIENT[k as keyof typeof SUGGEST_CLIENT]) } }); const txt = parts.length ? parts.join('；') : '请人工复核该巡检点并修复异常。'; return `<div class="mod-card"><div class="mod-h"><span class="mod-idx">M${i + 1}</span><span class="mod-name">${mn}</span></div><div class="box suggest">${txt}</div></div>` }).join('')
    const body = `
      <div class="sec"><div class="sec-h"><span class="sec-t">基础信息</span></div><div class="info-grid">
        <div class="info-cell"><span class="lab">所属页面</span><span class="val">${w.site || '?'}</span></div>
        <div class="info-cell"><span class="lab">涉及模块</span><span class="val">${modTags}</span></div>
        <div class="info-cell"><span class="lab">页面 URL</span><span class="val">${url ? `<a href="${url}" target="_blank">${url}</a>` : '—'}</span></div>
        <div class="info-cell"><span class="lab">问题分类</span><span class="val">${catLabel(w.fault_loc)}</span></div>
        <div class="info-cell"><span class="lab">检测方式</span><span class="val">${detectLabel(w.result && w.result.ai_provider)}</span></div>
        <div class="info-cell"><span class="lab">负责人</span><span class="val">${w.owner || '未指派'}</span></div>
        <div class="info-cell"><span class="lab">发现时间</span><span class="val">${fmtTime(w.created_at)}</span></div>
        <div class="info-cell"><span class="lab">问题状态</span><span class="val"><span class="badge ${w.status === 'resolved' ? 'b-pass' : w.status === 'in_progress' ? 'b-warning' : 'b-critical'}">${stLabel(w.status)}</span></span></div>
      </div></div>
      <div class="sec"><div class="sec-h"><span class="sec-t">故障定位</span><span class="sec-hint">${morder.length > 1 ? ('M1~M' + morder.length + ' 为各模块异常区域，红框=严重/橙框=警告') : '红框为巡检识别的异常区域'}</span></div>${shot}</div>
      <div class="sec"><div class="sec-h"><span class="sec-t">问题明细</span><span class="sec-hint">共 ${items.length} 项${morder.length ? ' / ' + morder.length + ' 个模块' : ''}</span></div><div class="wo">${detailHtml}</div></div>
      <div class="sec"><div class="sec-h"><span class="sec-t">修改建议（AI 生成）</span><span class="sec-hint">按模块分别给出整改建议</span></div>${suggHtml}</div>
      <div class="sec act"><div class="sec-h"><span class="sec-t">处理信息</span><span class="sec-hint">指派负责人并填写处理结论后可关闭问题</span></div>
        <label>处理负责人</label><input id="m_owner" value="${w.owner || ''}" placeholder="填写负责人姓名 / 工号">
        <label>处理结论 / 闭环备注</label><textarea id="m_resolution" placeholder="填写整改过程与结论">${w.resolution || ''}</textarea></div>`
    openModal(`<span class="modal-title-tag">问题详情<span class="pill b-${w.level}">${levelNum(w.level)}</span></span>`, body, `<button class="btn gray" onclick="closeModal()">关闭</button><button class="btn sm ghost" onclick="recheckWo(${w.id},true)">复检</button>${w.status !== 'resolved' ? '<button class="btn" onclick="resolveWo(' + w.id + ',true)">标记已解决</button>' : ''}`)
  }
  async function setWo(id: any, status: any, owner: any, resolution: any) { const body: any = { status, owner: owner || '' }; if (resolution !== undefined) body.resolution = resolution; await api('/api/workorders/' + id, 'PUT', body); toast('问题已更新：' + stLabel(status)); loadWork(); if ($('#modal').classList.contains('show')) openWork(id) }
  function genScreenshotMulti(mgroups: any, morder: any, faultLoc: any, site: any, task: any) {
    const POS = [[48, 90], [330, 66], [180, 180], [360, 165], [72, 192], [300, 210]]
    const url = (task && task.url) || 'https://www.lenovo.com.cn/...'
    let boxes = ''
    if (!morder.length) {
      const label = { link: '链接跳转异常区域', soldout: '商品展示位', activity: '活动利益点', image: '广告图位', consistency: '图文展示区', prize: '互动奖品位', none: '未配置巡检地址' }[faultLoc] || '故障定位区域'
      const pos = { link: [48, 90], soldout: [330, 66], activity: [180, 180], image: [72, 192], consistency: [360, 165], prize: [120, 54], none: [228, 126] }[faultLoc] || [228, 126]
      const [bx, by] = pos as any
      boxes = `<rect x="${bx}" y="${by}" width="130" height="74" rx="6" fill="rgba(224,36,36,.14)" stroke="#DC2626" stroke-width="2" stroke-dasharray="5 4"/><text x="${bx + 4}" y="${by - 6}" font-size="12" fill="#DC2626" font-weight="700">${label}</text>`
    } else {
      morder.forEach((mn: any, i: number) => { const g = mgroups[mn]; const hasCrit = g.some((d: any) => d.level === 'critical'); const col = hasCrit ? '#DC2626' : '#D97706'; const fill = hasCrit ? 'rgba(224,36,36,.14)' : 'rgba(245,166,35,.16)'; const [bx, by] = POS[i % POS.length] as any; const nm = mn.length > 8 ? mn.slice(0, 8) + '…' : mn; boxes += `<rect x="${bx}" y="${by}" width="130" height="74" rx="6" fill="${fill}" stroke="${col}" stroke-width="2" stroke-dasharray="5 4"/><text x="${bx + 4}" y="${by - 6}" font-size="12" fill="${col}" font-weight="700">M${i + 1} ${nm}</text>` })
    }
    return `<div class="shot"><div class="bar-top"><i></i><i></i><i></i><span class="url">${url}</span></div><svg viewBox="0 0 600 300" width="100%" height="220" style="display:block;background:#fafbfc"><rect x="20" y="20" width="560" height="56" rx="8" fill="#eef1f5"/><rect x="40" y="34" width="120" height="28" rx="6" fill="#dfe4ea"/><rect x="380" y="34" width="170" height="28" rx="14" fill="#e3e8ee"/><rect x="20" y="92" width="260" height="186" rx="8" fill="#eef1f5"/><rect x="300" y="92" width="280" height="88" rx="8" fill="#eef1f5"/><rect x="300" y="192" width="280" height="86" rx="8" fill="#eef1f5"/>${boxes}</svg></div>`
  }
  function genScreenshot(faultLoc: any, site: any, task: any) {
    const label = { link: '链接跳转异常区域', soldout: '商品展示位', activity: '活动利益点', image: '广告图位', consistency: '图文展示区', prize: '互动奖品位', none: '未配置巡检地址' }[faultLoc] || '故障定位区域'
    const pos = { link: [48, 90], soldout: [330, 66], activity: [180, 180], image: [72, 192], consistency: [360, 165], prize: [120, 54], none: [228, 126] }[faultLoc] || [228, 126]
    const bx = (pos as any)[0], by = (pos as any)[1]
    const url = (task && task.url) || 'https://www.lenovo.com.cn/...'
    return `<div class="shot"><div class="bar-top"><i></i><i></i><i></i><span class="url">${url}</span></div><svg viewBox="0 0 600 300" width="100%" height="220" style="display:block;background:#fafbfc"><rect x="20" y="20" width="560" height="56" rx="8" fill="#eef1f5"/><rect x="40" y="34" width="120" height="28" rx="6" fill="#dfe4ea"/><rect x="380" y="34" width="170" height="28" rx="14" fill="#e3e8ee"/><rect x="20" y="92" width="260" height="186" rx="8" fill="#eef1f5"/><rect x="300" y="92" width="280" height="88" rx="8" fill="#eef1f5"/><rect x="300" y="192" width="280" height="86" rx="8" fill="#eef1f5"/><rect x="${bx}" y="${by}" width="130" height="74" rx="6" fill="rgba(224,36,36,.14)" stroke="#DC2626" stroke-width="2" stroke-dasharray="5 4"/><text x="${bx + 4}" y="${by - 6}" font-size="12" fill="#DC2626" font-weight="700">${label}</text></svg></div>`
  }

  /* ===== 通知记录 ===== */
  async function loadNotify() {
    const lv = $('#nf_level').value; const ns = await api('/api/notifications?' + (lv ? ('level=' + lv + '&') : '') + 'limit=300')
    const ts = await api('/api/tasks'); const map: any = {}; ts.forEach((t: any) => map[t.id] = t); const tb = $('#notify_body'); tb.innerHTML = ''
    ns.forEach((n: any) => { const t = map[n.task_id] || {}; const tr = document.createElement('tr'); tr.innerHTML = `<td class="muted">${n.run_at}</td><td>#${n.task_id}</td><td>${t.site || '?'}/${t.location || '?'}</td><td><span class="badge b-${n.level}">${lvLabel(n.level)}</span></td><td>${n.recipients.map((r: any) => `<span class="pill">${r}</span>`).join('')}</td><td class="muted">${chLabel(n.channel)}</td><td><span class="badge on">${n.status}</span></td>`; tb.appendChild(tr) })
    if (!ns.length) tb.innerHTML = '<tr><td colspan="7" class="empty">暂无通知记录</td></tr>'
  }

  /* ===== 日志 ===== */
  async function loadLogs() {
    const ls = await api('/api/logs?limit=120'); const tb = $('#logs_body'); tb.innerHTML = ''
    ls.forEach((l: any) => { const tr = document.createElement('tr'); tr.innerHTML = `<td class="muted">${l.time}</td><td><span class="badge b-${l.level == 'error' || l.level == 'warn' ? 'fail' : 'pass'}">${l.level}</span></td><td>${l.message}</td>`; tb.appendChild(tr) })
    if (!ls.length) tb.innerHTML = '<tr><td colspan="3" class="empty">暂无日志</td></tr>'
  }

  /* ===== 深链 ===== */
  function applyHash() {
    const h = location.hash.replace(/^#/, ''); if (!h) return
    if (h.startsWith('wo=')) { const id = parseInt(h.slice(3), 10); if (id > 0) { switchTab('work'); setTimeout(() => openWork(id), 900) } return }
    const map = ['dash', 'sites', 'rules', 'work', 'notify', 'logs']
    const t = map.includes(h) ? h : 'dash'
    if (!PRIV[ROLE].includes(t)) { switchTab('dash'); return }
    switchTab(t)
  }
  window.addEventListener('hashchange', applyHash)

  /* ===== 帮助浮窗（Popover API） ===== */
  function initHelpTips() {
    $$('.help-tip').forEach((t: any) => {
      const pop = t.querySelector('.help-pop'); if (!pop || pop.dataset.bind) return; pop.dataset.bind = '1'
      try { pop.setAttribute('popover', 'manual') } catch (e) { return }
      const place = (estimate: any) => {
        const r = t.getBoundingClientRect(); const pw = estimate ? 300 : (pop.offsetWidth || 300); const ph = estimate ? 180 : (pop.offsetHeight || 120)
        let left = r.right - pw + 4; if (left < 8) left = 8; if (left + pw > window.innerWidth - 8) left = Math.max(8, window.innerWidth - pw - 8)
        const preferUp = t.classList.contains('up'); let top = preferUp ? r.top - ph - 8 : r.bottom + 8; if (top < 8) top = r.bottom + 8; if (top + ph > window.innerHeight - 8) top = Math.max(8, window.innerHeight - ph - 8)
        pop.style.left = left + 'px'; pop.style.top = top + 'px'; pop.style.right = 'auto'; pop.style.bottom = 'auto'; pop.classList.toggle('up', top < r.top)
      }
      t.addEventListener('mouseenter', () => { try { place(true); pop.showPopover(); requestAnimationFrame(() => place(false)) } catch (e) { } })
      const close = () => { try { pop.hidePopover() } catch (e) { } }
      t.addEventListener('mouseleave', (e: any) => { const rt = e.relatedTarget; if (rt && (rt === pop || pop.contains(rt))) return; setTimeout(() => { if (!pop.matches(':hover')) close() }, 140) })
      pop.addEventListener('mouseleave', close)
    })
  }

  /* ===== init ===== */
  loadDash(); loadRules(); initHelpTips(); applyRole(); setTimeout(applyHash, 1500)
  const ts = $('#demo_ts'); if (ts && SNAP_META) (ts as any).textContent = (SNAP_META as any).generated_at

  // 暴露给骨架中的 inline onclick 处理器
  const exposed: any = { switchTab, setRole, loadDash, api, toast, openTask, runOne, toggleTask, switchCheckRange, closeModal, copySummary, loadWork, toggleAllWo, recheckWo, resolveWo, openWork, batchRecheck, batchClose, gotoWork, rlAdd, rlDel, rlChip, rlNamePick, freqPick, saveTask, delTask, onPagePick, drillTask }
  Object.entries(exposed).forEach(([k, v]) => { (window as any)[k] = v; winFns.push(k) })
})

onUnmounted(() => { winFns.forEach((k) => { delete (window as any)[k] }) })
</script>
