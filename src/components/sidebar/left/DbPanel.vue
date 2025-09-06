<template>
  <div class="db-panel">
    <div class="panel-header">
      <h3 class="panel-title">
        <i class="fas fa-database"></i>
        数据库导航
      </h3>
      <div class="panel-actions">
        <button 
          class="action-btn primary"
          @click="showNewConnectionDialog"
          :disabled="loading"
          title="新建连接"
        >
          <i class="fas fa-plus"></i>
          新建
        </button>
        
        <button 
          class="action-btn"
          @click="refreshConnections"
          :disabled="loading"
          title="刷新"
        >
          刷新
        </button>
      </div>
    </div>

    <div class="panel-content" v-if="!loading && !error">
      <!-- 连接列表 -->
      <div v-if="connections.length === 0" class="empty-state">
        <i class="fas fa-plug"></i>
        <p>暂无数据库连接</p>
        <small>请先建立数据库连接</small>
      </div>

      <!-- 使用新的分层架构 -->
      <div v-for="connection in connections" :key="connection.key" class="connection-item">
        <ConnectionNode 
          :connection="connection"
          :selected-node="selectedNode"
          @node-click="handleNodeClick"
          @node-expand="handleNodeExpand"
          @node-context-menu="handleContextMenu"
          @reconnect-connection="handleReconnectConnection"
          @disconnect-connection="handleDisconnectConnection"
          @edit-connection="handleEditConnection"
          @copy-connection="handleCopyConnection"
          @delete-connection="handleDeleteConnection"
        />
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <i class="fas fa-spinner fa-spin"></i>
      <p>正在加载连接配置...</p>
    </div>

    <!-- 错误状态 -->
    <div v-if="error && !loading" class="error-state">
      <i class="fas fa-exclamation-triangle"></i>
      <p>{{ error }}</p>
      <button @click="refreshConnections" class="retry-btn">重试</button>
    </div>
    
    <!-- 连接对话框 -->
    <ConnectionDialog 
      v-if="showConnectionDialog"
      :visible="showConnectionDialog"
      :connection="editingConnection"
      @save="handleSaveConnection"
      @cancel="handleCloseConnectionDialog"
      @update:visible="showConnectionDialog = $event"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useConnectionStore } from '@/stores/connection'
import ConnectionNode from './db/common/ConnectionNode.vue'
import ConnectionDialog from '@/components/dialog/ConnectionFormDialog.vue'
import { useConnectionManager } from './composables/useConnectionManager'

// Store
const connectionStore = useConnectionStore()

// 连接管理功能
const {
  showConnectionDialog,
  editingConnection,
  showNewConnectionDialog: openNewConnectionDialog,
  editConnection,
  saveConnection,
  closeConnectionDialog
} = useConnectionManager()

// 基础数据
const loading = ref(false)
const error = ref('')
const selectedNode = ref(null)
const connections = ref([])

// UI 状态管理
const showManageMenu = ref(false)
const manageDropdown = ref(null)

