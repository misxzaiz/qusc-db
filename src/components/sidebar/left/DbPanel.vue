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
    
    <!-- 右键菜单 - 移到主根节点内 -->
    <ContextMenu
      :visible="showMenu"
      :items="menuItems"
      :position="menuPosition"
      :context="currentContext"
      @close="closeMenu"
      @item-click="handleMenuItemClick"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useConnectionStore } from '@/stores/connection'
import ConnectionNode from './db/common/ConnectionNode.vue'
import ConnectionDialog from '@/components/dialog/ConnectionFormDialog.vue'
import ContextMenu from '@/components/common/ContextMenu.vue'
import { useConnectionManager } from './composables/useConnectionManager'
import { useContextMenu } from '@/composables/useContextMenu'

// 声明组件事件
const emit = defineEmits(['connection-select'])

// Store
const connectionStore = useConnectionStore()

// 右键菜单功能
const {
  showMenu,
  menuItems,
  menuPosition,
  currentContext,
  handleContextMenu: showContextMenu,
  closeMenu,
  handleMenuItemClick,
  createMenuContext
} = useContextMenu()

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
  
  // 确定数据库类型
  let dbType = 'MySQL' // 默认值
  let nodeType = contextData.type
  
  // 根据上下文数据确定数据库类型
  if (contextData.type === 'database' && contextData.database?.dbType) {
    dbType = contextData.database.dbType
  } else if (contextData.type === 'connection' && contextData.connection?.config?.db_type) {
    dbType = contextData.connection.config.db_type
  } else if (contextData.type === 'redis-key' || contextData.key) {
    // Redis key类型处理
    dbType = 'Redis'
    nodeType = 'key'
  } else if (contextData.connectionId) {
    // 通过连接ID查找数据库类型
    const connection = connections.value.find(conn => 
      conn.realConnectionId === contextData.connectionId || 
      conn.id === contextData.connectionId ||
      conn.key === contextData.connectionId
    )
    if (connection?.config?.db_type) {
      dbType = connection.config.db_type
    }
  }
  
  // 创建菜单上下文
  const menuContext = createMenuContext({
    nodeType: nodeType,
    dbType: dbType,
    connectionId: contextData.connectionId || '',
    databaseName: contextData.database?.name || contextData.database,
    nodeName: contextData.table?.name || contextData.key || contextData.database?.name || contextData.nodeName,
    nodeData: contextData.table || contextData.nodeData || contextData,
    event: contextData.event
  })
  
  // 显示右键菜单
  showContextMenu(contextData.event, menuContext)
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
  /* ===== 树结构设计系统变量 ===== */
  /* 🌳 层级缩进系统 */
  --tree-indent-base: 16px;
  --tree-indent-connection: 20px;
  --tree-indent-database: 16px;
  --tree-indent-folder: 12px;
  --tree-indent-table: 8px;
  
  /* 🎨 颜色系统 */
  --tree-bg-primary: #ffffff;
  --tree-bg-secondary: #fafafa;
  --tree-border-light: #e8e8e8;
  --tree-border-medium: #e0e0e0;
  --tree-text-primary: #333333;
  --tree-text-secondary: #666666;
  --tree-text-muted: #999999;
  
  /* 🔵 主题色系 */
  --tree-primary: #4a90e2;
  --tree-primary-light: rgba(74, 144, 226, 0.1);
  --tree-primary-ultra-light: rgba(74, 144, 226, 0.05);
  
  /* 🎯 交互状态颜色 */
  --tree-hover-bg: rgba(74, 144, 226, 0.08);
  --tree-selected-bg: rgba(74, 144, 226, 0.15);
  --tree-selected-border: #4a90e2;
  --tree-selected-text: #1976d2;
  --tree-active-bg: rgba(74, 144, 226, 0.12);
  
  /* 📊 数据库类型颜色 */
  --db-mysql: #00758f;
  --db-postgresql: #336791;
  --db-redis: #d82c20;
  --db-mongodb: #47a248;
  
  /* 🟢 状态指示色 */
  --status-success: #4caf50;
  --status-warning: #ff9800;
  --status-danger: #f44336;
  --status-muted: #9e9e9e;
  
  /* 📐 间距系统 */
  --tree-spacing-xs: 2px;
  --tree-spacing-sm: 4px;
  --tree-spacing-md: 8px;
  --tree-spacing-lg: 12px;
  --tree-spacing-xl: 16px;
  
  /* ✨ 动画参数 */
  --tree-transition-fast: 0.1s ease;
  --tree-transition-normal: 0.2s ease;
  --tree-transition-slow: 0.3s ease;
  
  /* 🔤 字体系统 */
  --tree-font-lg: 14px;
  --tree-font-md: 13px;
  --tree-font-sm: 12px;
  --tree-font-xs: 11px;
  --tree-font-xxs: 10px;
  
  /* 🎪 阴影系统 */
  --tree-shadow-light: 0 1px 3px rgba(0, 0, 0, 0.04);
  --tree-shadow-medium: 0 2px 8px rgba(0, 0, 0, 0.06);
  --tree-shadow-heavy: 0 4px 12px rgba(0, 0, 0, 0.08);
  
  /* 🎭 连接线系统 */
  --tree-line-color: var(--tree-border-light);
  --tree-line-width: 1px;
  --tree-line-style: solid;
  --tree-line-hover: var(--tree-primary);
  
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--tree-bg-primary);
  border-right: 1px solid var(--tree-border-medium);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--tree-spacing-lg) var(--tree-spacing-xl);
  border-bottom: var(--tree-line-width) solid var(--tree-border-medium);
  background: var(--tree-bg-secondary);
}

