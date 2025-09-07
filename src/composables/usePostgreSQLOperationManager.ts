import { ref } from 'vue'
import { nextTick } from 'vue'
import { useConnectionStore } from '@/stores/connection'

export function usePostgreSQLOperationManager() {
  const connectionStore = useConnectionStore()
  
  // 对话框状态
  const showDialog = ref(false)
  const currentOperation = ref('')
  const operationData = ref({})
  const dialogRef = ref(null)
  
  // 初始化事件监听器
  function initEventListeners() {
    // 监听显示对话框事件
    window.addEventListener('postgresql-show-dialog', handleShowDialog)
    
    // 监听数据库操作事件
    window.addEventListener('postgresql-refresh-database', handleRefreshDatabase)
    window.addEventListener('postgresql-open-sql-editor', handleOpenSQLEditor)
    window.addEventListener('postgresql-view-table', handleViewTable)
    
    // 监听SQL执行事件
    window.addEventListener('postgresql-execute-sql', handleExecuteSQL)
    
    console.log('✅ PostgreSQL 事件监听器初始化完成')
  }
  
  // 清理事件监听器
  function cleanupEventListeners() {
    window.removeEventListener('postgresql-show-dialog', handleShowDialog)
    window.removeEventListener('postgresql-refresh-database', handleRefreshDatabase)
    window.removeEventListener('postgresql-open-sql-editor', handleOpenSQLEditor)
    window.removeEventListener('postgresql-view-table', handleViewTable)
    window.removeEventListener('postgresql-execute-sql', handleExecuteSQL)
    
    console.log('🧹 PostgreSQL 事件监听器清理完成')
  }
  
  // ===== 事件处理器 =====
  
  function handleShowDialog(event: any) {
    const detail = event.detail
    console.log('📋 PostgreSQL 显示对话框:', detail.operation)
    
    currentOperation.value = detail.operation
    operationData.value = {
      connectionId: detail.connectionId || '',
      databaseName: detail.databaseName || '',
      tableName: detail.tableName || '',
      schemaName: detail.schemaName || 'public',
      context: detail.context,
      options: detail.options || {}
    }
    
    showDialog.value = true
    
    // 显示通知
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: {
        type: 'info',
        message: `PostgreSQL ${getOperationName(detail.operation)}`
      }
    }))
  }
  
  function handleRefreshDatabase(event: any) {
    const detail = event.detail
    console.log('🔄 PostgreSQL 刷新数据库:', detail.databaseName)
    
    // 触发树节点刷新
    window.dispatchEvent(new CustomEvent('refresh-tree-node', {
      detail: {
        context: detail.context,
        nodeType: 'database',
        connectionId: detail.connectionId,
        databaseName: detail.databaseName
      }
    }))
    
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: {
        type: 'success',
        message: `已刷新 PostgreSQL 数据库 "${detail.databaseName}"`
      }
    }))
  }
  
  function handleOpenSQLEditor(event: any) {
    const detail = event.detail
    console.log('📝 PostgreSQL 打开SQL编辑器:', detail)
    
    // 在工作区打开SQL编辑器
    window.dispatchEvent(new CustomEvent('open-sql-editor', {
      detail: {
        connectionId: detail.connectionId,
        databaseName: detail.databaseName,
        schemaName: detail.schemaName,
        dbType: 'PostgreSQL'
      }
    }))
    
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: {
        type: 'info',
        message: 'PostgreSQL SQL 编辑器已打开'
      }
    }))
  }
  
  function handleViewTable(event: any) {
    const detail = event.detail
    console.log('👁️ PostgreSQL 查看表:', detail.tableName)
    
    // 在工作区显示表数据
    window.dispatchEvent(new CustomEvent('view-table-data', {
      detail: {
        connectionId: detail.connectionId,
        databaseName: detail.databaseName,
        schemaName: detail.schemaName || 'public',
        tableName: detail.tableName,
        dbType: 'PostgreSQL'
      }
    }))
    
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: {
        type: 'info',
        message: `正在查看 PostgreSQL 表 "${detail.schemaName || 'public'}.${detail.tableName}"`
      }
    }))
  }
  
  function handleExecuteSQL(event: any) {
    const detail = event.detail
    console.log('⚡ PostgreSQL 执行SQL:', detail.sql)
    
    // 执行SQL命令
    window.dispatchEvent(new CustomEvent('execute-sql-command', {
      detail: {
        connectionId: detail.connectionId,
        databaseName: detail.databaseName,
        sql: detail.sql,
        dbType: 'PostgreSQL',
        context: detail.context
      }
    }))
    
    const operationName = getSQLOperationName(detail.sql)
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: {
        type: 'info',
        message: `正在执行 PostgreSQL ${operationName}...`
      }
    }))
  }
  
  // ===== 对话框处理 =====
  
  function handleDialogConfirm(data: any) {
    console.log('✅ PostgreSQL 对话框确认:', currentOperation.value, data)
    
    // 根据操作类型执行相应逻辑
    switch (currentOperation.value) {
      case 'create-table':
        handleCreateTable(data)
        break
      case 'create-schema':
        handleCreateSchema(data)
        break
      case 'create-sequence':
        handleCreateSequence(data)
        break
      case 'create-view':
        handleCreateView(data)
        break
      case 'table-info':
        showTableInfo(data)
        break
      case 'database-info':
        showDatabaseInfo(data)
        break
      default:
        console.log('PostgreSQL 操作:', currentOperation.value, data)
    }
    
    showDialog.value = false
  }
  
  function handleDialogCancel() {
    console.log('❌ PostgreSQL 对话框取消')
    showDialog.value = false
    currentOperation.value = ''
    operationData.value = {}
  }
  
  // ===== 具体操作实现 =====
  
  function handleCreateTable(data: any) {
    console.log('🆕 创建 PostgreSQL 表:', data)
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: {
        type: 'success',
        message: 'PostgreSQL 表创建功能开发中...'
      }
    }))
  }
  
  function handleCreateSchema(data: any) {
    console.log('🆕 创建 PostgreSQL 模式:', data)
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: {
        type: 'success',
        message: 'PostgreSQL 模式创建功能开发中...'
      }
    }))
  }
  
  function handleCreateSequence(data: any) {
    console.log('🆕 创建 PostgreSQL 序列:', data)
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: {
        type: 'success',
        message: 'PostgreSQL 序列创建功能开发中...'
      }
    }))
  }
  
  function handleCreateView(data: any) {
    console.log('🆕 创建 PostgreSQL 视图:', data)
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: {
        type: 'success',
        message: 'PostgreSQL 视图创建功能开发中...'
      }
    }))
  }
  
  function showTableInfo(data: any) {
    console.log('ℹ️ 显示 PostgreSQL 表信息:', data)
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: {
        type: 'info',
        message: 'PostgreSQL 表信息功能开发中...'
      }
    }))
  }
  
  function showDatabaseInfo(data: any) {
    console.log('ℹ️ 显示 PostgreSQL 数据库信息:', data)
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: {
        type: 'info',
        message: 'PostgreSQL 数据库信息功能开发中...'
      }
    }))
  }
  
  // ===== 辅助函数 =====
  
  function getOperationName(operation: string): string {
    const operationNames: Record<string, string> = {
      'create-table': '创建表',
      'create-schema': '创建模式',
      'create-sequence': '创建序列',
      'create-view': '创建视图',
      'create-materialized-view': '创建物化视图',
      'table-info': '表信息',
      'database-info': '数据库信息',
      'export-database': '导出数据库',
      'import-database': '导入数据库',
      'backup-database': '备份数据库',
      'restore-database': '恢复数据库',
      'vacuum-database': '清理数据库',
      'reindex-database': '重建索引'
    }
    return operationNames[operation] || '未知操作'
  }
  
  function getSQLOperationName(sql: string): string {
    const upperSQL = sql.trim().toUpperCase()
    if (upperSQL.startsWith('SELECT')) return '查询'
    if (upperSQL.startsWith('INSERT')) return '插入'
    if (upperSQL.startsWith('UPDATE')) return '更新'
    if (upperSQL.startsWith('DELETE')) return '删除'
    if (upperSQL.startsWith('CREATE')) return '创建'
    if (upperSQL.startsWith('DROP')) return '删除'
    if (upperSQL.startsWith('ALTER')) return '修改'
    if (upperSQL.startsWith('VACUUM')) return '清理'
    if (upperSQL.startsWith('CLUSTER')) return '聚集'
    if (upperSQL.startsWith('REINDEX')) return '重建索引'
    if (upperSQL.startsWith('ANALYZE')) return '分析'
    if (upperSQL.startsWith('EXPLAIN')) return '执行计划'
    return 'SQL操作'
  }
  
  return {
    // 状态
    showDialog,
    currentOperation,
    operationData,
    dialogRef,
    
    // 事件管理
    initEventListeners,
    cleanupEventListeners,
    
    // 对话框处理
    handleDialogConfirm,
    handleDialogCancel
  }
}