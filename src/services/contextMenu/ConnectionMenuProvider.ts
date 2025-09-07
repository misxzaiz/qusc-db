import { MenuProvider } from './MenuProvider'
import type { MenuItem, MenuContext, OperationResult } from '@/types/contextMenu'

export enum ConnectionAction {
  RECONNECT = 'connection_reconnect',
  DISCONNECT = 'connection_disconnect',
  EDIT = 'connection_edit',
  COPY = 'connection_copy',
  DELETE = 'connection_delete',
  TEST_CONNECTION = 'connection_test',
  VIEW_INFO = 'connection_info'
}

export class ConnectionMenuProvider extends MenuProvider {
  dbType = 'Connection'
  
  getMenuItems(context: MenuContext): MenuItem[] {
    if (context.nodeType !== 'connection') {
      return []
    }
    
    const connection = context.nodeData?.connection
    const isConnected = connection?.status === 'connected'
    const isDisconnected = connection?.status === 'disconnected' || connection?.status === 'error'
    
    const items: MenuItem[] = []
    
    // 连接状态相关操作
    if (isDisconnected) {
      items.push({
        id: ConnectionAction.RECONNECT,
        label: '重新连接',
        icon: 'fas fa-plug'
      })
    }
    
    if (isConnected) {
      items.push({
        id: ConnectionAction.DISCONNECT,
        label: '断开连接',
        icon: 'fas fa-unlink'
      })
    }
    
    items.push({
      id: ConnectionAction.TEST_CONNECTION,
      label: '测试连接',
      icon: 'fas fa-stethoscope'
    })
    
    // 分隔符
    items.push(this.createSeparator())
    
    // 连接信息
    items.push({
      id: ConnectionAction.VIEW_INFO,
      label: '连接信息',
      icon: 'fas fa-info-circle'
    })
    
    // 管理操作
    items.push({
      id: ConnectionAction.EDIT,
      label: '编辑连接',
      icon: 'fas fa-edit'
    })
    
    items.push({
      id: ConnectionAction.COPY,
      label: '复制连接',
      icon: 'fas fa-copy'
    })
    
    // 危险操作
    items.push(this.createSeparator())
    
    items.push(this.createDangerItem(
      ConnectionAction.DELETE,
      '删除连接',
      'fas fa-trash'
    ))
    
    return items
  }
  
  async executeAction(actionId: string, context: MenuContext): Promise<OperationResult> {
    try {
      const connection = context.nodeData?.connection
      
      if (!connection) {
        return {
          success: false,
          message: '连接信息不完整'
        }
      }
      
      switch (actionId) {
        case ConnectionAction.RECONNECT:
          return this.reconnectConnection(connection)
        
        case ConnectionAction.DISCONNECT:
          return this.disconnectConnection(connection)
        
        case ConnectionAction.TEST_CONNECTION:
          return this.testConnection(connection)
        
        case ConnectionAction.VIEW_INFO:
          return this.viewConnectionInfo(connection)
        
        case ConnectionAction.EDIT:
          return this.editConnection(connection)
        
        case ConnectionAction.COPY:
          return this.copyConnection(connection)
        
        case ConnectionAction.DELETE:
          return this.deleteConnection(connection)
        
        default:
          return {
            success: false,
            message: `暂未实现操作: ${actionId}`
          }
      }
    } catch (error) {
      return {
        success: false,
        message: `操作失败: ${error.message}`
      }
    }
  }
  
  private async reconnectConnection(connection: any): Promise<OperationResult> {
    // 触发重新连接事件
    window.dispatchEvent(new CustomEvent('connection-reconnect', {
      detail: { connection }
    }))
    
    return {
      success: true,
      message: `正在重新连接 "${connection.name}"`,
      needsRefresh: true
    }
  }
  
  private async disconnectConnection(connection: any): Promise<OperationResult> {
    // 触发断开连接事件
    window.dispatchEvent(new CustomEvent('connection-disconnect', {
      detail: { connection }
    }))
    
    return {
      success: true,
      message: `已断开连接 "${connection.name}"`,
      needsRefresh: true
    }
  }
  
  private async testConnection(connection: any): Promise<OperationResult> {
    // 触发测试连接事件
    window.dispatchEvent(new CustomEvent('connection-test', {
      detail: { connection }
    }))
    
    return {
      success: true,
      message: `正在测试连接 "${connection.name}"`
    }
  }
  
  private async viewConnectionInfo(connection: any): Promise<OperationResult> {
    // 触发查看连接信息事件
    window.dispatchEvent(new CustomEvent('connection-info', {
      detail: { connection }
    }))
    
    return {
      success: true,
      message: `显示连接 "${connection.name}" 信息`
    }
  }
  
  private async editConnection(connection: any): Promise<OperationResult> {
    // 触发编辑连接事件
    window.dispatchEvent(new CustomEvent('connection-edit', {
      detail: { connection }
    }))
    
    return {
      success: true,
      message: `编辑连接 "${connection.name}"`
    }
  }
  
  private async copyConnection(connection: any): Promise<OperationResult> {
    // 触发复制连接事件
    window.dispatchEvent(new CustomEvent('connection-copy', {
      detail: { connection }
    }))
    
    return {
      success: true,
      message: `复制连接 "${connection.name}"`
    }
  }
  
  private async deleteConnection(connection: any): Promise<OperationResult> {
    // 显示确认对话框
    const confirmed = await this.showConfirmDialog({
      title: '删除连接确认',
      message: `确定要删除连接 "${connection.name}" 吗？此操作不可恢复！`,
      type: 'danger',
      confirmText: '删除'
    })
    
    if (confirmed) {
      // 触发删除连接事件
      window.dispatchEvent(new CustomEvent('connection-delete', {
        detail: { connection }
      }))
      
      return {
        success: true,
        message: `已删除连接 "${connection.name}"`,
        needsRefresh: true
      }
    }
    
    return {
      success: true,
      message: '已取消删除操作'
    }
  }
  
  // ===== 辅助方法 =====
  
  private async showConfirmDialog(options: any): Promise<boolean> {
    return new Promise((resolve) => {
      const event = new CustomEvent('show-confirm-dialog', {
        detail: {
          ...options,
          resolve: resolve
        }
      })
      
      window.dispatchEvent(event)
    })
  }
}