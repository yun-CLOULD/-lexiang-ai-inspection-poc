// 静态快照数据访问层 —— 对应快照中 window.fetch 拦截器。
// 读取 snapshotData.ts 中的内置快照，按 URL 路径 + 查询参数返回数据。
// 与快照行为保持一致：GET 命中返回数据，未命中返回 []，写操作返回演示 ok。
// 相比原始快照的 fetch stub，这里会真正尊重 limit / status(支持逗号列表) /
// level / site / check 等查询参数，使页面过滤实际可用（结构与原快照一致）。
import { SNAP } from './snapshotData'

export interface SnapResult {
  ok: boolean
  status: number
  json: () => Promise<any>
  text: () => Promise<string>
}

function ok(data: any): SnapResult {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data))
  }
}

function matchSnap(url: string): any {
  if (SNAP[url] !== undefined) return SNAP[url]

  const qIdx = url.indexOf('?')
  const path = qIdx >= 0 ? url.slice(0, qIdx) : url
  const qs = qIdx >= 0 ? url.slice(qIdx + 1) : ''
  const p = new URLSearchParams(qs)

  if (SNAP[path] !== undefined) {
    if (path === '/api/workorders') {
      let arr: any[] = SNAP[path]
      const st = p.get('status')
      const lv = p.get('level')
      const site = p.get('site')
      const check = p.get('check')
      if (st && st !== 'all') {
        const list = st.split(',').map((s) => s.trim()).filter(Boolean)
        arr = arr.filter((w: any) => list.includes(w.status))
      }
      if (lv && lv !== 'all') arr = arr.filter((w: any) => w.level === lv)
      if (site && site !== 'all') arr = arr.filter((w: any) => w.site === site)
      if (check && check !== 'all') {
        arr = arr.filter((w: any) =>
          (w.items || []).some((it: any) => it.check === check)
        )
      }
      const limit = Number(p.get('limit'))
      if (limit && !isNaN(limit)) arr = arr.slice(0, limit)
      return arr
    }
    if (path === '/api/notifications') {
      let arr: any[] = SNAP[path]
      const lv = p.get('level')
      if (lv) arr = arr.filter((n: any) => n.level === lv)
      const limit = Number(p.get('limit'))
      if (limit && !isNaN(limit)) arr = arr.slice(0, limit)
      return arr
    }
    // 其余带查询参数的 GET（如 /api/dashboard?range=7d）按基准路径返回
    return SNAP[path]
  }

  // 单条工单 /api/workorders/<id>
  const m = path.match(/^\/api\/workorders\/(\d+)$/)
  if (m) {
    const all: any[] = SNAP['/api/workorders'] || []
    return all.find((w: any) => String(w.id) === m[1]) || null
  }
  return undefined
}

export async function api(
  url: string,
  method = 'GET',
  body?: any
): Promise<any> {
  const m = (method || 'GET').toUpperCase()
  if (m !== 'GET') {
    // 快照模式下写操作不可用
    return { ok: true, done: 0, status: 'pass', level: 'normal', id: 0 }
  }
  const data = matchSnap(url)
  if (data !== undefined) return ok(data).json()
  return ok([]).json()
}
