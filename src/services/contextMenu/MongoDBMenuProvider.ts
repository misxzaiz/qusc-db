import { MenuProvider } from './MenuProvider'
import type { MenuItem, MenuContext, OperationResult } from '@/types/contextMenu'

export enum MongoDBAction {
  // 数据库级操作
  REFRESH_DATABASE = 'mongodb_refresh_db',
  DATABASE_INFO = 'mongodb_db_info',
  DATABASE_STATS = 'mongodb_db_stats',
  CREATE_COLLECTION = 'mongodb_create_collection',
  CREATE_VIEW = 'mongodb_create_view',
  SEARCH_COLLECTIONS = 'mongodb_search_collections',
  EXECUTE_COMMAND = 'mongodb_execute_command',
  BACKUP_DATABASE = 'mongodb_backup_db',
  RESTORE_DATABASE = 'mongodb_restore_db',
  
  // 集合级操作
  VIEW_COLLECTION = 'mongodb_view_collection',
  COLLECTION_INFO = 'mongodb_collection_info',
  COLLECTION_STATS = 'mongodb_collection_stats',
  DUPLICATE_COLLECTION = 'mongodb_duplicate_collection',
  RENAME_COLLECTION = 'mongodb_rename_collection',
  DROP_COLLECTION = 'mongodb_drop_collection',
  
  // 文档操作
  FIND_DOCUMENTS = 'mongodb_find_documents',
  INSERT_DOCUMENT = 'mongodb_insert_document',
  UPDATE_DOCUMENTS = 'mongodb_update_documents',
  DELETE_DOCUMENTS = 'mongodb_delete_documents',
  AGGREGATE = 'mongodb_aggregate',
  EXPORT_COLLECTION = 'mongodb_export_collection',
  IMPORT_COLLECTION = 'mongodb_import_collection',
  
  // 索引操作
  VIEW_INDEXES = 'mongodb_view_indexes',
  CREATE_INDEX = 'mongodb_create_index',
  DROP_INDEX = 'mongodb_drop_index',
  REINDEX_COLLECTION = 'mongodb_reindex_collection',
  
  // 验证和约束
  SET_VALIDATION = 'mongodb_set_validation',
  REMOVE_VALIDATION = 'mongodb_remove_validation',
  VIEW_VALIDATION = 'mongodb_view_validation',
  
  // 性能和维护
  EXPLAIN_QUERY = 'mongodb_explain_query',
  PROFILING = 'mongodb_profiling',
  COMPACT_COLLECTION = 'mongodb_compact_collection',
  VALIDATE_COLLECTION = 'mongodb_validate_collection',
  
  // 分片和副本集
  SHARD_COLLECTION = 'mongodb_shard_collection',
  VIEW_SHARDING_INFO = 'mongodb_sharding_info',
  
  // GridFS 操作
  UPLOAD_FILE = 'mongodb_gridfs_upload',
  DOWNLOAD_FILE = 'mongodb_gridfs_download',
  DELETE_FILE = 'mongodb_gridfs_delete'
}

export class MongoDBMenuProvider extends MenuProvider {
  dbType = 'MongoDB'
  
  getMenuItems(context: MenuContext): MenuItem[] {
    switch (context.nodeType) {
      case 'database':
        return this.getDatabaseMenuItems(context)
      case 'collection':
        return this.getCollectionMenuItems(context)
      default:
        return []
    }
  }
  
  private getDatabaseMenuItems(context: MenuContext): MenuItem[] {
    return [
      this.createDisabledItem(MongoDBAction.DATABASE_INFO, '数据库信息', 'fas fa-info-circle'),
      this.createDisabledItem(MongoDBAction.DATABASE_STATS, '数据库统计', 'fas fa-chart-bar'),
      {
        id: MongoDBAction.REFRESH_DATABASE,
        label: '刷新',
        icon: 'fas fa-sync-alt',
        shortcut: 'F5'
      },
      this.createSeparator(),
      {
        id: MongoDBAction.CREATE_COLLECTION,
        label: '新建集合',
        icon: 'fas fa-plus'
      },
      this.createDisabledItem(MongoDBAction.CREATE_VIEW, '新建视图', 'fas fa-eye'),
      this.createSeparator(),
      this.createDisabledItem(MongoDBAction.SEARCH_COLLECTIONS, '搜索集合', 'fas fa-search'),
      this.createSeparator(),
      this.createDisabledItem(MongoDBAction.EXECUTE_COMMAND, '执行命令', 'fas fa-terminal'),
      this.createSeparator(),
      this.createDisabledItem(MongoDBAction.PROFILING, '性能分析', 'fas fa-tachometer-alt'),
      this.createSeparator(),
      this.createDisabledItem(MongoDBAction.BACKUP_DATABASE, '备份数据库', 'fas fa-download'),
      this.createDisabledItem(MongoDBAction.RESTORE_DATABASE, '还原数据库', 'fas fa-upload')
    ]
  }
  
