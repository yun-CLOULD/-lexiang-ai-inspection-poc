export const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || (import.meta.env.DEV ? 'preview' : 'server')

export const allowPreviewAuth = AUTH_MODE === 'preview'

// 公开免登录模式：VITE_AUTH_MODE=public 时打开即进，不出现登录页（用于公网演示部署）
export const publicMode = AUTH_MODE === 'public'
