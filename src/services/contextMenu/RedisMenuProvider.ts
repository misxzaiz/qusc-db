import { MenuProvider } from './MenuProvider'
import type { MenuItem, MenuContext, OperationResult } from '@/types/contextMenu'

export enum RedisAction {
  // 数据库级操作
  SWITCH_DATABASE = 'redis_switch_db',
  FLUSH_DATABASE = 'redis_flush_db',
  DATABASE_INFO = 'redis_db_info',
  REFRESH_DATABASE = 'redis_refresh_db',
  
  // 键级操作
  VIEW_KEY = 'redis_view_key',
  EDIT_KEY = 'redis_edit_key',
  DELETE_KEY = 'redis_delete_key',
  RENAME_KEY = 'redis_rename_key',
  COPY_KEY_NAME = 'redis_copy_key',
  SET_EXPIRE = 'redis_set_expire',
  REMOVE_EXPIRE = 'redis_remove_expire',
  GET_KEY_INFO = 'redis_key_info',
  
  // 类型特定操作
  STRING_SET = 'redis_string_set',
  STRING_APPEND = 'redis_string_append',
  HASH_VIEW_FIELDS = 'redis_hash_fields',
  HASH_ADD_FIELD = 'redis_hash_add',
  LIST_VIEW = 'redis_list_view',
  LIST_PUSH = 'redis_list_push',
  SET_VIEW_MEMBERS = 'redis_set_members',
  SET_ADD_MEMBER = 'redis_set_add',

  // 新键操作
  CREATE_NEW_KEY = 'redis_create_key'
}

export class RedisMenuProvider extends MenuProvider {
  dbType = 'Redis'
  
  getMenuItems(context: MenuContext): MenuItem[] {
    switch (context.nodeType) {
      case 'database':
        return this.getDatabaseMenuItems(context)
      case 'key':
        return this.getKeyMenuItems(context)
      default:
        return []
    }
  }
  
  private getDatabaseMenuItems(context: MenuContext): MenuItem[] {
    return [
      {
        id: RedisAction.DATABASE_INFO,
        label: '数据库信息',
        icon: 'fas fa-info-circle'
      },
      {
        id: RedisAction.REFRESH_DATABASE,
        label: '刷新',
        icon: 'fas fa-sync-alt',
        shortcut: 'F5'
      },
      this.createSeparator(),
      {
        id: RedisAction.CREATE_NEW_KEY,
        label: '新建键',
        icon: 'fas fa-plus'
      },
      this.createSeparator(),
      {
        id: RedisAction.SWITCH_DATABASE,
        label: '切换数据库',
        icon: 'fas fa-exchange-alt'
      },
      this.createSeparator(),
      this.createDangerItem(
        RedisAction.FLUSH_DATABASE,
        '清空数据库',
        'fas fa-trash-alt'
      )
    ]
  }
  
  private getKeyMenuItems(context: MenuContext): MenuItem[] {
    const keyType = context.nodeData?.type || 'string'
    
    const baseItems: MenuItem[] = [
      this.createShortcutItem(
        RedisAction.VIEW_KEY,
        '查看值',
        'Enter',
        'fas fa-eye'
      ),
      this.createShortcutItem(
        RedisAction.EDIT_KEY,
        '编辑值',
        'F2',
        'fas fa-edit'
      ),
      this.createSeparator(),
      {
        id: RedisAction.GET_KEY_INFO,
        label: '键信息',
        icon: 'fas fa-info'
      },
      this.createSeparator(),
      this.createShortcutItem(
        RedisAction.COPY_KEY_NAME,
        '复制键名',
        'Ctrl+C',
        'fas fa-copy'
      ),
      {
        id: RedisAction.RENAME_KEY,
        label: '重命名',
        icon: 'fas fa-i-cursor'
      },
      this.createSeparator(),
      {
        id: RedisAction.SET_EXPIRE,
        label: '设置过期时间',
        icon: 'fas fa-clock'
      },
      {
        id: RedisAction.REMOVE_EXPIRE,
        label: '移除过期时间',
        icon: 'fas fa-clock'
      }
    ]
    
    // 根据键类型添加特定操作
    const typeSpecificItems = this.getTypeSpecificItems(keyType)
    if (typeSpecificItems.length > 0) {
      baseItems.push(this.createSeparator(), ...typeSpecificItems)
    }
    
    // 危险操作
    baseItems.push(
      this.createSeparator(),
      this.createDangerItem(RedisAction.DELETE_KEY, '删除键', 'fas fa-trash')
    )
    
    return baseItems
  }
  
