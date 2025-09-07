import { MenuProvider } from './MenuProvider'
import type { MenuItem, MenuContext, OperationResult } from '@/types/contextMenu'

export enum PostgreSQLAction {
  // 数据库级操作
  REFRESH_DATABASE = 'pgsql_refresh_db',
  DATABASE_INFO = 'pgsql_db_info',
  CREATE_TABLE = 'pgsql_create_table',
  CREATE_VIEW = 'pgsql_create_view',
  CREATE_FUNCTION = 'pgsql_create_function',
  CREATE_SEQUENCE = 'pgsql_create_sequence',
  SEARCH_OBJECTS = 'pgsql_search_objects',
  BACKUP_DATABASE = 'pgsql_backup_db',
  RESTORE_DATABASE = 'pgsql_restore_db',
  EXECUTE_SQL = 'pgsql_execute_sql',
  
  // 表级操作
  VIEW_TABLE = 'pgsql_view_table',
  EDIT_TABLE = 'pgsql_edit_table',
  DUPLICATE_TABLE = 'pgsql_duplicate_table',
  TRUNCATE_TABLE = 'pgsql_truncate_table',
  DROP_TABLE = 'pgsql_drop_table',
  TABLE_INFO = 'pgsql_table_info',
  VIEW_TABLE_DDL = 'pgsql_view_ddl',
  
  // 数据操作
  SELECT_DATA = 'pgsql_select_data',
  INSERT_DATA = 'pgsql_insert_data',
  UPDATE_DATA = 'pgsql_update_data',
  DELETE_DATA = 'pgsql_delete_data',
  EXPORT_TABLE_DATA = 'pgsql_export_data',
  IMPORT_TABLE_DATA = 'pgsql_import_data',
  
  // 结构操作
  ADD_COLUMN = 'pgsql_add_column',
  MODIFY_COLUMN = 'pgsql_modify_column',
  DROP_COLUMN = 'pgsql_drop_column',
  ADD_INDEX = 'pgsql_add_index',
  DROP_INDEX = 'pgsql_drop_index',
  ADD_CONSTRAINT = 'pgsql_add_constraint',
  DROP_CONSTRAINT = 'pgsql_drop_constraint',
  ADD_TRIGGER = 'pgsql_add_trigger',
  DROP_TRIGGER = 'pgsql_drop_trigger',
  
  // PostgreSQL 特有操作
  VACUUM_TABLE = 'pgsql_vacuum_table',
  VACUUM_FULL_TABLE = 'pgsql_vacuum_full_table',
  ANALYZE_TABLE = 'pgsql_analyze_table',
  REINDEX_TABLE = 'pgsql_reindex_table',
  CLUSTER_TABLE = 'pgsql_cluster_table',
  
  // 视图操作
  VIEW_DEFINITION = 'pgsql_view_definition',
  REFRESH_MATERIALIZED_VIEW = 'pgsql_refresh_mv',
  
  // 权限操作
  GRANT_PERMISSIONS = 'pgsql_grant_perms',
  REVOKE_PERMISSIONS = 'pgsql_revoke_perms'
}

export class PostgreSQLMenuProvider extends MenuProvider {
  dbType = 'PostgreSQL'
  
  getMenuItems(context: MenuContext): MenuItem[] {
    switch (context.nodeType) {
      case 'database':
        return this.getDatabaseMenuItems(context)
      case 'table':
        return this.getTableMenuItems(context)
      default:
        return []
    }
  }
  
