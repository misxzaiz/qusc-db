import { ref } from 'vue'
import { nextTick } from 'vue'
import { useConnectionStore } from '@/stores/connection'

export function useRedisOperationManager() {
  const connectionStore = useConnectionStore()
  
  // 对话框状态
  const showDialog = ref(false)
  const currentOperation = ref('')
  const operationData = ref({})
  const dialogRef = ref(null)
  
  // 初始化事件监听器
  function initEventListeners() {
    // 监听显示操作对话框事件
    window.addEventListener('redis-show-operation-dialog', handleShowOperationDialog)
    
    // 监听执行命令事件
    window.addEventListener('redis-execute-command', handleExecuteCommand)
    
    // 监听其他Redis事件
    window.addEventListener('redis-view-key', handleViewKey)
    window.addEventListener('redis-edit-key', handleEditKey)
    window.addEventListener('redis-delete-key', handleDeleteKey)
    window.addEventListener('redis-flush-database', handleFlushDatabase)
    window.addEventListener('redis-database-info', handleDatabaseInfo)
    window.addEventListener('redis-refresh-database', handleRefreshDatabase)
  }
  
  // 清理事件监听器
  function cleanupEventListeners() {
    window.removeEventListener('redis-show-operation-dialog', handleShowOperationDialog)
    window.removeEventListener('redis-execute-command', handleExecuteCommand)
    window.removeEventListener('redis-view-key', handleViewKey)
    window.removeEventListener('redis-edit-key', handleEditKey)
    window.removeEventListener('redis-delete-key', handleDeleteKey)
    window.removeEventListener('redis-flush-database', handleFlushDatabase)
    window.removeEventListener('redis-database-info', handleDatabaseInfo)
    window.removeEventListener('redis-refresh-database', handleRefreshDatabase)
  }
  
  // ===== 事件处理器 =====
  
  function handleShowOperationDialog(event) {
    const detail = event.detail
    currentOperation.value = detail.operation
    operationData.value = {
      keyName: detail.keyName || '',
      dataType: detail.dataType || 'String',
      connectionId: detail.connectionId,
      databaseName: detail.databaseName,
      context: detail.context,
      options: detail.options || {}
    }
    showDialog.value = true
  }
  
  async function handleExecuteCommand(event) {
    const { connectionId, databaseName, command, context } = event.detail
    
    try {
      console.log(`执行Redis命令: ${command}`)
      const result = await connectionStore.executeQuery(connectionId, command)
      
      // 显示执行结果通知
      showNotification({
        type: 'success',
        message: `命令执行成功: ${command}`,
        result: result
      })
      
      // 如果需要刷新，触发刷新事件
      triggerRefresh(context)
      
    } catch (error) {
      console.error('Redis命令执行失败:', error)
      showNotification({
        type: 'error',
        message: `命令执行失败: ${error.message}`
      })
    }
  }
  
  async function handleViewKey(event) {
    const { keyName, connectionId, databaseName } = event.detail
    
    // 显示查看对话框
    currentOperation.value = 'get'
    operationData.value = {
      keyName,
      connectionId,
      databaseName,
      options: { title: '查看键值', autoExecute: true }
    }
    showDialog.value = true
    
    // 等待下一帧，确保对话框已渲染
    await nextTick()
    
    // 自动执行GET操作获取值
    try {
      const result = await executeRedisOperation('get', {
        keyName,
        connectionId,
        databaseName,
        operation: 'get'
      })
      
      if (result.success && dialogRef.value) {
        const value = result.data.rows?.[0]?.[0] || '(nil)'
        dialogRef.value.setValue(value)
      }
    } catch (error) {
      if (dialogRef.value) {
        dialogRef.value.setError(error.message || '获取键值失败')
      }
    }
  }
  
  async function handleEditKey(event) {
    const { keyName, connectionId, databaseName } = event.detail
    
    // 显示编辑对话框
    currentOperation.value = 'set'
    operationData.value = {
      keyName,
      connectionId,
      databaseName,
      options: { title: '编辑键值' }
    }
    showDialog.value = true
    
    // 等待下一帧，确保对话框已渲染
    await nextTick()
    
    // 先获取现有值填充到对话框
    try {
      const result = await executeRedisOperation('get', {
        keyName,
        connectionId,
        databaseName,
        operation: 'get'
      })
      
      if (result.success && dialogRef.value) {
        const currentValue = result.data.rows?.[0]?.[0] || ''
        dialogRef.value.setValue(currentValue)
      }
    } catch (error) {
      // 如果获取失败，继续显示对话框，但不预填充值
      console.warn('获取现有值失败:', error)
    }
  }
  
  async function handleDeleteKey(event) {
    const { keyName, connectionId, databaseName } = event.detail
    
    const confirmed = await showConfirmDialog({
      title: '删除确认',
      message: `确定要删除键 "${keyName}" 吗？`,
      type: 'danger'
    })
    
    if (confirmed) {
      await executeRedisOperation('del', {
        keyName,
        connectionId,
        databaseName,
        operation: 'del'
      })
    }
  }
  
  async function handleFlushDatabase(event) {
    const { connectionId, databaseName } = event.detail
    
    const confirmed = await showConfirmDialog({
      title: '清空数据库确认',
      message: `确定要清空数据库 "${databaseName}" 的所有数据吗？此操作不可恢复！`,
      type: 'danger'
    })
    
    if (confirmed) {
      try {
        await connectionStore.executeQuery(connectionId, 'FLUSHDB')
        showNotification({
          type: 'success',
          message: `数据库 "${databaseName}" 已清空`
        })
        // 触发刷新
        window.dispatchEvent(new CustomEvent('refresh-tree-node', {
          detail: { 
            affectedNodes: ['database'] 
          }
        }))
      } catch (error) {
        showNotification({
          type: 'error',
          message: `清空数据库失败: ${error.message}`
        })
      }
    }
  }
  
  async function handleDatabaseInfo(event) {
    const { connectionId, databaseName } = event.detail
    
    // 显示数据库信息对话框
    window.dispatchEvent(new CustomEvent('show-redis-info-dialog', {
      detail: {
        title: `数据库 "${databaseName}" 信息`,
        connectionId,
        databaseName
      }
    }))
  }
  
  function handleRefreshDatabase(event) {
    window.dispatchEvent(new CustomEvent('refresh-tree-node', {
      detail: { 
        affectedNodes: ['database'] 
      }
    }))
    showNotification({
      type: 'success',
      message: '数据库已刷新'
    })
  }
  
  // ===== 对话框操作处理 =====
  
  async function handleDialogConfirm(formData) {
    const { operation } = formData
    
    try {
      // 设置加载状态
      if (dialogRef.value) {
        dialogRef.value.setLoading(true)
        dialogRef.value.clearError()
      }
      
      const result = await executeRedisOperation(operation, formData)
      
      if (result.success) {
        // 如果是查询操作，显示结果但不关闭对话框
        if (['get', 'hget', 'hgetall', 'lrange', 'smembers', 'keys'].includes(operation)) {
          if (dialogRef.value && result.data) {
            if (operation === 'keys') {
              dialogRef.value.setKeys(result.data.rows?.flat() || [])
            } else {
              const value = result.data.rows?.[0]?.[0] || '(nil)'
              dialogRef.value.setValue(value)
            }
          }
          
          showNotification({
            type: 'success',
            message: result.message || '查询成功'
          })
          
          // 查询操作不自动关闭对话框，让用户手动关闭
        } else {
          // 非查询操作，关闭对话框并刷新
          showDialog.value = false
          showNotification({
            type: 'success',
            message: result.message || '操作成功'
          })
          triggerRefresh()
        }
        
      } else {
        if (dialogRef.value) {
          dialogRef.value.setError(result.message || '操作失败')
        }
      }
      
    } catch (error) {
      console.error('Redis操作失败:', error)
      if (dialogRef.value) {
        dialogRef.value.setError(error.message || '操作失败')
      }
    } finally {
      if (dialogRef.value) {
        dialogRef.value.setLoading(false)
      }
    }
  }
  
  function handleDialogCancel() {
    showDialog.value = false
    currentOperation.value = ''
    operationData.value = {}
  }
  
  // ===== 核心执行方法 =====
  
  async function executeRedisOperation(operation, data) {
    const { connectionId, keyName, value, fieldName, ttl, pattern, targetDatabase } = data
    
    let command = ''
    
    switch (operation) {
      case 'get':
        command = `GET ${keyName}`
        break
      case 'set':
        command = `SET ${keyName} "${value}"`
        if (ttl) command += ` EX ${ttl}`
        break
      case 'del':
        command = `DEL ${keyName}`
        break
      case 'hget':
        command = `HGET ${keyName} ${fieldName}`
        break
      case 'hset':
        command = `HSET ${keyName} ${fieldName} "${value}"`
        break
      case 'hgetall':
        command = `HGETALL ${keyName}`
        break
      case 'lrange':
        command = `LRANGE ${keyName} 0 -1`
        break
      case 'lpush':
        command = `LPUSH ${keyName} "${value}"`
        break
      case 'rpush':
        command = `RPUSH ${keyName} "${value}"`
        break
      case 'smembers':
        command = `SMEMBERS ${keyName}`
        break
      case 'sadd':
        command = `SADD ${keyName} "${value}"`
        break
      case 'append':
        command = `APPEND ${keyName} "${value}"`
        break
      case 'expire':
        command = `EXPIRE ${keyName} ${ttl}`
        break
      case 'keys':
        command = `KEYS ${pattern || '*'}`
        break
      case 'switch-database':
        command = `SELECT ${targetDatabase}`
        break
      default:
        throw new Error(`不支持的操作: ${operation}`)
    }
    
    try {
      const result = await connectionStore.executeQuery(connectionId, command)
      return {
        success: true,
        message: `${operation.toUpperCase()} 操作成功`,
        data: result
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || '操作失败'
      }
    }
  }
  
  // ===== 辅助方法 =====
  
  function showNotification(options) {
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: options
    }))
  }
  
  function triggerRefresh(context) {
    window.dispatchEvent(new CustomEvent('refresh-tree-node', {
      detail: { 
        context: context,
        affectedNodes: ['key', 'database'] 
      }
    }))
  }
  
  async function showConfirmDialog(options) {
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
  
  return {
    // 状态
    showDialog,
    currentOperation,
    operationData,
    dialogRef,
    
    // 方法
    initEventListeners,
    cleanupEventListeners,
    handleDialogConfirm,
    handleDialogCancel
  }
}