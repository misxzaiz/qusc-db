<template>
  <div class="db-panel">
    <div class="panel-header">
      <h3 class="panel-title">
        <i class="fas fa-database"></i>
        数据库导航
      </h3>
      <div class="panel-actions">
        <button 
          class="refresh-btn"
          @click="refreshConnections"
          :disabled="loading"
          title="刷新"
        >
          <i class="fas fa-sync" :class="{ 'fa-spin': loading }"></i>
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

      <!-- 数据库连接列表 -->
      <div v-for="connection in connections" :key="connection.key" class="connection-item">
        <!-- 连接头部 - 可点击展开 -->
        <div class="connection-header" @click="toggleConnection(connection)">
          <i class="fas fa-chevron-right" :class="{ 'expanded': connection.expanded }"></i>
          <i :class="getDbTypeIcon(connection.config.db_type)"></i>
          <span class="connection-name">{{ connection.name }}</span>
          <span class="connection-info">{{ connection.info }}</span>
          <span class="connection-status" :class="getStatusClass(connection.status)">●</span>
        </div>
        
        <!-- 展开的结构树 -->
        <div v-if="connection.expanded" class="connection-children">
          <div v-if="connection.loading" class="loading-item">
            <i class="fas fa-spinner fa-spin"></i>
            正在加载数据库结构...
          </div>
          
          <div v-else-if="connection.error" class="error-item">
            <i class="fas fa-exclamation-triangle"></i>
            {{ connection.error }}
            <button @click="loadConnectionStructure(connection)" class="retry-btn-small">重试</button>
          </div>
          
          <DatabaseTreeNode
            v-else
            v-for="child in connection.children"
            :key="child.key"
            :node="child"
            :selected="selectedNode?.key === child.key"
            @node-click="handleNodeClick"
          />
        </div>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useConnectionStore } from '@/stores/connection'
import DatabaseTreeNode from '@/components/common/DatabaseTreeNode.vue'
import DatabaseService from '@/services/databaseService'

// Store
const connectionStore = useConnectionStore()

// Reactive data
const loading = ref(false)
const error = ref('')
const selectedNode = ref(null)

// 简化的响应式数据
const connections = ref([])
const loadingConnections = ref({})

// 生命周期
onMounted(async () => {
  await loadSavedConnections()
})

/**
 * 加载已保存的连接配置
 */