// 生命周期
onMounted(async () => {
  await loadSavedConnections()
  // 添加点击外部关闭下拉菜单的监听
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 点击外部关闭下拉菜单
function handleClickOutside(event) {
  if (manageDropdown.value && !manageDropdown.value.contains(event.target)) {
    showManageMenu.value = false
  }
}

/**
 * 加载已保存的连接配置
 */
async function loadSavedConnections() {
  loading.value = true
  error.value = ''
  
  try {
    const savedConfigs = await connectionStore.loadConnectionConfigs()
    
    // 转换为连接节点格式（简化版）
    const connectionNodes = Object.entries(savedConfigs).map(([name, config]) => ({
      id: `connection-${name}`, // Vue 显示ID
      key: `connection-${name}`, // Vue key
      name: name,
      config: config,
      status: getConnectionStatus(name),
      expanded: false,
      realConnectionId: null, // 真实的数据库连接ID，在连接时获取
      loading: false,
      error: null
    }))
    
    connections.value = connectionNodes
  } catch (err) {
    error.value = err.message || '加载连接配置失败'
    console.error('Error loading saved connections:', err)
  } finally {
    loading.value = false
  }
}

/**
 * 刷新连接列表
 */
async function refreshConnections() {
  await loadSavedConnections()
}

/**
 * 获取连接状态
 */
function getConnectionStatus(connectionName) {
  // 检查活动连接
  const activeConnection = connectionStore.activeConnections.find(
    conn => conn.name === connectionName
  )
  
  if (activeConnection) {
    return 'connected'
  }
  
  return 'disconnected'
}

/**
 * 处理节点点击事件
 */
function handleNodeClick(nodeData) {
  selectedNode.value = nodeData
  console.log('Selected node:', nodeData)
  
  // 如果是连接节点的点击，可能需要更新连接状态
  if (nodeData.type === 'connection') {
    const connection = connections.value.find(conn => conn.key === nodeData.connection.key)
    if (connection) {
      // 同步连接状态
      connection.status = nodeData.connection.status
      connection.realConnectionId = nodeData.connection.realConnectionId
      connection.loading = nodeData.connection.loading
      connection.error = nodeData.connection.error
    }
  }
}

/**
 * 处理节点展开事件
 */
function handleNodeExpand(nodeData) {
  console.log('Node expanded:', nodeData)
}

/**
 * 处理右键菜单事件
 */
function handleContextMenu(contextData) {
  console.log('Context menu:', contextData)
  
  // 实现连接管理菜单
  if (contextData.type === 'connection') {
    // 可以实现连接特定的右键菜单
    showConnectionContextMenu(contextData)
  }
}

/**
 * 显示连接右键菜单
 */
function showConnectionContextMenu(contextData) {
  // 这里可以显示连接相关的右键菜单
  // - 重新连接
  // - 编辑连接  
  // - 删除连接
  console.log('Connection context menu for:', contextData.connection.name)
}

// ===== 连接管理方法 =====

/**
 * 显示新建连接对话框
 */
function showNewConnectionDialog() {
  openNewConnectionDialog()
}

/**
 * 保存连接配置
 */
async function handleSaveConnection(connectionData) {
  try {
    await saveConnection(connectionData)
    // 保存成功后刷新连接列表
    await loadSavedConnections()
  } catch (err) {
    console.error('保存连接失败:', err)
    error.value = err.message || '保存连接失败'
  }
}

/**
 * 关闭连接对话框
 */
function handleCloseConnectionDialog() {
  closeConnectionDialog()
}

// ===== 右键菜单连接管理方法 =====

/**
 * 重新连接数据库
 */
async function handleReconnectConnection(connection) {
  try {
    loading.value = true
    // 清除旧的连接信息
    connection.realConnectionId = null
    connection.status = 'disconnected'
    
    // 重新建立连接 - 通过触发连接节点展开来建立连接
    const connectionNode = connections.value.find(conn => conn.key === connection.key)
    if (connectionNode) {
      connectionNode.expanded = false
      // 稍后触发展开以重新连接
      setTimeout(() => {
        connectionNode.expanded = true
      }, 100)
    }
    
    console.log('开始重新连接:', connection.name)
  } catch (err) {
    console.error('重新连接失败:', err)
    error.value = err.message || '重新连接失败'
  } finally {
    loading.value = false
  }
}

/**
 * 断开数据库连接
 */
async function handleDisconnectConnection(connection) {
  try {
    if (connection.realConnectionId) {
      // 调用断开连接的API
      // await DatabaseService.disconnectDatabase(connection.realConnectionId)
      connection.realConnectionId = null
    }
    connection.status = 'disconnected'
    
    // 折叠连接节点
    const connectionNode = connections.value.find(conn => conn.key === connection.key)
    if (connectionNode) {
      connectionNode.expanded = false
    }
    
    console.log('已断开连接:', connection.name)
  } catch (err) {
    console.error('断开连接失败:', err)
    error.value = err.message || '断开连接失败'
  }
}

/**
 * 编辑连接配置
 */
function handleEditConnection(connection) {
  // 使用连接管理器的编辑功能
  const connectionData = {
    name: connection.name,
    config: connection.config
  }
  editConnection(connectionData)
}

/**
 * 复制连接配置
 */
function handleCopyConnection(connection) {
  // 创建连接配置的副本
  const copiedConfig = {
    ...connection.config,
    // 可以修改一些字段以区分
  }
  
  const copiedName = `${connection.name} - 副本`
  
  // 打开新建连接对话框，预填充复制的配置
  editingConnection.value = {
    name: copiedName,
    config: copiedConfig
  }
  showConnectionDialog.value = true
}

/**
 * 删除连接配置
 */
async function handleDeleteConnection(connection) {
  try {
    // 确认删除
    if (confirm(`确定要删除连接"${connection.name}"吗？`)) {
      // 如果连接处于活动状态，先断开
      if (connection.realConnectionId) {
        await handleDisconnectConnection(connection)
      }
      
      // 删除配置
      await connectionStore.deleteConnectionConfig(connection.name)
      
      // 重新加载连接列表
      await loadSavedConnections()
      
      console.log('已删除连接配置:', connection.name)
    }
  } catch (err) {
    console.error('删除连接失败:', err)
    error.value = err.message || '删除连接失败'
  }
}

// ===== UI 交互方法 =====

/**
 * 切换管理菜单显示
 */
function toggleManageMenu() {
  showManageMenu.value = !showManageMenu.value
}

/**
 * 导出连接配置
 */
async function handleExportConnections() {
  showManageMenu.value = false
  try {
    // 这里实现导出逻辑
    console.log('导出连接配置')
  } catch (err) {
    console.error('导出失败:', err)
  }
}

/**
 * 导入连接配置
 */
async function handleImportConnections() {
  showManageMenu.value = false
  try {
    // 这里实现导入逻辑
    console.log('导入连接配置')
  } catch (err) {
    console.error('导入失败:', err)
  }
}

/**
 * 清理失效连接
 */
async function handleCleanupConnections() {
  showManageMenu.value = false
  try {
    // 这里实现清理逻辑
    console.log('清理失效连接')
  } catch (err) {
    console.error('清理失败:', err)
  }
}
</script>

<style scoped>
.db-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-right: 1px solid #e0e0e0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
}

.panel-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: 1px solid #d0d0d0;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
  color: #333;
}