  private getCollectionMenuItems(context: MenuContext): MenuItem[] {
    const isGridFS = this.isGridFSCollection(context)
    const isView = this.isView(context)
    const isCapped = this.isCappedCollection(context)
    
    const baseItems: MenuItem[] = [
      // 查看操作
      this.createShortcutItem(
        MongoDBAction.VIEW_COLLECTION,
        '查看文档',
        'Enter',
        'fas fa-eye'
      ),
      {
        id: MongoDBAction.COLLECTION_INFO,
        label: isView ? '视图信息' : '集合信息',
        icon: 'fas fa-info-circle'
      },
      {
        id: MongoDBAction.COLLECTION_STATS,
        label: isView ? '视图统计' : '集合统计',
        icon: 'fas fa-chart-line'
      }
    ]
    
    if (!isView) {
      baseItems.push(this.createSeparator())
      
      // 文档操作（视图不支持写操作）
      baseItems.push(
        this.createDisabledItem(MongoDBAction.FIND_DOCUMENTS, '查询文档', 'fas fa-search'),
        {
          id: MongoDBAction.INSERT_DOCUMENT,
          label: '插入文档',
          icon: 'fas fa-plus'
        },
        this.createDisabledItem(MongoDBAction.UPDATE_DOCUMENTS, '更新文档', 'fas fa-edit'),
        this.createDisabledItem(MongoDBAction.DELETE_DOCUMENTS, '删除文档', 'fas fa-minus')
      )
      
      baseItems.push(this.createSeparator())
      
      // 聚合操作
      baseItems.push(this.createDisabledItem(MongoDBAction.AGGREGATE, '聚合查询', 'fas fa-filter'))
    }
    
    baseItems.push(this.createSeparator())
    
    // 数据导入导出
    baseItems.push(this.createDisabledItem(MongoDBAction.EXPORT_COLLECTION, '导出数据', 'fas fa-download'))
    
    if (!isView) {
      baseItems.push(this.createDisabledItem(MongoDBAction.IMPORT_COLLECTION, '导入数据', 'fas fa-upload'))
    }
    
    if (!isView) {
      baseItems.push(this.createSeparator())
      
      // 索引操作
      baseItems.push(
        this.createDisabledItem(MongoDBAction.VIEW_INDEXES, '查看索引', 'fas fa-key'),
        {
          id: MongoDBAction.CREATE_INDEX,
          label: '创建索引',
          icon: 'fas fa-plus-square'
        },
        this.createDisabledItem(MongoDBAction.DROP_INDEX, '删除索引', 'fas fa-minus-square'),
        this.createDisabledItem(MongoDBAction.REINDEX_COLLECTION, '重建索引', 'fas fa-redo')
      )
      
      baseItems.push(this.createSeparator())
      
      // 验证和约束
      baseItems.push(
        this.createDisabledItem(MongoDBAction.VIEW_VALIDATION, '查看验证规则', 'fas fa-shield-alt'),
        this.createDisabledItem(MongoDBAction.SET_VALIDATION, '设置验证规则', 'fas fa-shield')
      )
      
      baseItems.push(this.createSeparator())
      
      // 性能和维护操作
      baseItems.push(
        this.createDisabledItem(MongoDBAction.EXPLAIN_QUERY, '查询分析', 'fas fa-search-plus'),
        this.createDisabledItem(MongoDBAction.VALIDATE_COLLECTION, '验证集合', 'fas fa-check')
      )
      
      if (!isCapped) {
        baseItems.push(this.createDisabledItem(MongoDBAction.COMPACT_COLLECTION, '压缩集合', 'fas fa-compress'))
      }
      
      // 分片信息
      baseItems.push(
        this.createSeparator(),
        this.createDisabledItem(MongoDBAction.VIEW_SHARDING_INFO, '分片信息', 'fas fa-sitemap')
      )
      
      // GridFS 特殊操作
      if (isGridFS) {
        baseItems.push(
          this.createSeparator(),
          this.createDisabledItem(MongoDBAction.UPLOAD_FILE, '上传文件', 'fas fa-cloud-upload-alt'),
          this.createDisabledItem(MongoDBAction.DOWNLOAD_FILE, '下载文件', 'fas fa-cloud-download-alt')
        )
      }
    }
    
    baseItems.push(this.createSeparator())
    
    // 集合管理操作
    if (!isView) {
      baseItems.push(
        this.createDisabledItem(MongoDBAction.DUPLICATE_COLLECTION, '复制集合', 'fas fa-copy'),
        this.createDisabledItem(MongoDBAction.RENAME_COLLECTION, '重命名集合', 'fas fa-i-cursor')
      )
    }
    
    // 危险操作
    baseItems.push(
      this.createDangerItem(
        MongoDBAction.DROP_COLLECTION,
        isView ? '删除视图' : '删除集合',
        'fas fa-trash'
      )
    )
    
    return baseItems
  }
  
