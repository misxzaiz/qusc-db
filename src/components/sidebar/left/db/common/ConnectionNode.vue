<template>
  <div class="connection-node" :class="{ 'expanded': isExpanded }">
    <div 
      class="connection-header" 
      @click="handleToggle"
      @contextmenu.prevent="handleContextMenu"
    >
      <i 
        class="expand-icon fas fa-chevron-right" 
        :class="{ 'expanded': isExpanded }"
      ></i>
      <i :class="dbTypeIcon" class="db-icon"></i>
      <span class="connection-name">{{ connection.name }}</span>
      <div class="connection-status">
        <i 
          :class="statusIcon" 
          class="status-indicator"
          :title="statusText"
        ></i>
      </div>
    </div>
    
    <div v-if="isExpanded" class="connection-content">
      <div v-if="loading" class="loading-state">
        <i class="fas fa-spinner fa-spin"></i>
        <span>加载数据库列表中...</span>
      </div>
      
      <div v-else-if="error" class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <span>{{ error }}</span>
        <button @click="handleRetry" class="retry-btn">重试</button>
      </div>
      
      <div v-else class="databases-container">
        <DatabaseNode
          v-for="database in databases"
          :key="database.name"
          :database="database"
          :connection-id="connection.realConnectionId"
          :db-type="connection.config.db_type"
          :selected-node="selectedNode"
          @node-click="handleNodeClick"
          @node-expand="handleNodeExpand"
          @node-context-menu="handleNodeContextMenu"
        />
      </div>
    </div>
    
    <!-- 右键菜单 -->
    <ContextMenu
      :visible="contextMenuVisible"
      :x="contextMenuX"
      :y="contextMenuY"
      @close="handleContextMenuClose"
    >
      <div class="context-menu-item" @click="handleReconnect" v-if="connection.status === 'disconnected' || connection.status === 'error'">
        <i class="fas fa-plug"></i>
        <span>重新连接</span>
      </div>
      <div class="context-menu-item" @click="handleDisconnect" v-if="connection.status === 'connected'">
        <i class="fas fa-unlink"></i>
        <span>断开连接</span>
      </div>
      <div class="context-menu-item" @click="handleEdit">
        <i class="fas fa-edit"></i>
        <span>编辑连接</span>
      </div>
      <div class="context-menu-item" @click="handleCopy">
        <i class="fas fa-copy"></i>
        <span>复制连接</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item danger" @click="handleDelete">
        <i class="fas fa-trash"></i>
        <span>删除连接</span>
      </div>
    </ContextMenu>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import DatabaseNode from './DatabaseNode.vue'
import DatabaseService from '@/services/databaseService'
import ContextMenu from '@/components/common/ContextMenu.vue'

const props = defineProps({
  connection: {
    type: Object,
    required: true
  },
  selectedNode: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['node-click', 'node-expand', 'node-context-menu', 'reconnect-connection', 'disconnect-connection', 'edit-connection', 'copy-connection', 'delete-connection'])

const isExpanded = ref(false)
const loading = ref(false)
const error = ref(null)
const databases = ref([])

// 右键菜单状态
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)

const dbTypeIcon = computed(() => {
  const iconMap = {
    'MySQL': 'fas fa-database text-mysql',
    'PostgreSQL': 'fas fa-database text-postgresql', 
    'Redis': 'fas fa-cube text-redis',
    'MongoDB': 'fas fa-leaf text-mongodb'
  }
  return iconMap[props.connection.config.db_type] || 'fas fa-database'
})

const statusIcon = computed(() => {
  switch (props.connection.status) {
    case 'connected': return 'fas fa-circle text-success'
    case 'connecting': return 'fas fa-circle text-warning'
    case 'disconnected': return 'fas fa-circle text-danger'
    default: return 'fas fa-circle text-muted'
  }
})

const statusText = computed(() => {
  const statusMap = {
    'connected': '已连接',
    'connecting': '连接中',
    'disconnected': '未连接',
    'error': '连接错误'
  }
  return statusMap[props.connection.status] || '未知状态'
})

async function handleToggle() {
  if (!isExpanded.value) {
    // 1. 先建立连接（如果还未连接）
    if (props.connection.status !== 'connected') {
      await establishConnection()
    }
    // 2. 再加载数据库列表
    await loadDatabases()
  }
  isExpanded.value = !isExpanded.value
  
  emit('node-click', {
    type: 'connection',
    connection: props.connection,
    expanded: isExpanded.value
  })
}

