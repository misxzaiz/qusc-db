import { MenuProvider } from './MenuProvider'
import type { MenuItem, MenuContext, OperationResult } from '@/types/contextMenu'

export enum MySQLAction {
  // 数据库级操作
  REFRESH_DATABASE = 'mysql_refresh_db',
  DATABASE_INFO = 'mysql_db_info',
  CREATE_TABLE = 'mysql_create_table',
  SEARCH_TABLES = 'mysql_search_tables',
  BACKUP_DATABASE = 'mysql_backup_db',
  RESTORE_DATABASE = 'mysql_restore_db',
  EXECUTE_SQL = 'mysql_execute_sql',
  
  // 表级操作
  VIEW_TABLE = 'mysql_view_table',
  EDIT_TABLE = 'mysql_edit_table',
  DUPLICATE_TABLE = 'mysql_duplicate_table',
  TRUNCATE_TABLE = 'mysql_truncate_table',
  DROP_TABLE = 'mysql_drop_table',
  TABLE_INFO = 'mysql_table_info',
  VIEW_TABLE_DDL = 'mysql_view_ddl',
  
  // 数据操作
  SELECT_DATA = 'mysql_select_data',
  INSERT_DATA = 'mysql_insert_data',
  UPDATE_DATA = 'mysql_update_data',
  DELETE_DATA = 'mysql_delete_data',
  EXPORT_TABLE_DATA = 'mysql_export_data',
  IMPORT_TABLE_DATA = 'mysql_import_data',
  
  // 结构操作
  ADD_COLUMN = 'mysql_add_column',
  MODIFY_COLUMN = 'mysql_modify_column',
  DROP_COLUMN = 'mysql_drop_column',
  ADD_INDEX = 'mysql_add_index',
  DROP_INDEX = 'mysql_drop_index',
  ADD_FOREIGN_KEY = 'mysql_add_fk',
  DROP_FOREIGN_KEY = 'mysql_drop_fk',
  
  // 工具操作
  ANALYZE_TABLE = 'mysql_analyze_table',
  OPTIMIZE_TABLE = 'mysql_optimize_table',
  REPAIR_TABLE = 'mysql_repair_table',
  CHECK_TABLE = 'mysql_check_table'
}

