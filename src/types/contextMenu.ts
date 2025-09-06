// 右键菜单系统类型定义

export interface MenuItem {
  id: string
  label: string
  icon?: string
  shortcut?: string
  separator?: boolean
  disabled?: boolean
  danger?: boolean  // 危险操作标记
  children?: MenuItem[]
}

export interface MenuContext {
  nodeType: 'connection' | 'database' | 'table' | 'key' | 'collection'
  dbType: 'MySQL' | 'Redis' | 'MongoDB' | 'PostgreSQL'
  connectionId: string
  databaseName?: string
  nodeName?: string
  nodeData?: any
  position: { x: number, y: number }
}

export interface OperationResult {
  success: boolean
  message?: string
  data?: any
  needsRefresh?: boolean
  affectedNodes?: string[]
}

export interface DialogOptions {
  title: string
  message: string
  type?: 'info' | 'warning' | 'danger'
  confirmText?: string
  cancelText?: string
}