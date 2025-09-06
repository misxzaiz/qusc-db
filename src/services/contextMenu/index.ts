// 菜单服务统一导出
export { MenuProvider, ContextMenuManager } from './MenuProvider'
export { RedisMenuProvider, RedisAction } from './RedisMenuProvider'
export type { MenuItem, MenuContext, OperationResult, DialogOptions } from '@/types/contextMenu'

// 创建全局菜单管理器实例
import { ContextMenuManager } from './MenuProvider'
import { RedisMenuProvider } from './RedisMenuProvider'

export const globalMenuManager = new ContextMenuManager()

// 注册Redis菜单提供器
globalMenuManager.registerProvider(new RedisMenuProvider())

console.log('已初始化全局菜单管理器并注册Redis提供器')