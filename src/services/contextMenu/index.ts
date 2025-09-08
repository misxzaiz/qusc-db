// 菜单服务统一导出
export { MenuProvider, ContextMenuManager } from './MenuProvider'
export { RedisMenuProvider, RedisAction } from './RedisMenuProvider'
export { ConnectionMenuProvider, ConnectionAction } from './ConnectionMenuProvider'
export { MySQLMenuProvider, MySQLAction } from './MySQLMenuProvider'
export { PostgreSQLMenuProvider, PostgreSQLAction } from './PostgreSQLMenuProvider'
export { MongoDBMenuProvider, MongoDBAction } from './MongoDBMenuProvider'
export type { MenuItem, MenuContext, OperationResult, DialogOptions } from '@/types/contextMenu'

// 创建全局菜单管理器实例
import { ContextMenuManager } from './MenuProvider'
import { RedisMenuProvider } from './RedisMenuProvider'
import { ConnectionMenuProvider } from './ConnectionMenuProvider'
import { MySQLMenuProvider } from './MySQLMenuProvider'
import { PostgreSQLMenuProvider } from './PostgreSQLMenuProvider'
import { MongoDBMenuProvider } from './MongoDBMenuProvider'

export const globalMenuManager = new ContextMenuManager()

// 注册所有菜单提供器
globalMenuManager.registerProvider(new RedisMenuProvider())
globalMenuManager.registerProvider(new ConnectionMenuProvider())
globalMenuManager.registerProvider(new MySQLMenuProvider())
globalMenuManager.registerProvider(new PostgreSQLMenuProvider())
globalMenuManager.registerProvider(new MongoDBMenuProvider())