export class MySQLMenuProvider extends MenuProvider {
  dbType = 'MySQL'
  
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
      this.createDisabledItem(MySQLAction.DATABASE_INFO, '数据库信息', 'fas fa-info-circle'),
      {
        id: MySQLAction.REFRESH_DATABASE,
        label: '刷新',
        icon: 'fas fa-sync-alt',
        shortcut: 'F5'
      },
      this.createSeparator(),
      {
        id: MySQLAction.CREATE_TABLE,
        label: '新建表',
        icon: 'fas fa-table'
      },
      this.createDisabledItem(MySQLAction.SEARCH_TABLES, '搜索表', 'fas fa-search'),
      this.createSeparator(),
      {
        id: MySQLAction.EXECUTE_SQL,
        label: '执行SQL',
        icon: 'fas fa-terminal',
        shortcut: 'Ctrl+Enter'
      },
      this.createSeparator(),
      this.createDisabledItem(MySQLAction.BACKUP_DATABASE, '备份数据库', 'fas fa-download'),
      this.createDisabledItem(MySQLAction.RESTORE_DATABASE, '还原数据库', 'fas fa-upload')
    ]
  }
  
  private getTableMenuItems(context: MenuContext): MenuItem[] {
    return [
      // 查看操作
      this.createShortcutItem(
        MySQLAction.VIEW_TABLE,
        '查看数据',
        'Enter',
        'fas fa-eye'
      ),
      {
        id: MySQLAction.TABLE_INFO,
        label: '表信息',
        icon: 'fas fa-info-circle'
      },
      {
        id: MySQLAction.VIEW_TABLE_DDL,
        label: '查看建表语句',
        icon: 'fas fa-code'
      },
      
      this.createSeparator(),
      
      // 数据操作
      {
        id: MySQLAction.SELECT_DATA,
        label: '查询数据',
        icon: 'fas fa-search'
      },
      this.createDisabledItem(MySQLAction.INSERT_DATA, '插入数据', 'fas fa-plus'),
      this.createDisabledItem(MySQLAction.UPDATE_DATA, '更新数据', 'fas fa-edit'),
      this.createDisabledItem(MySQLAction.DELETE_DATA, '删除数据', 'fas fa-minus'),
      
      this.createSeparator(),
      
      // 结构操作
      this.createDisabledItem(MySQLAction.ADD_COLUMN, '添加列', 'fas fa-columns'),
      this.createDisabledItem(MySQLAction.MODIFY_COLUMN, '修改列', 'fas fa-edit'),
      this.createDisabledItem(MySQLAction.ADD_INDEX, '添加索引', 'fas fa-key'),
      this.createDisabledItem(MySQLAction.ADD_FOREIGN_KEY, '添加外键', 'fas fa-link'),
      
      this.createSeparator(),
      
      // 表管理操作
      this.createDisabledItem(MySQLAction.DUPLICATE_TABLE, '复制表', 'fas fa-copy'),
      this.createDisabledItem(MySQLAction.EXPORT_TABLE_DATA, '导出数据', 'fas fa-download'),
      this.createDisabledItem(MySQLAction.IMPORT_TABLE_DATA, '导入数据', 'fas fa-upload'),
      
      this.createSeparator(),
      
      // 维护操作
      {
        id: MySQLAction.ANALYZE_TABLE,
        label: '分析表',
        icon: 'fas fa-chart-line'
      },
      {
        id: MySQLAction.OPTIMIZE_TABLE,
        label: '优化表',
        icon: 'fas fa-magic'
      },
      {
        id: MySQLAction.CHECK_TABLE,
        label: '检查表',
        icon: 'fas fa-check'
      },
      {
        id: MySQLAction.REPAIR_TABLE,
        label: '修复表',
        icon: 'fas fa-tools'
      },
      
      this.createSeparator(),
      
      // 危险操作
      this.createDangerItem(
        MySQLAction.TRUNCATE_TABLE,
        '清空表',
        'fas fa-eraser'
      ),
      this.createDangerItem(
        MySQLAction.DROP_TABLE,
        '删除表',
        'fas fa-trash'
      )
    ]
  }
  
  async executeAction(actionId: string, context: MenuContext): Promise<OperationResult> {
    try {
      switch (actionId) {
        // 数据库操作
        case MySQLAction.DATABASE_INFO:
          return this.getDatabaseInfo(context)
        case MySQLAction.REFRESH_DATABASE:
          return this.refreshDatabase(context)
        case MySQLAction.CREATE_TABLE:
          return this.createTable(context)
        case MySQLAction.SEARCH_TABLES:
          return this.searchTables(context)
        case MySQLAction.EXECUTE_SQL:
          return this.executeSql(context)
        case MySQLAction.BACKUP_DATABASE:
          return this.backupDatabase(context)
        case MySQLAction.RESTORE_DATABASE:
          return this.restoreDatabase(context)
          
        // 表操作
        case MySQLAction.VIEW_TABLE:
          return this.viewTable(context)
        case MySQLAction.TABLE_INFO:
          return this.getTableInfo(context)
        case MySQLAction.VIEW_TABLE_DDL:
          return this.viewTableDDL(context)
        case MySQLAction.SELECT_DATA:
          return this.selectData(context)
        case MySQLAction.INSERT_DATA:
          return this.insertData(context)
        case MySQLAction.UPDATE_DATA:
          return this.updateData(context)
        case MySQLAction.DELETE_DATA:
          return this.deleteData(context)
        case MySQLAction.DUPLICATE_TABLE:
          return this.duplicateTable(context)
        case MySQLAction.EXPORT_TABLE_DATA:
          return this.exportTableData(context)
        case MySQLAction.IMPORT_TABLE_DATA:
          return this.importTableData(context)
          
        // 结构操作
        case MySQLAction.ADD_COLUMN:
          return this.addColumn(context)
        case MySQLAction.MODIFY_COLUMN:
          return this.modifyColumn(context)
        case MySQLAction.ADD_INDEX:
          return this.addIndex(context)
        case MySQLAction.ADD_FOREIGN_KEY:
          return this.addForeignKey(context)
          
        // 维护操作
        case MySQLAction.ANALYZE_TABLE:
          return this.analyzeTable(context)
        case MySQLAction.OPTIMIZE_TABLE:
          return this.optimizeTable(context)
        case MySQLAction.CHECK_TABLE:
          return this.checkTable(context)
        case MySQLAction.REPAIR_TABLE:
          return this.repairTable(context)
          
        // 危险操作
        case MySQLAction.TRUNCATE_TABLE:
          return this.truncateTable(context)
        case MySQLAction.DROP_TABLE:
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
    this.showMySQLDialog('database-info', context, {
      title: '数据库信息',
      description: `查看数据库 "${context.databaseName}" 的详细信息`
    })
    return { success: true, message: '显示数据库信息' }
  }
  
  private async refreshDatabase(context: MenuContext): Promise<OperationResult> {
    window.dispatchEvent(new CustomEvent('mysql-refresh-database', {
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
    this.showMySQLDialog('create-table', context, {
      title: '新建表',
      description: `在数据库 "${context.databaseName}" 中创建新表`
    })
    return { success: true, message: '打开创建表对话框' }
  }
  
  private async searchTables(context: MenuContext): Promise<OperationResult> {
    this.showMySQLDialog('search-tables', context, {
      title: '搜索表',
      description: `在数据库 "${context.databaseName}" 中搜索表`
    })
    return { success: true, message: '打开搜索表对话框' }
  }
  
  private async executeSql(context: MenuContext): Promise<OperationResult> {
    window.dispatchEvent(new CustomEvent('mysql-open-sql-editor', {
      detail: {
        connectionId: context.connectionId,
        databaseName: context.databaseName
      }
    }))
    return { success: true, message: '打开SQL编辑器' }
  }
  
  private async backupDatabase(context: MenuContext): Promise<OperationResult> {
    this.showMySQLDialog('backup-database', context, {
      title: '备份数据库',
      description: `备份数据库 "${context.databaseName}"`
    })
    return { success: true, message: '打开备份数据库对话框' }
  }
  
  private async restoreDatabase(context: MenuContext): Promise<OperationResult> {
    this.showMySQLDialog('restore-database', context, {
      title: '还原数据库',
      description: `还原数据库到 "${context.databaseName}"`
    })
    return { success: true, message: '打开还原数据库对话框' }
  }
  
  // ===== 表级操作实现 =====
  
  private async viewTable(context: MenuContext): Promise<OperationResult> {
    window.dispatchEvent(new CustomEvent('mysql-view-table', {
      detail: {
        connectionId: context.connectionId,
        databaseName: context.databaseName,
        tableName: context.nodeName
      }
    }))
    return { success: true, message: `查看表 "${context.nodeName}"` }
  }
  
  private async getTableInfo(context: MenuContext): Promise<OperationResult> {
    this.showMySQLDialog('table-info', context, {
      title: '表信息',
      description: `查看表 "${context.nodeName}" 的详细信息`
    })
    return { success: true, message: '显示表信息' }
  }
  
  private async viewTableDDL(context: MenuContext): Promise<OperationResult> {
    this.showMySQLDialog('table-ddl', context, {
      title: '建表语句',
      description: `查看表 "${context.nodeName}" 的DDL语句`
    })
    return { success: true, message: '显示建表语句' }
  }
  
  private async selectData(context: MenuContext): Promise<OperationResult> {
    this.showMySQLDialog('select-data', context, {
      title: '查询数据',
      description: `查询表 "${context.nodeName}" 的数据`
    })
    return { success: true, message: '打开数据查询对话框' }
  }
  
  private async insertData(context: MenuContext): Promise<OperationResult> {
    this.showMySQLDialog('insert-data', context, {
      title: '插入数据',
      description: `向表 "${context.nodeName}" 插入数据`
    })
    return { success: true, message: '打开插入数据对话框' }
  }
  
  private async updateData(context: MenuContext): Promise<OperationResult> {
    this.showMySQLDialog('update-data', context, {
      title: '更新数据',
      description: `更新表 "${context.nodeName}" 的数据`
    })
    return { success: true, message: '打开更新数据对话框' }
  }
  
  private async deleteData(context: MenuContext): Promise<OperationResult> {
    this.showMySQLDialog('delete-data', context, {
      title: '删除数据',
      description: `删除表 "${context.nodeName}" 的数据`
    })
    return { success: true, message: '打开删除数据对话框' }
  }
  
  private async duplicateTable(context: MenuContext): Promise<OperationResult> {
    this.showMySQLDialog('duplicate-table', context, {
      title: '复制表',
      description: `复制表 "${context.nodeName}"`
    })
    return { success: true, message: '打开复制表对话框' }
  }
  
  private async exportTableData(context: MenuContext): Promise<OperationResult> {
    this.showMySQLDialog('export-data', context, {
      title: '导出数据',
      description: `导出表 "${context.nodeName}" 的数据`
    })
    return { success: true, message: '打开导出数据对话框' }
  }
  
  private async importTableData(context: MenuContext): Promise<OperationResult> {
    this.showMySQLDialog('import-data', context, {
      title: '导入数据',
      description: `导入数据到表 "${context.nodeName}"`
    })
    return { success: true, message: '打开导入数据对话框' }
  }
  
  // ===== 结构操作实现 =====
  
  private async addColumn(context: MenuContext): Promise<OperationResult> {
    this.showMySQLDialog('add-column', context, {
      title: '添加列',
      description: `向表 "${context.nodeName}" 添加列`
    })
    return { success: true, message: '打开添加列对话框' }
  }
  
  private async modifyColumn(context: MenuContext): Promise<OperationResult> {
    this.showMySQLDialog('modify-column', context, {
      title: '修改列',
      description: `修改表 "${context.nodeName}" 的列`
    })
    return { success: true, message: '打开修改列对话框' }
  }
  
  private async addIndex(context: MenuContext): Promise<OperationResult> {
    this.showMySQLDialog('add-index', context, {
      title: '添加索引',
      description: `为表 "${context.nodeName}" 添加索引`
    })
    return { success: true, message: '打开添加索引对话框' }
  }
  
  private async addForeignKey(context: MenuContext): Promise<OperationResult> {
    this.showMySQLDialog('add-foreign-key', context, {
      title: '添加外键',
      description: `为表 "${context.nodeName}" 添加外键`
    })
    return { success: true, message: '打开添加外键对话框' }
  }
  
  // ===== 维护操作实现 =====
  
  private async analyzeTable(context: MenuContext): Promise<OperationResult> {
    window.dispatchEvent(new CustomEvent('mysql-execute-sql', {
      detail: {
        connectionId: context.connectionId,
        databaseName: context.databaseName,
        sql: `ANALYZE TABLE \`${context.nodeName}\``,
        context: context
      }
    }))
    return { 
      success: true, 
      message: `正在分析表 "${context.nodeName}"`,
      needsRefresh: true
    }
  }
  
  private async optimizeTable(context: MenuContext): Promise<OperationResult> {
    window.dispatchEvent(new CustomEvent('mysql-execute-sql', {
      detail: {
        connectionId: context.connectionId,
        databaseName: context.databaseName,
        sql: `OPTIMIZE TABLE \`${context.nodeName}\``,
        context: context
      }
    }))
    return { 
      success: true, 
      message: `正在优化表 "${context.nodeName}"`,
      needsRefresh: true
    }
  }
  
  private async checkTable(context: MenuContext): Promise<OperationResult> {
    window.dispatchEvent(new CustomEvent('mysql-execute-sql', {
      detail: {
        connectionId: context.connectionId,
        databaseName: context.databaseName,
        sql: `CHECK TABLE \`${context.nodeName}\``,
        context: context
      }
    }))
    return { 
      success: true, 
      message: `正在检查表 "${context.nodeName}"`
    }
  }
  
  private async repairTable(context: MenuContext): Promise<OperationResult> {
    window.dispatchEvent(new CustomEvent('mysql-execute-sql', {
      detail: {
        connectionId: context.connectionId,
        databaseName: context.databaseName,
        sql: `REPAIR TABLE \`${context.nodeName}\``,
        context: context
      }
    }))
    return { 
      success: true, 
      message: `正在修复表 "${context.nodeName}"`,
      needsRefresh: true
    }
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
      window.dispatchEvent(new CustomEvent('mysql-execute-sql', {
        detail: {
          connectionId: context.connectionId,
          databaseName: context.databaseName,
          sql: `TRUNCATE TABLE \`${context.nodeName}\``,
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
    const confirmed = await this.showConfirmDialog({
      title: '删除表确认',
      message: `确定要删除表 "${context.nodeName}" 吗？此操作不可恢复！`,
      type: 'danger',
      confirmText: '删除'
    })
    
    if (confirmed) {
      window.dispatchEvent(new CustomEvent('mysql-execute-sql', {
        detail: {
          connectionId: context.connectionId,
          databaseName: context.databaseName,
          sql: `DROP TABLE \`${context.nodeName}\``,
          context: context
        }
      }))
      
      return {
        success: true,
        message: `已删除表 "${context.nodeName}"`,
        needsRefresh: true,
        affectedNodes: [context.nodeName!]
      }
    }
    
    return { success: true, message: '已取消删除操作' }
  }
  
  // ===== 辅助方法 =====
  
  private showMySQLDialog(operation: string, context: MenuContext, options: any = {}): void {
    window.dispatchEvent(new CustomEvent('mysql-show-dialog', {
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
}