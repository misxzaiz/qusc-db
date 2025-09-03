import { ref, computed } from 'vue'
import { useConnectionStore } from '@/stores/connection.js'
import { useNotificationStore } from '@/stores/notification.js'

export function useConnectionManager() {
  const connectionStore = useConnectionStore()
  const notificationStore = useNotificationStore()
  
  // 响应式数据
  const showConnectionDialog = ref(false)
  const editingConnection = ref(null)
  const isConnecting = ref(false)
  
  // 计算属性
  const savedConnections = ref([])
  
  // 加载连接配置（异步）
  const loadSavedConnections = async () => {
    try {
      const configs = await connectionStore.loadConnectionConfigs()
      savedConnections.value = Object.entries(configs).map(([name, config]) => ({
        name,
        config,
        id: connectionStore.connections.get(name)?.id,
        isActive: connectionStore.currentConnection?.id === connectionStore.connections.get(name)?.id
      }))
    } catch (error) {
      console.error('加载连接配置失败:', error)
      savedConnections.value = []
    }
  }
  
  const currentConnectionId = computed(() => {
    return connectionStore.currentConnection?.id
  })
  
  const hasConnections = computed(() => {
    return savedConnections.value.length > 0
  })
  
  // 方法
  const showNewConnectionDialog = () => {
    editingConnection.value = null
    showConnectionDialog.value = true
  }
  
  const editConnection = (connection) => {
    editingConnection.value = connection
    showConnectionDialog.value = true
  }
  
  const closeConnectionDialog = () => {
    showConnectionDialog.value = false
    editingConnection.value = null
  }
  
  const saveConnection = async (connectionData) => {
    try {
      await connectionStore.saveConnectionConfig(connectionData.name, connectionData.config)
      notificationStore.success(`连接配置"${connectionData.name}"已保存`)
      // 重新加载连接列表
      await loadSavedConnections()
      closeConnectionDialog()
      return true
    } catch (error) {
      notificationStore.error(`保存连接失败: ${error.message}`)
      return false
    }
  }
  
  const deleteConnection = async (connectionName) => {
    try {
      // 如果当前连接是要删除的连接，先断开
      const connectionToDelete = connectionStore.connections.get(connectionName)
      if (connectionToDelete && connectionToDelete.id === currentConnectionId.value) {
        await connectionStore.disconnect(connectionToDelete.id)
      }
      
      connectionStore.deleteConnectionConfig(connectionName)
      notificationStore.success(`连接"${connectionName}"已删除`)
      // 重新加载连接列表
      await loadSavedConnections()
      return true
    } catch (error) {
      notificationStore.error(`删除连接失败: ${error.message}`)
      return false
    }
  }
  
  const connectToDatabase = async (connection) => {
    if (isConnecting.value) return false
    
    try {
      isConnecting.value = true
      
      // 如果已经连接到相同的数据库，不需要重新连接
      if (connection.isActive) {
        notificationStore.info('已连接到该数据库')
        return true
      }
      
      const connectionId = await connectionStore.connect(connection.config)
      notificationStore.success(`成功连接到 ${connection.name}`)
      
      return connectionId
    } catch (error) {
      notificationStore.error(`连接失败: ${error.message}`)
      return false
    } finally {
      isConnecting.value = false
    }
  }
  
  const disconnectFromDatabase = async (connectionName) => {
    try {
      const connection = connectionStore.connections.get(connectionName)
      if (connection) {
        await connectionStore.disconnect(connection.id)
        notificationStore.success(`已断开连接: ${connectionName}`)
      }
      return true
    } catch (error) {
      notificationStore.error(`断开连接失败: ${error.message}`)
      return false
    }
  }
  
  return {
    // 响应式数据
    showConnectionDialog,
    editingConnection,
    isConnecting,
    
    // 计算属性
    savedConnections,
    currentConnectionId,
    hasConnections,
    
    // 方法
    loadSavedConnections,
    showNewConnectionDialog,
    editConnection,
    closeConnectionDialog,
    saveConnection,
    deleteConnection,
    connectToDatabase,
    disconnectFromDatabase
  }
}