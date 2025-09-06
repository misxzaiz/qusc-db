import type { MenuItem, MenuContext, OperationResult } from '@/types/contextMenu'

export abstract class MenuProvider {
  abstract dbType: string
  
  abstract getMenuItems(context: MenuContext): MenuItem[]
  abstract executeAction(actionId: string, context: MenuContext): Promise<OperationResult>
  
  // 通用方法
  protected createSeparator(): MenuItem {
    return { 
      id: `separator_${Math.random().toString(36).substr(2, 9)}`, 
      label: '', 
      separator: true 
    }
  }
  
  protected createDangerItem(id: string, label: string, icon?: string): MenuItem {
    return { id, label, icon, danger: true }
  }
  
  protected createShortcutItem(id: string, label: string, shortcut: string, icon?: string): MenuItem {
    return { id, label, shortcut, icon }
  }
}

export class ContextMenuManager {
  private providers: Map<string, MenuProvider> = new Map()
  
  registerProvider(provider: MenuProvider) {
    this.providers.set(provider.dbType, provider)
    console.log(`已注册 ${provider.dbType} 菜单提供器`)
  }
  
  getMenuItems(context: MenuContext): MenuItem[] {
    const provider = this.providers.get(context.dbType)
    if (!provider) {
      console.warn(`未找到 ${context.dbType} 的菜单提供器`)
      return []
    }
    
    const items = provider.getMenuItems(context)
    console.log(`为 ${context.dbType}/${context.nodeType} 生成了 ${items.length} 个菜单项`)
    return items
  }
  
  async executeAction(actionId: string, context: MenuContext): Promise<OperationResult> {
    const provider = this.providers.get(context.dbType)
    if (!provider) {
      throw new Error(`未找到 ${context.dbType} 的菜单提供器`)
    }
    
    console.log(`执行操作: ${actionId} 在 ${context.dbType}/${context.nodeType}`)
    return provider.executeAction(actionId, context)
  }
  
  getRegisteredProviders(): string[] {
    return Array.from(this.providers.keys())
  }
}