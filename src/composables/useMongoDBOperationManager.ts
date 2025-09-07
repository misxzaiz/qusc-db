import { ref } from 'vue'
import { nextTick } from 'vue'
import { useConnectionStore } from '@/stores/connection'

export function useMongoDBOperationManager() {
  const connectionStore = useConnectionStore()
  
  // 对话框状态
  const showDialog = ref(false)
  const currentOperation = ref('')
  const operationData = ref({})
  const dialogRef = ref(null)
  
  // 初始化事件监听器
  function initEventListeners() {
    // 监听显示对话框事件
    window.addEventListener('mongodb-show-dialog', handleShowDialog)
    
    // 监听数据库操作事件
    window.addEventListener('mongodb-refresh-database', handleRefreshDatabase)
    window.addEventListener('mongodb-open-shell', handleOpenShell)
    window.addEventListener('mongodb-view-collection', handleViewCollection)
    
    // 监听命令执行事件
    window.addEventListener('mongodb-execute-command', handleExecuteCommand)
    
    console.log('✅ MongoDB 事件监听器初始化完成')
  }
  
  // 清理事件监听器
  function cleanupEventListeners() {
    window.removeEventListener('mongodb-show-dialog', handleShowDialog)
    window.removeEventListener('mongodb-refresh-database', handleRefreshDatabase)
    window.removeEventListener('mongodb-open-shell', handleOpenShell)
    window.removeEventListener('mongodb-view-collection', handleViewCollection)
    window.removeEventListener('mongodb-execute-command', handleExecuteCommand)
    
    console.log('🧹 MongoDB 事件监听器清理完成')
  }
  
  // ===== 事件处理器 =====
  
  function handleShowDialog(event: any) {
    const detail = event.detail
    console.log('📋 MongoDB 显示对话框:', detail.operation)
    
    currentOperation.value = detail.operation
    operationData.value = {
      connectionId: detail.connectionId || '',
      databaseName: detail.databaseName || '',
      collectionName: detail.collectionName || '',
      context: detail.context,
      options: detail.options || {}
    }
    
    showDialog.value = true
    
    // 显示通知
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: {
        type: 'info',
        message: `MongoDB ${getOperationName(detail.operation)}`
      }
    }))
  }
  
  function handleRefreshDatabase(event: any) {
    const detail = event.detail
    console.log('🔄 MongoDB 刷新数据库:', detail.databaseName)
    
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
        message: `已刷新 MongoDB 数据库 "${detail.databaseName}"`
      }
    }))
  }
  
  function handleOpenShell(event: any) {
    const detail = event.detail
    console.log('🐚 MongoDB 打开Shell:', detail)
    
    // 在工作区打开MongoDB Shell
    window.dispatchEvent(new CustomEvent('open-mongo-shell', {
      detail: {
        connectionId: detail.connectionId,
        databaseName: detail.databaseName,
        dbType: 'MongoDB'
      }
    }))
    
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: {
        type: 'info',
        message: 'MongoDB Shell 已打开'
      }
    }))
  }
  
  function handleViewCollection(event: any) {
    const detail = event.detail
    console.log('👁️ MongoDB 查看集合:', detail.collectionName)
    
    // 在工作区显示集合数据
    window.dispatchEvent(new CustomEvent('view-collection-data', {
      detail: {
        connectionId: detail.connectionId,
        databaseName: detail.databaseName,
        collectionName: detail.collectionName,
        dbType: 'MongoDB'
      }
    }))
    
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: {
        type: 'info',
        message: `正在查看 MongoDB 集合 "${detail.collectionName}"`
      }
    }))
  }
  
  function handleExecuteCommand(event: any) {
    const detail = event.detail
    console.log('⚡ MongoDB 执行命令:', detail.command)
    
    // 执行MongoDB命令
    window.dispatchEvent(new CustomEvent('execute-mongo-command', {
      detail: {
        connectionId: detail.connectionId,
        databaseName: detail.databaseName,
        command: detail.command,
        dbType: 'MongoDB',
        context: detail.context
      }
    }))
    
    const operationName = getCommandOperationName(detail.command)
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: {
        type: 'info',
        message: `正在执行 MongoDB ${operationName}...`
      }
    }))
  }
  
  // ===== 对话框处理 =====
  
  function handleDialogConfirm(data: any) {
    console.log('✅ MongoDB 对话框确认:', currentOperation.value, data)
    
    // 根据操作类型执行相应逻辑
    switch (currentOperation.value) {
      case 'create-collection':
        handleCreateCollection(data)
        break
      case 'create-view':
        handleCreateView(data)
        break
      case 'insert-document':
        handleInsertDocument(data)
        break
      case 'create-index':
        handleCreateIndex(data)
        break
      case 'collection-info':
        showCollectionInfo(data)
        break
      case 'database-info':
        showDatabaseInfo(data)
        break
      case 'database-stats':
        showDatabaseStats(data)
        break
      case 'collection-stats':
        showCollectionStats(data)
        break
      default:
        console.log('MongoDB 操作:', currentOperation.value, data)
    }
    
    showDialog.value = false
  }
  
  function handleDialogCancel() {
    console.log('❌ MongoDB 对话框取消')
    showDialog.value = false
    currentOperation.value = ''
    operationData.value = {}
  }
  
  // ===== 具体操作实现 =====
  
  function handleCreateCollection(data: any) {
    console.log('🆕 创建 MongoDB 集合:', data)
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: {
        type: 'success',
        message: 'MongoDB 集合创建功能开发中...'
      }
    }))
  }
  
  function handleCreateView(data: any) {
    console.log('🆕 创建 MongoDB 视图:', data)
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: {
        type: 'success',
        message: 'MongoDB 视图创建功能开发中...'
      }
    }))
  }
  
  function handleInsertDocument(data: any) {
    console.log('📄 插入 MongoDB 文档:', data)
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: {
        type: 'success',
        message: 'MongoDB 文档插入功能开发中...'
      }
    }))
  }
  
  function handleCreateIndex(data: any) {
    console.log('🔑 创建 MongoDB 索引:', data)
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: {
        type: 'success',
        message: 'MongoDB 索引创建功能开发中...'
      }
    }))
  }
  
  function showCollectionInfo(data: any) {
    console.log('ℹ️ 显示 MongoDB 集合信息:', data)
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: {
        type: 'info',
        message: 'MongoDB 集合信息功能开发中...'
      }
    }))
  }
  
  function showDatabaseInfo(data: any) {
    console.log('ℹ️ 显示 MongoDB 数据库信息:', data)
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: {
        type: 'info',
        message: 'MongoDB 数据库信息功能开发中...'
      }
    }))
  }
  
  function showDatabaseStats(data: any) {
    console.log('📊 显示 MongoDB 数据库统计:', data)
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: {
        type: 'info',
        message: 'MongoDB 数据库统计功能开发中...'
      }
    }))
  }
  
  function showCollectionStats(data: any) {
    console.log('📊 显示 MongoDB 集合统计:', data)
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: {
        type: 'info',
        message: 'MongoDB 集合统计功能开发中...'
      }
    }))
  }
  
  // ===== 辅助函数 =====
  
  function getOperationName(operation: string): string {
    const operationNames: Record<string, string> = {
      'create-collection': '创建集合',
      'create-view': '创建视图',
      'insert-document': '插入文档',
      'update-documents': '更新文档',
      'delete-documents': '删除文档',
      'find-documents': '查询文档',
      'aggregate': '聚合查询',
      'create-index': '创建索引',
      'drop-index': '删除索引',
      'collection-info': '集合信息',
      'collection-stats': '集合统计',
      'database-info': '数据库信息',
      'database-stats': '数据库统计',
      'export-collection': '导出集合',
      'import-collection': '导入集合',
      'backup-database': '备份数据库',
      'restore-database': '恢复数据库',
      'profiling': '性能分析'
    }
    return operationNames[operation] || '未知操作'
  }
  
  function getCommandOperationName(command: string): string {
    const lowerCommand = command.trim().toLowerCase()
    
    if (lowerCommand.includes('find')) return '查询'
    if (lowerCommand.includes('insertone') || lowerCommand.includes('insertmany')) return '插入'
    if (lowerCommand.includes('updateone') || lowerCommand.includes('updatemany')) return '更新'
    if (lowerCommand.includes('deleteone') || lowerCommand.includes('deletemany')) return '删除'
    if (lowerCommand.includes('aggregate')) return '聚合'
    if (lowerCommand.includes('createindex')) return '创建索引'
    if (lowerCommand.includes('dropindex')) return '删除索引'
    if (lowerCommand.includes('drop')) return '删除'
    if (lowerCommand.includes('stats')) return '统计'
    if (lowerCommand.includes('count')) return '计数'
    if (lowerCommand.includes('distinct')) return '去重'
    if (lowerCommand.includes('validate')) return '验证'
    if (lowerCommand.includes('compact')) return '压缩'
    if (lowerCommand.includes('reindex')) return '重建索引'
    
    return 'MongoDB操作'
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