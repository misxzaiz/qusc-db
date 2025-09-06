import { ref, nextTick } from 'vue'
import { globalMenuManager } from '@/services/contextMenu'
import type { MenuContext, MenuItem } from '@/types/contextMenu'

export function useContextMenu() {
  const showMenu = ref(false)
  const menuItems = ref<MenuItem[]>([])
  const menuPosition = ref({ x: 0, y: 0 })
  const currentContext = ref<MenuContext | null>(null)

  async function handleContextMenu(event: MouseEvent, context: MenuContext) {
    event.preventDefault()
    event.stopPropagation()

    // 设置菜单位置
    menuPosition.value = {
      x: event.clientX,
      y: event.clientY
    }

    // 获取菜单项
    const items = globalMenuManager.getMenuItems(context)
    menuItems.value = items
    currentContext.value = context

    // 显示菜单
    showMenu.value = true

    console.log(`显示 ${context.dbType}/${context.nodeType} 的右键菜单`, items)
  }

  function closeMenu() {
    showMenu.value = false
    menuItems.value = []
    currentContext.value = null
  }

  async function handleMenuItemClick(item: MenuItem) {
    if (!currentContext.value) {
      console.warn('没有当前上下文，无法执行菜单操作')
      return
    }

    try {
      const result = await globalMenuManager.executeAction(item.id, currentContext.value)
      
      if (result.success) {
        console.log('菜单操作成功:', result.message)
        
        // 如果操作成功且有消息，可以显示通知
        if (result.message) {
          window.dispatchEvent(new CustomEvent('show-notification', {
            detail: {
              type: 'success',
              message: result.message
            }
          }))
        }

        // 如果需要刷新，触发刷新事件
        if (result.needsRefresh) {
          window.dispatchEvent(new CustomEvent('refresh-tree-node', {
            detail: {
              context: currentContext.value,
              affectedNodes: result.affectedNodes
            }
          }))
        }
      } else {
        console.error('菜单操作失败:', result.message)
        
        // 显示错误通知
        window.dispatchEvent(new CustomEvent('show-notification', {
          detail: {
            type: 'error',
            message: result.message || '操作失败'
          }
        }))
      }
    } catch (error) {
      console.error('执行菜单操作时出错:', error)
      
      window.dispatchEvent(new CustomEvent('show-notification', {
        detail: {
          type: 'error',
          message: `操作失败: ${error.message}`
        }
      }))
    }
  }

  // 创建菜单上下文的辅助函数
  function createMenuContext(params: {
    nodeType: 'connection' | 'database' | 'table' | 'key' | 'collection'
    dbType: string
    connectionId: string
    databaseName?: string
    nodeName?: string
    nodeData?: any
    event: MouseEvent
  }): MenuContext {
    return {
      nodeType: params.nodeType,
      dbType: params.dbType as any,
      connectionId: params.connectionId,
      databaseName: params.databaseName,
      nodeName: params.nodeName,
      nodeData: params.nodeData,
      position: {
        x: params.event.clientX,
        y: params.event.clientY
      }
    }
  }

  return {
    showMenu,
    menuItems,
    menuPosition,
    currentContext,
    handleContextMenu,
    closeMenu,
    handleMenuItemClick,
    createMenuContext
  }
}