.action-btn:hover:not(:disabled) {
  background: #f5f5f5;
  border-color: #b0b0b0;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-btn.primary {
  background: #4a90e2;
  color: white;
  border-color: #4a90e2;
}

.action-btn.primary:hover:not(:disabled) {
  background: #357abd;
  border-color: #357abd;
}

.action-btn i {
  font-size: 11px;
}

/* 下拉菜单 */
.dropdown {
  position: relative;
}

.dropdown-trigger {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  min-width: 160px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  padding: 4px 0;
  margin-top: 4px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  color: #333;
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.2s;
}

.dropdown-item:hover {
  background-color: #f8f8f8;
}

.dropdown-item.danger {
  color: #d32f2f;
}

.dropdown-item.danger:hover {
  background-color: #ffebee;
}

.dropdown-item i {
  width: 12px;
  font-size: 11px;
}

.dropdown-divider {
  height: 1px;
  background: #e8e8e8;
  margin: 4px 0;
}

/* 移除原来的refresh-btn样式，统一使用action-btn */

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.connection-item {
  margin-bottom: 4px;
}

.empty-state,
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  text-align: center;
  color: #666;
}

.empty-state i,
.loading-state i,
.error-state i {
  font-size: 32px;
  margin-bottom: 12px;
  color: #bbb;
}

.loading-state i {
  color: #4a90e2;
}

.error-state i {
  color: #f44336;
}

.empty-state p,
.loading-state p,
.error-state p {
  margin: 0 0 4px 0;
  font-size: 14px;
}

.empty-state small {
  font-size: 12px;
  color: #999;
}

.retry-btn {
  margin-top: 12px;
  padding: 6px 16px;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.retry-btn:hover {
  background: #357abd;
}
</style>