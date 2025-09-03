/**
 * 补全提供器索引文件
 * 统一管理所有补全提供器
 */

import { TableProvider } from './TableProvider.js'
import { ColumnProvider } from './ColumnProvider.js'
import { KeywordProvider } from './KeywordProvider.js'

export { TableProvider, ColumnProvider, KeywordProvider }

/**
 * 补全提供器工厂
 */
export class CompletionProviderFactory {
  constructor(connectionStore, tableReference) {
    this.connectionStore = connectionStore
    this.tableReference = tableReference
    
    // 初始化提供器
    this.providers = {
      table: new TableProvider(connectionStore, tableReference),
      column: new ColumnProvider(connectionStore, tableReference),
      keyword: new KeywordProvider()
    }
  }
  
  /**
   * 根据补全类型获取相应的提供器
   */
  getProvider(completionType) {
    switch (completionType) {
      case 'TABLE':
        return this.providers.table
      case 'COLUMN':
        return this.providers.column
      case 'KEYWORD':
        return this.providers.keyword
      default:
        return null
    }
  }
  
  /**
   * 获取组合补全建议
   */
  async getCombinedCompletions(context) {
    const suggestions = []
    
    // 根据补全类型获取不同的建议
    switch (context.completionType) {
      case 'TABLE':
        suggestions.push(...await this.providers.table.getCompletions(context))
        break
        
      case 'COLUMN':
        suggestions.push(...await this.providers.column.getCompletions(context))
        break
        
      case 'COLUMN_OR_KEYWORD':
        // 组合字段和关键字补全
        suggestions.push(...await this.providers.column.getCompletions(context))
        suggestions.push(...this.providers.keyword.getCompletions(context))
        break
        
      case 'COLUMN_OR_FUNCTION':
        // 组合字段和函数补全
        suggestions.push(...await this.providers.column.getCompletions(context))
        const functionKeywords = this.providers.keyword.getCompletions(context)
          .filter(k => k.info && k.info.includes('函数'))
        suggestions.push(...functionKeywords)
        break
        
      case 'TABLE_OR_KEYWORD':
        // 组合表名和关键字补全
        suggestions.push(...await this.providers.table.getCompletions(context))
        suggestions.push(...this.providers.keyword.getCompletions(context))
        break
        
      case 'COLUMN_OR_OPERATOR':
        // 组合字段和操作符补全
        suggestions.push(...await this.providers.column.getCompletions(context))
        const operatorKeywords = this.providers.keyword.getCompletions(context)
          .filter(k => k.info && k.info.includes('操作符'))
        suggestions.push(...operatorKeywords)
        break
        
      default:
        // 默认提供关键字补全
        suggestions.push(...this.providers.keyword.getCompletions(context))
    }
    
    // 去重和排序
    return this.deduplicateAndSort(suggestions)
  }
  
  /**
   * 去重和排序建议
   */
  deduplicateAndSort(suggestions) {
    const seen = new Set()
    const unique = []
    
    for (const suggestion of suggestions) {
      const key = `${suggestion.type}_${suggestion.label}`
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(suggestion)
      }
    }
    
    // 按权重排序
    return unique.sort((a, b) => (b.boost || 0) - (a.boost || 0))
  }
  
  /**
   * 清空所有提供器的缓存
   */
  clearAllCaches() {
    Object.values(this.providers).forEach(provider => {
      if (typeof provider.clearCache === 'function') {
        provider.clearCache()
      }
    })
  }
}