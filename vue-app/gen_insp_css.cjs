// Generate a namespaced copy of the snapshot's design-system CSS.
// Every selector gets a `.lx-insp` prefix so it can't leak onto the
// workbench's global `.card / .btn / .modal / .nav` etc.
const fs = require('fs')
const path = require('path')

const SNAP = path.resolve(__dirname, '../../ai-inspection-poc/snapshot/index.html')
const OUT = path.resolve(__dirname, 'src/views/inspection/insp.css')

const html = fs.readFileSync(SNAP, 'utf8')
const m = html.match(/<style>\s*:root\{[\s\S]*?<\/style>/)
if (!m) { console.error('NO design-system <style> found'); process.exit(1) }
let css = m[0].replace(/^<style>/, '').replace(/<\/style>$/, '')

// Brace matcher to split top-level blocks (handles nested @media).
function parse(css) {
  const blocks = []
  let i = 0
  while (i < css.length) {
    // skip whitespace
    while (i < css.length && /\s/.test(css[i])) i++
    if (i >= css.length) break
    if (css[i] === '@') {
      // at-rule: read keyword
      const atMatch = css.slice(i).match(/^@[\w-]+/)
      const kw = atMatch[0]
      if (kw === '@keyframes' || kw === '@font-face') {
        // read until matching }
        let depth = 0, j = i
        for (; j < css.length; j++) { if (css[j] === '{') depth++; else if (css[j] === '}') { depth--; if (depth === 0) { j++; break } } }
        blocks.push({ type: 'raw', text: css.slice(i, j) })
        i = j
        continue
      }
      if (kw === '@media' || kw === '@supports' || kw === '@container') {
        // read condition up to first {
        let j = css.indexOf('{', i)
        const cond = css.slice(i, j).trim()
        // find matching close
        let depth = 0, k = j
        for (; k < css.length; k++) { if (css[k] === '{') depth++; else if (css[k] === '}') { depth--; if (depth === 0) break } }
        const inner = css.slice(j + 1, k)
        blocks.push({ type: 'media', cond, inner })
        i = k + 1
        continue
      }
      // other at-rule (e.g. @import) — keep raw
      let j = css.indexOf(';', i); if (j < 0) j = css.length
      blocks.push({ type: 'raw', text: css.slice(i, j + 1) })
      i = j + 1
      continue
    }
    // normal rule: selector until { ... }
    let j = css.indexOf('{', i)
    if (j < 0) break
    const sel = css.slice(i, j).trim()
    let depth = 0, k = j
    for (; k < css.length; k++) { if (css[k] === '{') depth++; else if (css[k] === '}') { depth--; if (depth === 0) break } }
    const body = css.slice(j + 1, k).trim()
    blocks.push({ type: 'rule', sel, body })
    i = k + 1
  }
  return blocks
}

function prefixSelector(sel) {
  return sel.split(',').map(s => {
    s = s.trim()
    if (!s) return s
    if (s === ':root') return '.lx-insp'
    if (s === 'body') return '.lx-insp'
    if (s === '*') return '.lx-insp, .lx-insp *'
    if (s === 'html') return '.lx-insp'
    // prefix, but keep pseudo/descendant combinators intact
    return '.lx-insp ' + s
  }).join(', ')
}

function render(blocks) {
  let out = ''
  for (const b of blocks) {
    if (b.type === 'raw') out += b.text + '\n'
    else if (b.type === 'media') out += `${b.cond} {\n${render(parse(b.inner))}}\n`
    else if (b.type === 'rule') out += `${prefixSelector(b.sel)} { ${b.body} }\n`
  }
  return out
}

const out = `/* Auto-generated from ai-inspection-poc/snapshot/index.html design-system <style>.\n   All selectors namespaced under .lx-insp to avoid leaking onto the workbench shell. */\n` + render(parse(css))
fs.writeFileSync(OUT, out, 'utf8')
console.log('written', OUT, out.length, 'bytes')