.panel-title {
  margin: 0;
  font-size: var(--tree-font-lg);
  font-weight: 600;
  color: var(--tree-text-primary);
  display: flex;
  align-items: center;
  gap: var(--tree-spacing-md);
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: var(--tree-spacing-sm);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: var(--tree-spacing-sm);
  padding: var(--tree-spacing-sm) var(--tree-spacing-md);
  border: var(--tree-line-width) solid var(--tree-border-medium);
  background: var(--tree-bg-primary);
  border-radius: 4px;
  cursor: pointer;
  transition: all var(--tree-transition-normal);
  font-size: var(--tree-font-sm);
  color: var(--tree-text-primary);
}

.action-btn:hover:not(:disabled) {
  background: var(--tree-hover-bg);
  border-color: var(--tree-primary);
  box-shadow: var(--tree-shadow-light);
  transform: translateY(-1px);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.action-btn.primary {
  background: var(--tree-primary);
  color: var(--tree-bg-primary);
  border-color: var(--tree-primary);
  box-shadow: var(--tree-shadow-light);
}

.action-btn.primary:hover:not(:disabled) {
  background: var(--tree-selected-text);
  border-color: var(--tree-selected-text);
  box-shadow: var(--tree-shadow-medium);
}

.action-btn i {
  font-size: var(--tree-font-xs);
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
  padding: var(--tree-spacing-md);
}

.connection-item {
  margin-bottom: var(--tree-spacing-sm);
}

.empty-state,
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px var(--tree-spacing-xl);
  text-align: center;
  color: var(--tree-text-secondary);
}

.empty-state i,
.loading-state i,
.error-state i {
  font-size: 32px;
  margin-bottom: var(--tree-spacing-lg);
  color: var(--tree-text-muted);
}

.loading-state i {
  color: var(--tree-primary);
  animation: spin 1s linear infinite;
}

.error-state i {
  color: var(--status-danger);
}

.empty-state p,
.loading-state p,
.error-state p {
  margin: 0 0 var(--tree-spacing-sm) 0;
  font-size: var(--tree-font-lg);
}

.empty-state small {
  font-size: var(--tree-font-sm);
  color: var(--tree-text-muted);
}

.retry-btn {
  margin-top: var(--tree-spacing-lg);
  padding: var(--tree-spacing-sm) var(--tree-spacing-xl);
  background: var(--tree-primary);
  color: var(--tree-bg-primary);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: var(--tree-font-sm);
  transition: all var(--tree-transition-normal);
  box-shadow: var(--tree-shadow-light);
}

.retry-btn:hover {
  background: var(--tree-selected-text);
  box-shadow: var(--tree-shadow-medium);
  transform: translateY(-1px);
}

/* ✨ 动画效果 */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
</style>