  private getTypeSpecificItems(keyType: string): MenuItem[] {
    switch (keyType.toLowerCase()) {
      case 'string':
        return [
          {
            id: RedisAction.STRING_APPEND,
            label: '追加内容',
            icon: 'fas fa-plus'
          }
        ]
      
      case 'hash':
        return [
          {
            id: RedisAction.HASH_VIEW_FIELDS,
            label: '查看所有字段',
            icon: 'fas fa-list'
          },
          {
            id: RedisAction.HASH_ADD_FIELD,
            label: '添加字段',
            icon: 'fas fa-plus'
          }
        ]
      
      case 'list':
        return [
          {
            id: RedisAction.LIST_VIEW,
            label: '查看列表',
            icon: 'fas fa-list-ol'
          },
          {
            id: RedisAction.LIST_PUSH,
            label: '添加元素',
            icon: 'fas fa-plus'
          }
        ]
      
      case 'set':
        return [
          {
            id: RedisAction.SET_VIEW_MEMBERS,
            label: '查看成员',
            icon: 'fas fa-users'
          },
          {
            id: RedisAction.SET_ADD_MEMBER,
            label: '添加成员',
            icon: 'fas fa-user-plus'
          }
        ]
      
      default:
        return []
    }
  }
  
  async executeAction(actionId: string, context: MenuContext): Promise<OperationResult> {
    try {
      switch (actionId) {
        case RedisAction.VIEW_KEY:
          return this.viewKey(context)
        
        case RedisAction.EDIT_KEY:
          return this.editKey(context)
        
        case RedisAction.DELETE_KEY:
          return this.deleteKey(context)
        
        case RedisAction.DATABASE_INFO:
          return this.getDatabaseInfo(context)
        
        case RedisAction.REFRESH_DATABASE:
          return this.refreshDatabase(context)
        
        case RedisAction.COPY_KEY_NAME:
          return this.copyKeyName(context)
          
        case RedisAction.CREATE_NEW_KEY:
          return this.createKey(context)
        
        case RedisAction.SEARCH_KEYS:
          return this.searchKeys(context)
        
        case RedisAction.FLUSH_DATABASE:
          return this.flushDatabase(context)
          
        case RedisAction.SWITCH_DATABASE:
          return this.switchDatabase(context)
          
        // Hash 操作
        case RedisAction.HASH_VIEW_FIELDS:
          return this.hashViewFields(context)
        
        case RedisAction.HASH_ADD_FIELD:
          return this.hashAddField(context)
        
        // List 操作
        case RedisAction.LIST_VIEW_ELEMENTS:
          return this.listViewElements(context)
        
        case RedisAction.LIST_PUSH_LEFT:
        case RedisAction.LIST_PUSH_RIGHT:
          return this.listPushElement(context, actionId)
        
        // Set 操作
        case RedisAction.SET_VIEW_MEMBERS:
          return this.setViewMembers(context)
        
        case RedisAction.SET_ADD_MEMBER:
          return this.setAddMember(context)
        
        // String 操作
        case RedisAction.STRING_APPEND:
          return this.stringAppend(context)
        
        // TTL 操作
        case RedisAction.SET_EXPIRE:
          return this.setExpire(context)
        
        case RedisAction.REMOVE_EXPIRE:
          return this.removeExpire(context)
        
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
  
  private async viewKey(context: MenuContext): Promise<OperationResult> {
    // 触发打开查看对话框的事件
    window.dispatchEvent(new CustomEvent('redis-view-key', {
      detail: {
        keyName: context.nodeName,
        connectionId: context.connectionId,
        databaseName: context.databaseName
      }
    }))
    
    return { 
      success: true, 
      message: `查看键 ${context.nodeName}` 
    }
  }
  
  private async editKey(context: MenuContext): Promise<OperationResult> {
    // 触发打开编辑对话框的事件
    window.dispatchEvent(new CustomEvent('redis-edit-key', {
      detail: {
        keyName: context.nodeName,
        connectionId: context.connectionId,
        databaseName: context.databaseName
      }
    }))
    
    return { 
      success: true, 
      message: `编辑键 ${context.nodeName}` 
    }
  }
  
  private async deleteKey(context: MenuContext): Promise<OperationResult> {
    // 触发删除确认对话框的事件
    window.dispatchEvent(new CustomEvent('redis-delete-key', {
      detail: {
        keyName: context.nodeName,
        connectionId: context.connectionId,
        databaseName: context.databaseName
      }
    }))
    
    return { 
      success: true, 
      message: `删除键 ${context.nodeName}`,
      needsRefresh: true,
      affectedNodes: [context.nodeName!]
    }
  }
  
  private async getDatabaseInfo(context: MenuContext): Promise<OperationResult> {
    // 触发显示数据库信息对话框的事件
    window.dispatchEvent(new CustomEvent('redis-database-info', {
      detail: {
        connectionId: context.connectionId,
        databaseName: context.databaseName
      }
    }))
    
    return { 
      success: true, 
      message: `显示数据库 ${context.databaseName} 信息` 
    }
  }
  
  private async refreshDatabase(context: MenuContext): Promise<OperationResult> {
    // 触发刷新数据库的事件
    window.dispatchEvent(new CustomEvent('redis-refresh-database', {
      detail: {
        connectionId: context.connectionId,
        databaseName: context.databaseName
      }
    }))
    
    return { 
      success: true, 
      message: `刷新数据库 ${context.databaseName}`,
      needsRefresh: true
    }
  }
  
  private async copyKeyName(context: MenuContext): Promise<OperationResult> {
    try {
      await navigator.clipboard.writeText(context.nodeName!)
      return { 
        success: true, 
        message: `已复制键名: ${context.nodeName}` 
      }
    } catch (error) {
      return {
        success: false,
        message: '复制失败，请手动复制'
      }
    }
  }
  
  // ===== 新增操作方法 =====
  
  private async createKey(context: MenuContext): Promise<OperationResult> {
    this.showOperationDialog('set', context, {
      title: '创建新键',
      description: '创建一个新的Redis键',
      isNewKey: true
    })
    return { success: true, message: '打开创建键对话框' }
  }
  
  private async searchKeys(context: MenuContext): Promise<OperationResult> {
    this.showOperationDialog('keys', context, {
      title: '搜索键',
      description: '使用模式匹配搜索键'
    })
    return { success: true, message: '打开搜索键对话框' }
  }
  
  private async flushDatabase(context: MenuContext): Promise<OperationResult> {
    window.dispatchEvent(new CustomEvent('redis-flush-database', {
      detail: {
        connectionId: context.connectionId,
        databaseName: context.databaseName
      }
    }))
    return { 
      success: true, 
      message: '清空数据库操作已触发',
      needsRefresh: true
    }
  }
  
  private async switchDatabase(context: MenuContext): Promise<OperationResult> {
    this.showOperationDialog('switch-database', context, {
      title: '切换数据库',
      description: '选择要切换到的Redis数据库'
    })
    return { success: true, message: '打开切换数据库对话框' }
  }
  
  // Hash 操作
  private async hashViewFields(context: MenuContext): Promise<OperationResult> {
    this.showOperationDialog('hgetall', context, {
      title: 'Hash - 查看所有字段',
      description: `查看Hash "${context.nodeName}" 的所有字段`
    })
    return { success: true, message: '打开Hash查看对话框' }
  }
  
  private async hashAddField(context: MenuContext): Promise<OperationResult> {
    this.showOperationDialog('hset', context, {
      title: 'Hash - 设置字段',
      description: `为Hash "${context.nodeName}" 设置字段值`
    })
    return { success: true, message: '打开Hash设置对话框' }
  }
  
  // List 操作
  private async listViewElements(context: MenuContext): Promise<OperationResult> {
    this.showOperationDialog('lrange', context, {
      title: 'List - 查看元素',
      description: `查看List "${context.nodeName}" 的所有元素`
    })
    return { success: true, message: '打开List查看对话框' }
  }
  
  private async listPushElement(context: MenuContext, actionId: string): Promise<OperationResult> {
    const isLeft = actionId === RedisAction.LIST_PUSH_LEFT
    this.showOperationDialog(isLeft ? 'lpush' : 'rpush', context, {
      title: `List - ${isLeft ? '左侧' : '右侧'}推入`,
      description: `向List "${context.nodeName}" ${isLeft ? '左侧' : '右侧'}推入元素`
    })
    return { success: true, message: `打开List${isLeft ? '左侧' : '右侧'}推入对话框` }
  }
  
  // Set 操作
  private async setViewMembers(context: MenuContext): Promise<OperationResult> {
    this.showOperationDialog('smembers', context, {
      title: 'Set - 查看成员',
      description: `查看Set "${context.nodeName}" 的所有成员`
    })
    return { success: true, message: '打开Set查看对话框' }
  }
  
  private async setAddMember(context: MenuContext): Promise<OperationResult> {
    this.showOperationDialog('sadd', context, {
      title: 'Set - 添加成员',
      description: `向Set "${context.nodeName}" 添加成员`
    })
    return { success: true, message: '打开Set添加对话框' }
  }
  
  // String 操作
  private async stringAppend(context: MenuContext): Promise<OperationResult> {
    this.showOperationDialog('append', context, {
      title: 'String - 追加内容',
      description: `向字符串 "${context.nodeName}" 追加内容`
    })
    return { success: true, message: '打开String追加对话框' }
  }
  
  // TTL 操作
  private async setExpire(context: MenuContext): Promise<OperationResult> {
    this.showOperationDialog('expire', context, {
      title: '设置过期时间',
      description: `为键 "${context.nodeName}" 设置过期时间`
    })
    return { success: true, message: '打开设置过期时间对话框' }
  }
  
  private async removeExpire(context: MenuContext): Promise<OperationResult> {
    window.dispatchEvent(new CustomEvent('redis-execute-command', {
      detail: {
        connectionId: context.connectionId,
        databaseName: context.databaseName,
        command: `PERSIST ${context.nodeName}`,
        context: context
      }
    }))
    return { 
      success: true, 
      message: `移除键 "${context.nodeName}" 的过期时间`,
      needsRefresh: true
    }
  }
  
  // ===== 辅助方法 =====
  
  private showOperationDialog(operation: string, context: MenuContext, options: any = {}): void {
    window.dispatchEvent(new CustomEvent('redis-show-operation-dialog', {
      detail: {
        operation,
        keyName: context.nodeName,
        dataType: context.nodeData?.dataType || 'String',
        connectionId: context.connectionId,
        databaseName: context.databaseName,
        context: context,
        options: options
      }
    }))
  }
}