async function loadSavedConnections() {
  loading.value = true
  error.value = ''
  
  try {
    const savedConfigs = await connectionStore.loadConnectionConfigs()
    
    // 转换为连接节点格式
    const connectionNodes = Object.entries(savedConfigs).map(([name, config]) => ({
      key: `connection-${name}`,
      name: name,
      type: 'connection',
      config: config,
      status: getConnectionStatus(name),
      info: `${config.host}:${config.port}`,
      children: [],
      expanded: false,
      loading: false,
      error: ''
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
  // 首先检查是否有保存的连接ID
  const savedConnection = connections.value.find(conn => conn.name === connectionName)
  if (savedConnection && savedConnection.connectionId) {
    // 检查是否在活动连接中
    const isActive = connectionStore.activeConnections.find(
      conn => conn.id === savedConnection.connectionId
    )
    return isActive ? 'connected' : 'disconnected'
  }
  
  // 如果没有连接ID，检查传统方式
  const isActive = connectionStore.activeConnections.find(
    conn => conn.name === connectionName
  )
  
  return isActive ? 'connected' : 'disconnected'
}

/**
 * 切换连接展开状态
 */
async function toggleConnection(connection) {
  if (connection.loading) return
  
  connection.expanded = !connection.expanded
  
  if (connection.expanded && connection.children.length === 0) {
    await loadConnectionStructure(connection)
  }
}

/**
 * 动态加载连接结构
 */
async function loadConnectionStructure(connection) {
  connection.loading = true
  connection.error = ''
  
  try {
    // 1. 先建立连接，获取连接ID
    const connectionId = await connectionStore.connectToDatabase(connection.config)
    
    if (!connectionId) {
      throw new Error('连接建立失败，未获得连接ID')
    }
    
    // 保存连接ID到连接对象中
    connection.connectionId = connectionId
    // 更新连接状态
    connection.status = 'connected'
    
    // 2. 使用连接ID获取数据库结构
    const structure = await DatabaseService.getDatabaseStructure(connectionId)
    
    // 3. 转换为简单的树节点
    connection.children = buildSimpleChildren(structure, connection)
  } catch (err) {
    connection.error = err.message || '加载数据库结构失败'
    connection.status = 'error'
    console.error('Error loading connection structure:', err)
  } finally {
    connection.loading = false
  }
}

/**
 * 构建简化的子节点
 */
function buildSimpleChildren(structure, parentConnection) {
  const children = []
  
  if (structure.databases) {
    // MySQL/PostgreSQL: 按数据库分组
    structure.databases.forEach(db => {
      const dbChildren = []
      
      // 添加表
      if (db.tables && db.tables.length > 0) {
        db.tables.forEach(table => {
          dbChildren.push({
            key: `${parentConnection.key}-${db.name}-table-${table.name}`,
            name: table.name,
            type: 'table',
            info: `${DatabaseService.formatCount(table.row_count)} 行`
          })
        })
      }
      
      // 添加视图
      if (db.views && db.views.length > 0) {
        db.views.forEach(view => {
          dbChildren.push({
            key: `${parentConnection.key}-${db.name}-view-${view.name}`,
            name: view.name,
            type: 'view',
            info: '视图'
          })
        })
      }
      
      children.push({
        key: `${parentConnection.key}-${db.name}`,
        name: db.name,
        type: 'database',
        info: `${db.tables?.length || 0} 表`,
        children: dbChildren,
        expanded: false
      })
    })
  } else if (structure.redis_keys) {
    // Redis: 显示键样例
    structure.redis_keys.sample_keys.forEach(keyInfo => {
      children.push({
        key: `${parentConnection.key}-key-${keyInfo.key}`,
        name: keyInfo.key,
        type: 'redis-key',
        info: keyInfo.data_type
      })
    })
  } else if (structure.mongodb_collections) {
    // MongoDB: 显示集合
    structure.mongodb_collections.collections.forEach(collection => {
      children.push({
        key: `${parentConnection.key}-collection-${collection.name}`,
        name: collection.name,
        type: 'collection',
        info: `${DatabaseService.formatCount(collection.document_count)} 文档`
      })
    })
  }
  
  return children
}

/**
 * 获取数据库类型图标
 */
function getDbTypeIcon(dbType) {
  const iconMap = {
    MySQL: 'fas fa-database',
    PostgreSQL: 'fas fa-elephant',
    Redis: 'fas fa-cube',
    MongoDB: 'fas fa-leaf',
    SQLite: 'fas fa-database'
  }
  return iconMap[dbType] || 'fas fa-database'
}

/**
 * 获取连接状态样式
 */
function getStatusClass(status) {
  const statusMap = {
    'connected': 'status-connected',
    'disconnected': 'status-disconnected',
    'connecting': 'status-connecting',
    'error': 'status-error'
  }
  return statusMap[status] || 'status-disconnected'
}

/**
 * 处理节点点击事件
 */
function handleNodeClick(node) {
  selectedNode.value = node
  console.log('Selected node:', node)
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
  gap: 4px;
}

.refresh-btn {
  padding: 4px 8px;
  border: 1px solid #d0d0d0;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: #f5f5f5;
  border-color: #b0b0b0;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.connection-group {
  margin-bottom: 16px;
}

.connection-item {
  margin-bottom: 8px;
}

.connection-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  font-weight: 500;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.connection-header:hover {
  background: #e9ecef;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.connection-header i:first-child {
  transition: transform 0.2s ease;
  color: #6c757d;
  font-size: 12px;
}

.connection-header i:first-child.expanded {
  transform: rotate(90deg);
}

.connection-children {
  margin-left: 20px;
  margin-top: 8px;
  border-left: 2px solid #dee2e6;
  padding-left: 12px;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.loading-item,
.error-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 12px;
  color: #6c757d;
  border-radius: 4px;
  background: #f8f9fa;
}

.error-item {
  color: #dc3545;
  background: #f8d7da;
}

.retry-btn-small {
  margin-left: auto;
  padding: 2px 6px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 10px;
}

.retry-btn-small:hover {
  background: #0056b3;
}

.connection-name {
  flex: 1;
  color: #333;
}

.connection-info {
  font-size: 11px;
  color: #6c757d;
}

.connection-status {
  font-size: 10px;
}

.status-connected {
  color: #28a745;
}

.status-disconnected {
  color: #dc3545;
}

.status-connecting {
  color: #ffc107;
}

.status-error {
  color: #dc3545;
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