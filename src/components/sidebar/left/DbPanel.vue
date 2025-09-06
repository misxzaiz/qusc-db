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

      <!-- 使用新的分层架构 -->
      <div v-for="connection in connections" :key="connection.key" class="connection-item">
        <ConnectionNode 
          :connection="connection"
          :selected-node="selectedNode"
          @node-click="handleNodeClick"
          @node-expand="handleNodeExpand"
          @node-context-menu="handleContextMenu"
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useConnectionStore } from '@/stores/connection'
import ConnectionNode from './db/common/ConnectionNode.vue'

// Store
const connectionStore = useConnectionStore()

// Reactive data
const loading = ref(false)
const error = ref('')
const selectedNode = ref(null)
const connections = ref([])

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
    
    // 转换为连接节点格式（简化版）
    const connectionNodes = Object.entries(savedConfigs).map(([name, config]) => ({
      id: `connection-${name}`, // 连接ID，用于Tauri后端调用
      key: `connection-${name}`, // Vue key
      name: name,
      config: config,
      status: getConnectionStatus(name),
      expanded: false
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
  const isActive = connectionStore.activeConnections.find(
    conn => conn.name === connectionName
  )
  return isActive ? 'connected' : 'disconnected'
}

/**
 * 处理节点点击事件
 */
function handleNodeClick(nodeData) {
  selectedNode.value = nodeData
  console.log('Selected node:', nodeData)
  
  // 发射到父组件或全局状态管理
  // emit('node-selected', nodeData)
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
  // 可以在这里显示右键菜单
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