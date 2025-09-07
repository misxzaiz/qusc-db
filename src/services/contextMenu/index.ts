// 菜单服务统一导出
export { MenuProvider, ContextMenuManager } from './MenuProvider'
export { RedisMenuProvider, RedisAction } from './RedisMenuProvider'
export { ConnectionMenuProvider, ConnectionAction } from './ConnectionMenuProvider'
export type { MenuItem, MenuContext, OperationResult, DialogOptions } from '@/types/contextMenu'

// 创建全局菜单管理器实例
import { ContextMenuManager } from './MenuProvider'
import { RedisMenuProvider } from './RedisMenuProvider'
import { ConnectionMenuProvider } from './ConnectionMenuProvider'

export const globalMenuManager = new ContextMenuManager()

// 注册菜单提供器
globalMenuManager.registerProvider(new RedisMenuProvider())
globalMenuManager.registerProvider(new ConnectionMenuProvider())

console.log('已初始化全局菜单管理器并注册Redis和Connection提供器')