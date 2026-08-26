const fs = require('fs');
const path = require('path');

const SNAP = 'C:/Users/biwy1/WorkBuddy/2026-07-08-12-00-23/ai-inspection-poc/snapshot/index.html';
const OUT = 'C:/Users/biwy1/WorkBuddy/2026-07-08-12-00-23/_preview_src/vue-app/src/services/snapshotData.ts';

const html = fs.readFileSync(SNAP, 'utf8');

// 提取 window.__SNAP__ = {...};
const m = html.match(/window\.__SNAP__\s*=\s*(\{[\s\S]*?\});\s*\nwindow\.__SNAP_META__/);
if (!m) { console.error('NO __SNAP__ found'); process.exit(1); }
const obj = JSON.parse(m[1]);
const keys = Object.keys(obj);
console.log('SNAP keys:', keys.join(', '));
// 关键 key 校验
['/api/sites','/api/pages','/api/tasks','/api/workorders','/api/notifications','/api/logs','/api/stats','/api/dashboard','/api/inspection-summary'].forEach(k=>{
  console.log(k, '=>', obj[k] !== undefined ? (Array.isArray(obj[k]) ? obj[k].length+' items' : typeof obj[k]) : 'MISSING');
});

// 写出 TS 模块
const head = '// 自动提取自 ai-inspection-poc/snapshot/index.html（build_snapshot.py 生成的静态演示快照）\n'
  + '// 数据截至 2026-08-18 16:54，作为巡检 POC 的前端内联数据源（演示用，写操作降级）。\n'
  + '// 与门户工作台 0812 设计系统、快照 UI 完全一致。\n\n'
  + 'export const SNAP: Record<string, any> = ';
const tail = ';\n\nexport const SNAP_META = { generated_at: \'2026-08-18 16:54\' };\n';
fs.writeFileSync(OUT, head + m[1] + tail, 'utf8');
console.log('written:', OUT, fs.statSync(OUT).size, 'bytes');