  async executeAction(actionId: string, context: MenuContext): Promise<OperationResult> {
    try {
      switch (actionId) {
        // 数据库操作
        case MongoDBAction.DATABASE_INFO:
          return this.getDatabaseInfo(context)
        case MongoDBAction.DATABASE_STATS:
          return this.getDatabaseStats(context)
        case MongoDBAction.REFRESH_DATABASE:
          return this.refreshDatabase(context)
        case MongoDBAction.CREATE_COLLECTION:
          return this.createCollection(context)
        case MongoDBAction.CREATE_VIEW:
          return this.createView(context)
        case MongoDBAction.SEARCH_COLLECTIONS:
          return this.searchCollections(context)
        case MongoDBAction.EXECUTE_COMMAND:
          return this.executeCommand(context)
        case MongoDBAction.BACKUP_DATABASE:
          return this.backupDatabase(context)
        case MongoDBAction.RESTORE_DATABASE:
          return this.restoreDatabase(context)
        case MongoDBAction.PROFILING:
          return this.manageProfiling(context)
          
        // 集合操作
        case MongoDBAction.VIEW_COLLECTION:
          return this.viewCollection(context)
        case MongoDBAction.COLLECTION_INFO:
          return this.getCollectionInfo(context)
        case MongoDBAction.COLLECTION_STATS:
          return this.getCollectionStats(context)
        case MongoDBAction.DUPLICATE_COLLECTION:
          return this.duplicateCollection(context)
        case MongoDBAction.RENAME_COLLECTION:
          return this.renameCollection(context)
        case MongoDBAction.DROP_COLLECTION:
          return this.dropCollection(context)
          
        // 文档操作
        case MongoDBAction.FIND_DOCUMENTS:
          return this.findDocuments(context)
        case MongoDBAction.INSERT_DOCUMENT:
          return this.insertDocument(context)
        case MongoDBAction.UPDATE_DOCUMENTS:
          return this.updateDocuments(context)
        case MongoDBAction.DELETE_DOCUMENTS:
          return this.deleteDocuments(context)
        case MongoDBAction.AGGREGATE:
          return this.aggregate(context)
        case MongoDBAction.EXPORT_COLLECTION:
          return this.exportCollection(context)
        case MongoDBAction.IMPORT_COLLECTION:
          return this.importCollection(context)
          
        // 索引操作
        case MongoDBAction.VIEW_INDEXES:
          return this.viewIndexes(context)
        case MongoDBAction.CREATE_INDEX:
          return this.createIndex(context)
        case MongoDBAction.DROP_INDEX:
          return this.dropIndex(context)
        case MongoDBAction.REINDEX_COLLECTION:
          return this.reindexCollection(context)
          
        // 验证操作
        case MongoDBAction.VIEW_VALIDATION:
          return this.viewValidation(context)
        case MongoDBAction.SET_VALIDATION:
          return this.setValidation(context)
        case MongoDBAction.REMOVE_VALIDATION:
          return this.removeValidation(context)
          
        // 性能和维护操作
        case MongoDBAction.EXPLAIN_QUERY:
          return this.explainQuery(context)
        case MongoDBAction.COMPACT_COLLECTION:
          return this.compactCollection(context)
        case MongoDBAction.VALIDATE_COLLECTION:
          return this.validateCollection(context)
          
        // 分片操作
        case MongoDBAction.VIEW_SHARDING_INFO:
          return this.viewShardingInfo(context)
        case MongoDBAction.SHARD_COLLECTION:
          return this.shardCollection(context)
          
        // GridFS 操作
        case MongoDBAction.UPLOAD_FILE:
          return this.uploadFile(context)
        case MongoDBAction.DOWNLOAD_FILE:
          return this.downloadFile(context)
        case MongoDBAction.DELETE_FILE:
          return this.deleteFile(context)
          
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
  
  // ===== 数据库级操作实现 =====
  
  private async getDatabaseInfo(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('database-info', context, {
      title: '数据库信息',
      description: `查看数据库 "${context.databaseName}" 的详细信息`
    })
    return { success: true, message: '显示数据库信息' }
  }
  
  private async getDatabaseStats(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('database-stats', context, {
      title: '数据库统计',
      description: `查看数据库 "${context.databaseName}" 的统计信息`
    })
    return { success: true, message: '显示数据库统计' }
  }
  
  private async refreshDatabase(context: MenuContext): Promise<OperationResult> {
    window.dispatchEvent(new CustomEvent('mongodb-refresh-database', {
      detail: {
        connectionId: context.connectionId,
        databaseName: context.databaseName
      }
    }))
    return { 
      success: true, 
      message: '刷新数据库',
      needsRefresh: true
    }
  }
  
  private async createCollection(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('create-collection', context, {
      title: '新建集合',
      description: `在数据库 "${context.databaseName}" 中创建新集合`
    })
    return { success: true, message: '打开创建集合对话框' }
  }
  
  private async createView(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('create-view', context, {
      title: '新建视图',
      description: `在数据库 "${context.databaseName}" 中创建新视图`
    })
    return { success: true, message: '打开创建视图对话框' }
  }
  
  private async searchCollections(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('search-collections', context, {
      title: '搜索集合',
      description: `在数据库 "${context.databaseName}" 中搜索集合`
    })
    return { success: true, message: '打开搜索集合对话框' }
  }
  
  private async executeCommand(context: MenuContext): Promise<OperationResult> {
    window.dispatchEvent(new CustomEvent('mongodb-open-shell', {
      detail: {
        connectionId: context.connectionId,
        databaseName: context.databaseName
      }
    }))
    return { success: true, message: '打开MongoDB Shell' }
  }
  
  private async backupDatabase(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('backup-database', context, {
      title: '备份数据库',
      description: `备份数据库 "${context.databaseName}"`
    })
    return { success: true, message: '打开备份数据库对话框' }
  }
  
  private async restoreDatabase(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('restore-database', context, {
      title: '还原数据库',
      description: `还原数据库到 "${context.databaseName}"`
    })
    return { success: true, message: '打开还原数据库对话框' }
  }
  
  private async manageProfiling(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('profiling', context, {
      title: '性能分析',
      description: `管理数据库 "${context.databaseName}" 的性能分析`
    })
    return { success: true, message: '打开性能分析对话框' }
  }
  
  // ===== 集合级操作实现 =====
  
  private async viewCollection(context: MenuContext): Promise<OperationResult> {
    window.dispatchEvent(new CustomEvent('mongodb-view-collection', {
      detail: {
        connectionId: context.connectionId,
        databaseName: context.databaseName,
        collectionName: context.nodeName
      }
    }))
    return { success: true, message: `查看集合 "${context.nodeName}"` }
  }
  
  private async getCollectionInfo(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('collection-info', context, {
      title: '集合信息',
      description: `查看集合 "${context.nodeName}" 的详细信息`
    })
    return { success: true, message: '显示集合信息' }
  }
  
  private async getCollectionStats(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('collection-stats', context, {
      title: '集合统计',
      description: `查看集合 "${context.nodeName}" 的统计信息`
    })
    return { success: true, message: '显示集合统计' }
  }
  
  private async duplicateCollection(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('duplicate-collection', context, {
      title: '复制集合',
      description: `复制集合 "${context.nodeName}"`
    })
    return { success: true, message: '打开复制集合对话框' }
  }
  
  private async renameCollection(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('rename-collection', context, {
      title: '重命名集合',
      description: `重命名集合 "${context.nodeName}"`
    })
    return { success: true, message: '打开重命名集合对话框' }
  }
  
  private async dropCollection(context: MenuContext): Promise<OperationResult> {
    const isView = this.isView(context)
    const objectType = isView ? '视图' : '集合'
    
    const confirmed = await this.showConfirmDialog({
      title: `删除${objectType}确认`,
      message: `确定要删除${objectType} "${context.nodeName}" 吗？此操作不可恢复！`,
      type: 'danger',
      confirmText: '删除'
    })
    
    if (confirmed) {
      window.dispatchEvent(new CustomEvent('mongodb-execute-command', {
        detail: {
          connectionId: context.connectionId,
          databaseName: context.databaseName,
          command: `db.${context.nodeName}.drop()`,
          context: context
        }
      }))
      
      return {
        success: true,
        message: `已删除${objectType} "${context.nodeName}"`,
        needsRefresh: true,
        affectedNodes: [context.nodeName!]
      }
    }
    
    return { success: true, message: '已取消删除操作' }
  }
  
  // ===== 文档操作实现 =====
  
  private async findDocuments(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('find-documents', context, {
      title: '查询文档',
      description: `查询集合 "${context.nodeName}" 的文档`
    })
    return { success: true, message: '打开查询文档对话框' }
  }
  
  private async insertDocument(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('insert-document', context, {
      title: '插入文档',
      description: `向集合 "${context.nodeName}" 插入文档`
    })
    return { success: true, message: '打开插入文档对话框' }
  }
  
  private async updateDocuments(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('update-documents', context, {
      title: '更新文档',
      description: `更新集合 "${context.nodeName}" 的文档`
    })
    return { success: true, message: '打开更新文档对话框' }
  }
  
  private async deleteDocuments(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('delete-documents', context, {
      title: '删除文档',
      description: `删除集合 "${context.nodeName}" 的文档`
    })
    return { success: true, message: '打开删除文档对话框' }
  }
  
  private async aggregate(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('aggregate', context, {
      title: '聚合查询',
      description: `对集合 "${context.nodeName}" 执行聚合查询`
    })
    return { success: true, message: '打开聚合查询对话框' }
  }
  
  private async exportCollection(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('export-collection', context, {
      title: '导出数据',
      description: `导出集合 "${context.nodeName}" 的数据`
    })
    return { success: true, message: '打开导出数据对话框' }
  }
  
  private async importCollection(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('import-collection', context, {
      title: '导入数据',
      description: `导入数据到集合 "${context.nodeName}"`
    })
    return { success: true, message: '打开导入数据对话框' }
  }
  
  // ===== 索引操作实现 =====
  
  private async viewIndexes(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('view-indexes', context, {
      title: '查看索引',
      description: `查看集合 "${context.nodeName}" 的索引`
    })
    return { success: true, message: '显示索引信息' }
  }
  
  private async createIndex(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('create-index', context, {
      title: '创建索引',
      description: `为集合 "${context.nodeName}" 创建索引`
    })
    return { success: true, message: '打开创建索引对话框' }
  }
  
  private async dropIndex(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('drop-index', context, {
      title: '删除索引',
      description: `删除集合 "${context.nodeName}" 的索引`
    })
    return { success: true, message: '打开删除索引对话框' }
  }
  
  private async reindexCollection(context: MenuContext): Promise<OperationResult> {
    window.dispatchEvent(new CustomEvent('mongodb-execute-command', {
      detail: {
        connectionId: context.connectionId,
        databaseName: context.databaseName,
        command: `db.${context.nodeName}.reIndex()`,
        context: context
      }
    }))
    return { 
      success: true, 
      message: `正在重建集合 "${context.nodeName}" 的索引`,
      needsRefresh: true
    }
  }
  
  // ===== 验证操作实现 =====
  
  private async viewValidation(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('view-validation', context, {
      title: '查看验证规则',
      description: `查看集合 "${context.nodeName}" 的验证规则`
    })
    return { success: true, message: '显示验证规则' }
  }
  
  private async setValidation(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('set-validation', context, {
      title: '设置验证规则',
      description: `为集合 "${context.nodeName}" 设置验证规则`
    })
    return { success: true, message: '打开设置验证规则对话框' }
  }
  
  private async removeValidation(context: MenuContext): Promise<OperationResult> {
    const confirmed = await this.showConfirmDialog({
      title: '移除验证规则确认',
      message: `确定要移除集合 "${context.nodeName}" 的验证规则吗？`,
      type: 'warning',
      confirmText: '移除'
    })
    
    if (confirmed) {
      window.dispatchEvent(new CustomEvent('mongodb-execute-command', {
        detail: {
          connectionId: context.connectionId,
          databaseName: context.databaseName,
          command: `db.runCommand({collMod: "${context.nodeName}", validator: {}, validationLevel: "off"})`,
          context: context
        }
      }))
      
      return {
        success: true,
        message: `已移除集合 "${context.nodeName}" 的验证规则`,
        needsRefresh: true
      }
    }
    
    return { success: true, message: '已取消移除操作' }
  }
  
  // ===== 性能和维护操作实现 =====
  
  private async explainQuery(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('explain-query', context, {
      title: '查询分析',
      description: `分析集合 "${context.nodeName}" 的查询性能`
    })
    return { success: true, message: '打开查询分析对话框' }
  }
  
  private async compactCollection(context: MenuContext): Promise<OperationResult> {
    const confirmed = await this.showConfirmDialog({
      title: '压缩集合确认',
      message: `确定要压缩集合 "${context.nodeName}" 吗？这可能需要一些时间。`,
      type: 'warning',
      confirmText: '压缩'
    })
    
    if (confirmed) {
      window.dispatchEvent(new CustomEvent('mongodb-execute-command', {
        detail: {
          connectionId: context.connectionId,
          databaseName: context.databaseName,
          command: `db.runCommand({compact: "${context.nodeName}"})`,
          context: context
        }
      }))
      
      return {
        success: true,
        message: `正在压缩集合 "${context.nodeName}"`,
        needsRefresh: true
      }
    }
    
    return { success: true, message: '已取消压缩操作' }
  }
  
  private async validateCollection(context: MenuContext): Promise<OperationResult> {
    window.dispatchEvent(new CustomEvent('mongodb-execute-command', {
      detail: {
        connectionId: context.connectionId,
        databaseName: context.databaseName,
        command: `db.${context.nodeName}.validate()`,
        context: context
      }
    }))
    return { 
      success: true, 
      message: `正在验证集合 "${context.nodeName}"`
    }
  }
  
  // ===== 分片操作实现 =====
  
  private async viewShardingInfo(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('sharding-info', context, {
      title: '分片信息',
      description: `查看集合 "${context.nodeName}" 的分片信息`
    })
    return { success: true, message: '显示分片信息' }
  }
  
  private async shardCollection(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('shard-collection', context, {
      title: '分片集合',
      description: `为集合 "${context.nodeName}" 配置分片`
    })
    return { success: true, message: '打开分片配置对话框' }
  }
  
  // ===== GridFS 操作实现 =====
  
  private async uploadFile(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('gridfs-upload', context, {
      title: '上传文件',
      description: `上传文件到GridFS集合 "${context.nodeName}"`
    })
    return { success: true, message: '打开文件上传对话框' }
  }
  
  private async downloadFile(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('gridfs-download', context, {
      title: '下载文件',
      description: `从GridFS集合 "${context.nodeName}" 下载文件`
    })
    return { success: true, message: '打开文件下载对话框' }
  }
  
  private async deleteFile(context: MenuContext): Promise<OperationResult> {
    this.showMongoDBDialog('gridfs-delete', context, {
      title: '删除文件',
      description: `从GridFS集合 "${context.nodeName}" 删除文件`
    })
    return { success: true, message: '打开文件删除对话框' }
  }
  
  // ===== 辅助方法 =====
  
  private showMongoDBDialog(operation: string, context: MenuContext, options: any = {}): void {
    window.dispatchEvent(new CustomEvent('mongodb-show-dialog', {
      detail: {
        operation,
        connectionId: context.connectionId,
        databaseName: context.databaseName,
        collectionName: context.nodeName,
        context: context,
        options: options
      }
    }))
  }
  
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
  
  private isView(context: MenuContext): boolean {
    return context.nodeData?.type === 'view' || context.nodeData?.objectType === 'view'
  }
  
  private isGridFSCollection(context: MenuContext): boolean {
    const collectionName = context.nodeName || ''
    return collectionName.startsWith('fs.files') || collectionName.startsWith('fs.chunks')
  }
  
  private isCappedCollection(context: MenuContext): boolean {
    return context.nodeData?.capped === true
  }
}