  private getDatabaseMenuItems(context: MenuContext): MenuItem[] {
    return [
      {
        id: PostgreSQLAction.DATABASE_INFO,
        label: '数据库信息',
        icon: 'fas fa-info-circle'
      },
      {
        id: PostgreSQLAction.REFRESH_DATABASE,
        label: '刷新',
        icon: 'fas fa-sync-alt',
        shortcut: 'F5'
      },
      this.createSeparator(),
      {
        id: PostgreSQLAction.CREATE_TABLE,
        label: '新建表',
        icon: 'fas fa-table'
      },
      {
        id: PostgreSQLAction.CREATE_VIEW,
        label: '新建视图',
        icon: 'fas fa-eye'
      },
      {
        id: PostgreSQLAction.CREATE_FUNCTION,
        label: '新建函数',
        icon: 'fas fa-function'
      },
      {
        id: PostgreSQLAction.CREATE_SEQUENCE,
        label: '新建序列',
        icon: 'fas fa-sort-numeric-up'
      },
      this.createSeparator(),
      {
        id: PostgreSQLAction.SEARCH_OBJECTS,
        label: '搜索对象',
        icon: 'fas fa-search'
      },
      this.createSeparator(),
      {
        id: PostgreSQLAction.EXECUTE_SQL,
        label: '执行SQL',
        icon: 'fas fa-terminal',
        shortcut: 'Ctrl+Enter'
      },
      this.createSeparator(),
      {
        id: PostgreSQLAction.BACKUP_DATABASE,
        label: '备份数据库',
        icon: 'fas fa-download'
      },
      {
        id: PostgreSQLAction.RESTORE_DATABASE,
        label: '还原数据库',
        icon: 'fas fa-upload'
      }
    ]
  }
  
  private getTableMenuItems(context: MenuContext): MenuItem[] {
    const isView = this.isView(context)
    const isMaterializedView = this.isMaterializedView(context)
    
    const baseItems: MenuItem[] = [
      // 查看操作
      this.createShortcutItem(
        PostgreSQLAction.VIEW_TABLE,
        '查看数据',
        'Enter',
        'fas fa-eye'
      ),
      {
        id: PostgreSQLAction.TABLE_INFO,
        label: isView ? '视图信息' : '表信息',
        icon: 'fas fa-info-circle'
      },
      {
        id: PostgreSQLAction.VIEW_TABLE_DDL,
        label: isView ? '查看视图定义' : '查看建表语句',
        icon: 'fas fa-code'
      }
    ]
    
    if (isView) {
      baseItems.push({
        id: PostgreSQLAction.VIEW_DEFINITION,
        label: '查看完整定义',
        icon: 'fas fa-file-code'
      })
      
      if (isMaterializedView) {
        baseItems.push({
          id: PostgreSQLAction.REFRESH_MATERIALIZED_VIEW,
          label: '刷新物化视图',
          icon: 'fas fa-redo'
        })
      }
    }
    
    baseItems.push(this.createSeparator())
    
    if (!isView) {
      // 数据操作（视图通常不支持全部数据操作）
      baseItems.push(
        {
          id: PostgreSQLAction.SELECT_DATA,
          label: '查询数据',
          icon: 'fas fa-search'
        },
        {
          id: PostgreSQLAction.INSERT_DATA,
          label: '插入数据',
          icon: 'fas fa-plus'
        },
        {
          id: PostgreSQLAction.UPDATE_DATA,
          label: '更新数据',
          icon: 'fas fa-edit'
        },
        {
          id: PostgreSQLAction.DELETE_DATA,
          label: '删除数据',
          icon: 'fas fa-minus'
        },
        this.createSeparator()
      )
      
      // 结构操作
      baseItems.push(
        {
          id: PostgreSQLAction.ADD_COLUMN,
          label: '添加列',
          icon: 'fas fa-columns'
        },
        {
          id: PostgreSQLAction.MODIFY_COLUMN,
          label: '修改列',
          icon: 'fas fa-edit'
        },
        {
          id: PostgreSQLAction.ADD_INDEX,
          label: '添加索引',
          icon: 'fas fa-key'
        },
        {
          id: PostgreSQLAction.ADD_CONSTRAINT,
          label: '添加约束',
          icon: 'fas fa-shield-alt'
        },
        {
          id: PostgreSQLAction.ADD_TRIGGER,
          label: '添加触发器',
          icon: 'fas fa-bolt'
        },
        this.createSeparator()
      )
    }
    
    // 表管理操作
    baseItems.push(
      {
        id: PostgreSQLAction.DUPLICATE_TABLE,
        label: isView ? '复制视图' : '复制表',
        icon: 'fas fa-copy'
      },
      {
        id: PostgreSQLAction.EXPORT_TABLE_DATA,
        label: '导出数据',
        icon: 'fas fa-download'
      }
    )
    
    if (!isView) {
      baseItems.push({
        id: PostgreSQLAction.IMPORT_TABLE_DATA,
        label: '导入数据',
        icon: 'fas fa-upload'
      })
    }
    
    baseItems.push(this.createSeparator())
    
    if (!isView) {
      // PostgreSQL 特有维护操作
      baseItems.push(
        {
          id: PostgreSQLAction.VACUUM_TABLE,
          label: 'VACUUM',
          icon: 'fas fa-broom'
        },
        {
          id: PostgreSQLAction.VACUUM_FULL_TABLE,
          label: 'VACUUM FULL',
          icon: 'fas fa-magic'
        },
        {
          id: PostgreSQLAction.ANALYZE_TABLE,
          label: 'ANALYZE',
          icon: 'fas fa-chart-line'
        },
        {
          id: PostgreSQLAction.REINDEX_TABLE,
          label: 'REINDEX',
          icon: 'fas fa-redo'
        },
        {
          id: PostgreSQLAction.CLUSTER_TABLE,
          label: 'CLUSTER',
          icon: 'fas fa-layer-group'
        },
        this.createSeparator()
      )
    }
    
    // 权限操作
    baseItems.push(
      {
        id: PostgreSQLAction.GRANT_PERMISSIONS,
        label: '授予权限',
        icon: 'fas fa-user-plus'
      },
      {
        id: PostgreSQLAction.REVOKE_PERMISSIONS,
        label: '撤销权限',
        icon: 'fas fa-user-minus'
      },
      this.createSeparator()
    )
    
    // 危险操作
    if (!isView) {
      baseItems.push(
        this.createDangerItem(
          PostgreSQLAction.TRUNCATE_TABLE,
          '清空表',
          'fas fa-eraser'
        )
      )
    }
    
    baseItems.push(
      this.createDangerItem(
        PostgreSQLAction.DROP_TABLE,
        isView ? '删除视图' : '删除表',
        'fas fa-trash'
      )
    )
    
    return baseItems
  }
  