async function establishConnection() {
  if (props.connection.realConnectionId) {
    // 已经有真实连接ID，检查连接状态
    try {
      const isConnected = await DatabaseService.checkConnectionStatus(props.connection.realConnectionId)
      if (isConnected) {
        props.connection.status = 'connected'
        return
      }
    } catch (err) {
      // 连接失效，需要重新连接
      props.connection.realConnectionId = null
    }
  }
  
  loading.value = true
  error.value = null
  props.connection.status = 'connecting'
  
  try {
    console.log('建立数据库连接:', props.connection.config)
    
    // 调用 connect_database 获取真实连接ID
    const realConnectionId = await DatabaseService.connectToDatabase(props.connection.config)
    
    if (!realConnectionId) {
      throw new Error('连接建立失败，未获得连接ID')
    }
    
    // 保存真实连接ID
    props.connection.realConnectionId = realConnectionId
    props.connection.status = 'connected'
    
    console.log(`连接建立成功，连接ID: ${realConnectionId}`)
  } catch (err) {
    props.connection.status = 'error'
    error.value = err.message || '连接建立失败'
    console.error('ConnectionNode: 建立连接失败', err)
    throw err // 抛出错误，阻止后续数据库列表加载
  } finally {
    loading.value = false
  }
}

async function loadDatabases() {
  if (databases.value.length > 0) return
  if (!props.connection.realConnectionId) {
    error.value = '缺少有效的连接ID'
    return
  }
  
  loading.value = true
  error.value = null
  
  try {
    console.log('加载数据库列表，连接ID:', props.connection.realConnectionId)
    
    const response = await DatabaseService.getDatabases(props.connection.realConnectionId)
    databases.value = response.databases
    
    console.log(`成功加载 ${response.databases.length} 个数据库`)
  } catch (err) {
    error.value = err.message || '加载数据库列表失败'
    console.error('ConnectionNode: 加载数据库失败', err)
  } finally {
    loading.value = false
  }
}

async function handleRetry() {
  // 重试时重新建立连接和加载数据库列表
  databases.value = [] // 清空旧数据
  props.connection.realConnectionId = null // 清空旧连接ID
  props.connection.status = 'disconnected' // 重置状态
  
  try {
    await establishConnection()
    await loadDatabases()
  } catch (err) {
    console.error('重试失败:', err)
  }
}

function handleContextMenu(event) {
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  contextMenuVisible.value = true
  
  // 同时触发原有事件供父组件处理
  emit('node-context-menu', {
    type: 'connection',
    connection: props.connection,
    event
  })
}

function handleContextMenuClose() {
  contextMenuVisible.value = false
}

// 右键菜单操作处理
function handleReconnect() {
  contextMenuVisible.value = false
  emit('reconnect-connection', props.connection)
}

function handleDisconnect() {
  contextMenuVisible.value = false
  emit('disconnect-connection', props.connection)
}

function handleEdit() {
  contextMenuVisible.value = false
  emit('edit-connection', props.connection)
}

function handleCopy() {
  contextMenuVisible.value = false
  emit('copy-connection', props.connection)
}

function handleDelete() {
  contextMenuVisible.value = false
  emit('delete-connection', props.connection)
}

function handleNodeClick(nodeData) {
  emit('node-click', nodeData)
}

function handleNodeExpand(nodeData) {
  emit('node-expand', nodeData)
}

function handleNodeContextMenu(nodeData) {
  emit('node-context-menu', nodeData)
}

watch(() => props.connection.expanded, (newValue) => {
  if (newValue && !isExpanded.value) {
    handleToggle()
  }
})
</script>

<style scoped>
.connection-node {
  margin-bottom: 4px;
}

.connection-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
  user-select: none;
}

.connection-header:hover {
  background-color: #f5f5f5;
}

.expand-icon {
  font-size: 10px;
  margin-right: 8px;
  color: #666;
  transition: transform 0.2s ease;
  width: 12px;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.db-icon {
  font-size: 14px;
  margin-right: 8px;
}

.connection-name {
  flex: 1;
  font-weight: 500;
  font-size: 14px;
}

.connection-status {
  margin-left: 8px;
}

.status-indicator {
  font-size: 8px;
}

.connection-content {
  margin-left: 20px;
  padding-left: 12px;
  border-left: 1px solid #e0e0e0;
}

.loading-state,
.error-state {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  font-size: 12px;
  color: #666;
}

.loading-state i {
  margin-right: 8px;
  color: #1976d2;
}

.error-state {
  color: #d32f2f;
}

.error-state i {
  margin-right: 8px;
}

.retry-btn {
  margin-left: 8px;
  padding: 2px 8px;
  border: 1px solid #d32f2f;
  background: transparent;
  color: #d32f2f;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
}

.retry-btn:hover {
  background-color: #d32f2f;
  color: white;
}

.databases-container {
  padding: 4px 0;
}

/* 数据库类型颜色 */
.text-mysql { color: #00758f; }
.text-postgresql { color: #336791; }
.text-redis { color: #d82c20; }
.text-mongodb { color: #47a248; }
.text-success { color: #4caf50; }
.text-warning { color: #ff9800; }
.text-danger { color: #f44336; }
.text-muted { color: #9e9e9e; }

/* 右键菜单样式 */
.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  user-select: none;
}

.context-menu-item:hover {
  background-color: #f8f8f8;
}

.context-menu-item.danger {
  color: #d32f2f;
}

.context-menu-item.danger:hover {
  background-color: #ffebee;
}

.context-menu-item i {
  width: 12px;
  font-size: 11px;
  text-align: center;
}

.context-menu-divider {
  height: 1px;
  background: #e8e8e8;
  margin: 4px 0;
}
</style>