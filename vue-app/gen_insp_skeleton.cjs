// Extract the snapshot's static HTML skeleton (the <body> shell + modal + toast)
// verbatim, to mount inside InspectionApp.vue. Avoids hand-transcription errors.
const fs = require('fs')
const path = require('path')

const SNAP = path.resolve(__dirname, '../../ai-inspection-poc/snapshot/index.html')
const OUT = path.resolve(__dirname, 'src/views/inspection/skeleton.html')

const html = fs.readFileSync(SNAP, 'utf8')

// Capture everything from <body> up to the first <script> after it (the main JS).
const m = html.match(/<body>([\s\S]*?)<script>/)
if (!m) { console.error('NO <body> skeleton found'); process.exit(1) }
let body = m[1].trim()

// Prepend the static-demo banner (it lives before <head> in the snapshot).
const banner = `<div id="demo_banner">静态演示快照 · 数据截至 <span id="demo_ts"></span> · 仅展示，写操作不可用</div>\n`

// The snapshot's body already contains <div class="app">…</div>; ensure it sits
// under a wrapper we control. Keep as-is (the .lx-insp root is applied by Vue).
const out = banner + body
fs.writeFileSync(OUT, out, 'utf8')
console.log('written', OUT, out.length, 'bytes; first 80:', out.slice(0, 80).replace(/\n/g, ' '))