  async executeAction(actionId: string, context: MenuContext): Promise<OperationResult> {
    try {
      switch (actionId) {
        // 数据库操作
        case PostgreSQLAction.DATABASE_INFO:
          return this.getDatabaseInfo(context)
        case PostgreSQLAction.REFRESH_DATABASE:
          return this.refreshDatabase(context)
        case PostgreSQLAction.CREATE_TABLE:
          return this.createTable(context)
        case PostgreSQLAction.CREATE_VIEW:
          return this.createView(context)
        case PostgreSQLAction.CREATE_FUNCTION:
          return this.createFunction(context)
        case PostgreSQLAction.CREATE_SEQUENCE:
          return this.createSequence(context)
        case PostgreSQLAction.SEARCH_OBJECTS:
          return this.searchObjects(context)
        case PostgreSQLAction.EXECUTE_SQL:
          return this.executeSql(context)
        case PostgreSQLAction.BACKUP_DATABASE:
          return this.backupDatabase(context)
        case PostgreSQLAction.RESTORE_DATABASE:
          return this.restoreDatabase(context)
          
        // 表操作
        case PostgreSQLAction.VIEW_TABLE:
          return this.viewTable(context)
        case PostgreSQLAction.TABLE_INFO:
          return this.getTableInfo(context)
        case PostgreSQLAction.VIEW_TABLE_DDL:
          return this.viewTableDDL(context)
        case PostgreSQLAction.VIEW_DEFINITION:
          return this.viewDefinition(context)
        case PostgreSQLAction.REFRESH_MATERIALIZED_VIEW:
          return this.refreshMaterializedView(context)
        case PostgreSQLAction.SELECT_DATA:
          return this.selectData(context)
        case PostgreSQLAction.INSERT_DATA:
          return this.insertData(context)
        case PostgreSQLAction.UPDATE_DATA:
          return this.updateData(context)
        case PostgreSQLAction.DELETE_DATA:
          return this.deleteData(context)
        case PostgreSQLAction.DUPLICATE_TABLE:
          return this.duplicateTable(context)
        case PostgreSQLAction.EXPORT_TABLE_DATA:
          return this.exportTableData(context)
        case PostgreSQLAction.IMPORT_TABLE_DATA:
          return this.importTableData(context)
          
        // 结构操作
        case PostgreSQLAction.ADD_COLUMN:
          return this.addColumn(context)
        case PostgreSQLAction.MODIFY_COLUMN:
          return this.modifyColumn(context)
        case PostgreSQLAction.ADD_INDEX:
          return this.addIndex(context)
        case PostgreSQLAction.ADD_CONSTRAINT:
          return this.addConstraint(context)
        case PostgreSQLAction.ADD_TRIGGER:
          return this.addTrigger(context)
          
        // PostgreSQL 特有维护操作
        case PostgreSQLAction.VACUUM_TABLE:
          return this.vacuumTable(context)
        case PostgreSQLAction.VACUUM_FULL_TABLE:
          return this.vacuumFullTable(context)
        case PostgreSQLAction.ANALYZE_TABLE:
          return this.analyzeTable(context)
        case PostgreSQLAction.REINDEX_TABLE:
          return this.reindexTable(context)
        case PostgreSQLAction.CLUSTER_TABLE:
          return this.clusterTable(context)
          
        // 权限操作
        case PostgreSQLAction.GRANT_PERMISSIONS:
          return this.grantPermissions(context)
        case PostgreSQLAction.REVOKE_PERMISSIONS:
          return this.revokePermissions(context)
          
        // 危险操作
        case PostgreSQLAction.TRUNCATE_TABLE:
          return this.truncateTable(context)
        case PostgreSQLAction.DROP_TABLE:
          return this.dropTable(context)
          
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
    this.showPostgreSQLDialog('database-info', context, {
      title: '数据库信息',
      description: `查看数据库 "${context.databaseName}" 的详细信息`
    })
    return { success: true, message: '显示数据库信息' }
  }
  
  private async refreshDatabase(context: MenuContext): Promise<OperationResult> {
    window.dispatchEvent(new CustomEvent('postgresql-refresh-database', {
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
  
  private async createTable(context: MenuContext): Promise<OperationResult> {
    this.showPostgreSQLDialog('create-table', context, {
      title: '新建表',
      description: `在数据库 "${context.databaseName}" 中创建新表`
    })
    return { success: true, message: '打开创建表对话框' }
  }
  
  private async createView(context: MenuContext): Promise<OperationResult> {
    this.showPostgreSQLDialog('create-view', context, {
      title: '新建视图',
      description: `在数据库 "${context.databaseName}" 中创建新视图`
    })
    return { success: true, message: '打开创建视图对话框' }
  }
  
  private async createFunction(context: MenuContext): Promise<OperationResult> {
    this.showPostgreSQLDialog('create-function', context, {
      title: '新建函数',
      description: `在数据库 "${context.databaseName}" 中创建新函数`
    })
    return { success: true, message: '打开创建函数对话框' }
  }
  
  private async createSequence(context: MenuContext): Promise<OperationResult> {
    this.showPostgreSQLDialog('create-sequence', context, {
      title: '新建序列',
      description: `在数据库 "${context.databaseName}" 中创建新序列`
    })
    return { success: true, message: '打开创建序列对话框' }
  }
  
  private async searchObjects(context: MenuContext): Promise<OperationResult> {
    this.showPostgreSQLDialog('search-objects', context, {
      title: '搜索对象',
      description: `在数据库 "${context.databaseName}" 中搜索对象`
    })
    return { success: true, message: '打开搜索对象对话框' }
  }
  
  private async executeSql(context: MenuContext): Promise<OperationResult> {
    window.dispatchEvent(new CustomEvent('postgresql-open-sql-editor', {
      detail: {
        connectionId: context.connectionId,
        databaseName: context.databaseName
      }
    }))
    return { success: true, message: '打开SQL编辑器' }
  }
  
  private async backupDatabase(context: MenuContext): Promise<OperationResult> {
    this.showPostgreSQLDialog('backup-database', context, {
      title: '备份数据库',
      description: `备份数据库 "${context.databaseName}"`
    })
    return { success: true, message: '打开备份数据库对话框' }
  }
  
  private async restoreDatabase(context: MenuContext): Promise<OperationResult> {
    this.showPostgreSQLDialog('restore-database', context, {
      title: '还原数据库',
      description: `还原数据库到 "${context.databaseName}"`
    })
    return { success: true, message: '打开还原数据库对话框' }
  }
  
  // ===== 表级操作实现 =====
  
  private async viewTable(context: MenuContext): Promise<OperationResult> {
    window.dispatchEvent(new CustomEvent('postgresql-view-table', {
      detail: {
        connectionId: context.connectionId,
        databaseName: context.databaseName,
        tableName: context.nodeName
      }
    }))
    return { success: true, message: `查看表 "${context.nodeName}"` }
  }
  
  private async getTableInfo(context: MenuContext): Promise<OperationResult> {
    this.showPostgreSQLDialog('table-info', context, {
      title: '表信息',
      description: `查看表 "${context.nodeName}" 的详细信息`
    })
    return { success: true, message: '显示表信息' }
  }
  
  private async viewTableDDL(context: MenuContext): Promise<OperationResult> {
    this.showPostgreSQLDialog('table-ddl', context, {
      title: '建表语句',
      description: `查看表 "${context.nodeName}" 的DDL语句`
    })
    return { success: true, message: '显示建表语句' }
  }
  
  private async viewDefinition(context: MenuContext): Promise<OperationResult> {
    this.showPostgreSQLDialog('view-definition', context, {
      title: '视图定义',
      description: `查看视图 "${context.nodeName}" 的完整定义`
    })
    return { success: true, message: '显示视图定义' }
  }
  
  private async refreshMaterializedView(context: MenuContext): Promise<OperationResult> {
    window.dispatchEvent(new CustomEvent('postgresql-execute-sql', {
      detail: {
        connectionId: context.connectionId,
        databaseName: context.databaseName,
        sql: `REFRESH MATERIALIZED VIEW "${context.nodeName}"`,
        context: context
      }
    }))
    return { 
      success: true, 
      message: `正在刷新物化视图 "${context.nodeName}"`,
      needsRefresh: true
    }
  }
  
  private async selectData(context: MenuContext): Promise<OperationResult> {
    this.showPostgreSQLDialog('select-data', context, {
      title: '查询数据',
      description: `查询表 "${context.nodeName}" 的数据`
    })
    return { success: true, message: '打开数据查询对话框' }
  }
  
  private async insertData(context: MenuContext): Promise<OperationResult> {
    this.showPostgreSQLDialog('insert-data', context, {
      title: '插入数据',
      description: `向表 "${context.nodeName}" 插入数据`
    })
    return { success: true, message: '打开插入数据对话框' }
  }
  
  private async updateData(context: MenuContext): Promise<OperationResult> {
    this.showPostgreSQLDialog('update-data', context, {
      title: '更新数据',
      description: `更新表 "${context.nodeName}" 的数据`
    })
    return { success: true, message: '打开更新数据对话框' }
  }
  
  private async deleteData(context: MenuContext): Promise<OperationResult> {
    this.showPostgreSQLDialog('delete-data', context, {
      title: '删除数据',
      description: `删除表 "${context.nodeName}" 的数据`
    })
    return { success: true, message: '打开删除数据对话框' }
  }
  
  private async duplicateTable(context: MenuContext): Promise<OperationResult> {
    this.showPostgreSQLDialog('duplicate-table', context, {
      title: '复制表',
      description: `复制表 "${context.nodeName}"`
    })
    return { success: true, message: '打开复制表对话框' }
  }
  
  private async exportTableData(context: MenuContext): Promise<OperationResult> {
    this.showPostgreSQLDialog('export-data', context, {
      title: '导出数据',
      description: `导出表 "${context.nodeName}" 的数据`
    })
    return { success: true, message: '打开导出数据对话框' }
  }
  
  private async importTableData(context: MenuContext): Promise<OperationResult> {
    this.showPostgreSQLDialog('import-data', context, {
      title: '导入数据',
      description: `导入数据到表 "${context.nodeName}"`
    })
    return { success: true, message: '打开导入数据对话框' }
  }
  
  // ===== PostgreSQL 特有维护操作实现 =====
  
  private async vacuumTable(context: MenuContext): Promise<OperationResult> {
    window.dispatchEvent(new CustomEvent('postgresql-execute-sql', {
      detail: {
        connectionId: context.connectionId,
        databaseName: context.databaseName,
        sql: `VACUUM "${context.nodeName}"`,
        context: context
      }
    }))
    return { 
      success: true, 
      message: `正在VACUUM表 "${context.nodeName}"`,
      needsRefresh: true
    }
  }
  
  private async vacuumFullTable(context: MenuContext): Promise<OperationResult> {
    window.dispatchEvent(new CustomEvent('postgresql-execute-sql', {
      detail: {
        connectionId: context.connectionId,
        databaseName: context.databaseName,
        sql: `VACUUM FULL "${context.nodeName}"`,
        context: context
      }
    }))
    return { 
      success: true, 
      message: `正在VACUUM FULL表 "${context.nodeName}"`,
      needsRefresh: true
    }
  }
  
  private async analyzeTable(context: MenuContext): Promise<OperationResult> {
    window.dispatchEvent(new CustomEvent('postgresql-execute-sql', {
      detail: {
        connectionId: context.connectionId,
        databaseName: context.databaseName,
        sql: `ANALYZE "${context.nodeName}"`,
        context: context
      }
    }))
    return { 
      success: true, 
      message: `正在分析表 "${context.nodeName}"`,
      needsRefresh: true
    }
  }
  
  private async reindexTable(context: MenuContext): Promise<OperationResult> {
    window.dispatchEvent(new CustomEvent('postgresql-execute-sql', {
      detail: {
        connectionId: context.connectionId,
        databaseName: context.databaseName,
        sql: `REINDEX TABLE "${context.nodeName}"`,
        context: context
      }
    }))
    return { 
      success: true, 
      message: `正在重建表 "${context.nodeName}" 的索引`,
      needsRefresh: true
    }
  }
  
  private async clusterTable(context: MenuContext): Promise<OperationResult> {
    this.showPostgreSQLDialog('cluster-table', context, {
      title: 'CLUSTER表',
      description: `根据索引重新组织表 "${context.nodeName}"`
    })
    return { success: true, message: '打开CLUSTER表对话框' }
  }
  
  // ===== 权限操作实现 =====
  
  private async grantPermissions(context: MenuContext): Promise<OperationResult> {
    this.showPostgreSQLDialog('grant-permissions', context, {
      title: '授予权限',
      description: `为表 "${context.nodeName}" 授予权限`
    })
    return { success: true, message: '打开授予权限对话框' }
  }
  
  private async revokePermissions(context: MenuContext): Promise<OperationResult> {
    this.showPostgreSQLDialog('revoke-permissions', context, {
      title: '撤销权限',
      description: `撤销表 "${context.nodeName}" 的权限`
    })
    return { success: true, message: '打开撤销权限对话框' }
  }
  
  // ===== 结构操作实现 =====
  
  private async addColumn(context: MenuContext): Promise<OperationResult> {
    this.showPostgreSQLDialog('add-column', context, {
      title: '添加列',
      description: `向表 "${context.nodeName}" 添加列`
    })
    return { success: true, message: '打开添加列对话框' }
  }
  
  private async modifyColumn(context: MenuContext): Promise<OperationResult> {
    this.showPostgreSQLDialog('modify-column', context, {
      title: '修改列',
      description: `修改表 "${context.nodeName}" 的列`
    })
    return { success: true, message: '打开修改列对话框' }
  }
  
  private async addIndex(context: MenuContext): Promise<OperationResult> {
    this.showPostgreSQLDialog('add-index', context, {
      title: '添加索引',
      description: `为表 "${context.nodeName}" 添加索引`
    })
    return { success: true, message: '打开添加索引对话框' }
  }
  
  private async addConstraint(context: MenuContext): Promise<OperationResult> {
    this.showPostgreSQLDialog('add-constraint', context, {
      title: '添加约束',
      description: `为表 "${context.nodeName}" 添加约束`
    })
    return { success: true, message: '打开添加约束对话框' }
  }
  
  private async addTrigger(context: MenuContext): Promise<OperationResult> {
    this.showPostgreSQLDialog('add-trigger', context, {
      title: '添加触发器',
      description: `为表 "${context.nodeName}" 添加触发器`
    })
    return { success: true, message: '打开添加触发器对话框' }
  }
  
  // ===== 危险操作实现 =====
  
  private async truncateTable(context: MenuContext): Promise<OperationResult> {
    const confirmed = await this.showConfirmDialog({
      title: '清空表确认',
      message: `确定要清空表 "${context.nodeName}" 的所有数据吗？此操作不可恢复！`,
      type: 'danger',
      confirmText: '清空'
    })
    
    if (confirmed) {
      window.dispatchEvent(new CustomEvent('postgresql-execute-sql', {
        detail: {
          connectionId: context.connectionId,
          databaseName: context.databaseName,
          sql: `TRUNCATE TABLE "${context.nodeName}"`,
          context: context
        }
      }))
      
      return {
        success: true,
        message: `已清空表 "${context.nodeName}"`,
        needsRefresh: true
      }
    }
    
    return { success: true, message: '已取消清空操作' }
  }
  
  private async dropTable(context: MenuContext): Promise<OperationResult> {
    const isView = this.isView(context)
    const objectType = isView ? '视图' : '表'
    const sqlCommand = isView ? 'DROP VIEW' : 'DROP TABLE'
    
    const confirmed = await this.showConfirmDialog({
      title: `删除${objectType}确认`,
      message: `确定要删除${objectType} "${context.nodeName}" 吗？此操作不可恢复！`,
      type: 'danger',
      confirmText: '删除'
    })
    
    if (confirmed) {
      window.dispatchEvent(new CustomEvent('postgresql-execute-sql', {
        detail: {
          connectionId: context.connectionId,
          databaseName: context.databaseName,
          sql: `${sqlCommand} "${context.nodeName}"`,
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
  
  // ===== 辅助方法 =====
  
  private showPostgreSQLDialog(operation: string, context: MenuContext, options: any = {}): void {
    window.dispatchEvent(new CustomEvent('postgresql-show-dialog', {
      detail: {
        operation,
        connectionId: context.connectionId,
        databaseName: context.databaseName,
        tableName: context.nodeName,
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
    // 可以通过节点数据或其他方式判断是否为视图
    return context.nodeData?.type === 'view' || context.nodeData?.objectType === 'view'
  }
  
  private isMaterializedView(context: MenuContext): boolean {
    // 判断是否为物化视图
    return context.nodeData?.type === 'materialized_view' || context.nodeData?.objectType === 'materialized_view'
  }
}