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
  
  protected createDisabledItem(id: string, label: string, icon?: string): MenuItem {
    return { id, label, icon, disabled: true }
  }
}

export class ContextMenuManager {
  private providers: Map<string, MenuProvider> = new Map()
  
  registerProvider(provider: MenuProvider) {
    this.providers.set(provider.dbType, provider)
  }
  
  getMenuItems(context: MenuContext): MenuItem[] {
    const provider = this.providers.get(context.dbType)
    if (!provider) {
      console.warn(`未找到 ${context.dbType} 的菜单提供器`)
      return []
    }
    
    const items = provider.getMenuItems(context)
    return items
  }
  
  async executeAction(actionId: string, context: MenuContext): Promise<OperationResult> {
    const provider = this.providers.get(context.dbType)
    if (!provider) {
      throw new Error(`未找到 ${context.dbType} 的菜单提供器`)
    }
    
    return provider.executeAction(actionId, context)
  }
  
  getRegisteredProviders(): string[] {
    return Array.from(this.providers.keys())
  }
}