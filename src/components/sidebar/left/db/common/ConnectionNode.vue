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
/* 🌳 连接节点 - 顶层样式 */
.connection-node {
  /* 继承父级变量，设置连接层特有样式 */
  margin-bottom: var(--tree-spacing-sm, 4px);
  position: relative;
}

.connection-node.expanded {
  margin-bottom: var(--tree-spacing-md, 8px);
}

.connection-header {
  display: flex;
  align-items: center;
  padding: var(--tree-spacing-lg, 12px) var(--tree-spacing-lg, 12px);
  cursor: pointer;
  border-radius: 8px;
  transition: all var(--tree-transition-normal, 0.2s ease);
  user-select: none;
  position: relative;
  background: var(--tree-bg-primary, #ffffff);
  border: 2px solid transparent;
}

/* 🎯 悬停效果 - 精致的渐变和阴影 */
.connection-header:hover {
  background: linear-gradient(135deg, 
    var(--tree-hover-bg, rgba(74, 144, 226, 0.08)) 0%, 
    var(--tree-primary-ultra-light, rgba(74, 144, 226, 0.05)) 100%);
  box-shadow: var(--tree-shadow-medium, 0 2px 8px rgba(0, 0, 0, 0.06));
  transform: translateY(-1px);
  border-color: var(--tree-primary, #4a90e2);
}

/* 🎨 展开状态样式 */
.connection-node.expanded .connection-header {
  background: var(--tree-active-bg, rgba(74, 144, 226, 0.12));
  border-color: var(--tree-primary, #4a90e2);
  box-shadow: var(--tree-shadow-light, 0 1px 3px rgba(0, 0, 0, 0.04));
}

/* ▶️ 展开图标 - 增强动画效果 */
.expand-icon {
  font-size: var(--tree-font-xxs, 10px);
  margin-right: var(--tree-spacing-md, 8px);
  color: var(--tree-text-secondary, #666666);
  transition: all var(--tree-transition-normal, 0.2s ease);
  width: 14px;
  text-align: center;
  transform-origin: center;
}

.expand-icon.expanded {
  transform: rotate(90deg);
  color: var(--tree-primary, #4a90e2);
}

.connection-header:hover .expand-icon {
  color: var(--tree-primary, #4a90e2);
  transform: scale(1.1);
}

.connection-header:hover .expand-icon.expanded {
  transform: rotate(90deg) scale(1.1);
}

/* 🗄️ 数据库类型图标 */
.db-icon {
  font-size: var(--tree-font-lg, 14px);
  margin-right: var(--tree-spacing-md, 8px);
  transition: all var(--tree-transition-normal, 0.2s ease);
}

.connection-header:hover .db-icon {
  transform: scale(1.05);
}

/* 📝 连接名称 */
.connection-name {
  flex: 1;
  font-weight: 600;
  font-size: var(--tree-font-lg, 14px);
  color: var(--tree-text-primary, #333333);
  transition: color var(--tree-transition-normal, 0.2s ease);
}

.connection-header:hover .connection-name {
  color: var(--tree-selected-text, #1976d2);
}

/* 🔵 状态指示器容器 */
.connection-status {
  margin-left: var(--tree-spacing-md, 8px);
  display: flex;
  align-items: center;
}

.status-indicator {
  font-size: var(--tree-font-xxs, 10px);
  transition: all var(--tree-transition-normal, 0.2s ease);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.connection-header:hover .status-indicator {
  transform: scale(1.2);
}

/* 📦 连接内容区域 */
.connection-content {
  margin-left: var(--tree-indent-connection, 20px);
  padding-left: var(--tree-spacing-lg, 12px);
  border-left: 2px solid var(--tree-line-color, #e8e8e8);
  position: relative;
  transition: all var(--tree-transition-normal, 0.2s ease);
}

/* 🎭 连接线优化 */
.connection-content::before {
  content: '';
  position: absolute;
  left: -6px;
  top: 0;
  width: 10px;
  height: 2px;
  background: var(--tree-line-color, #e8e8e8);
  transition: background-color var(--tree-transition-normal, 0.2s ease);
}

.connection-node.expanded .connection-content {
  border-left-color: var(--tree-primary, #4a90e2);
}

.connection-node.expanded .connection-content::before {
  background: var(--tree-primary, #4a90e2);
}

/* ⏳ 加载和错误状态 */
.loading-state,
.error-state {
  display: flex;
  align-items: center;
  padding: var(--tree-spacing-md, 8px) var(--tree-spacing-lg, 12px);
  font-size: var(--tree-font-sm, 12px);
  color: var(--tree-text-secondary, #666666);
  border-radius: 6px;
  margin-bottom: var(--tree-spacing-sm, 4px);
}

.loading-state {
  background: var(--tree-primary-ultra-light, rgba(74, 144, 226, 0.05));
  animation: pulse 2s ease-in-out infinite;
}

.loading-state i {
  margin-right: var(--tree-spacing-md, 8px);
  color: var(--tree-primary, #4a90e2);
  animation: spin 1s linear infinite;
}

.error-state {
  background: rgba(244, 67, 54, 0.05);
  color: var(--status-danger, #f44336);
  border: 1px solid rgba(244, 67, 54, 0.2);
}

.error-state i {
  margin-right: var(--tree-spacing-md, 8px);
  color: var(--status-danger, #f44336);
}

.retry-btn {
  margin-left: var(--tree-spacing-md, 8px);
  padding: var(--tree-spacing-xs, 2px) var(--tree-spacing-md, 8px);
  border: 1px solid var(--status-danger, #f44336);
  background: transparent;
  color: var(--status-danger, #f44336);
  border-radius: 4px;
  cursor: pointer;
  font-size: var(--tree-font-xs, 11px);
  transition: all var(--tree-transition-normal, 0.2s ease);
}

.retry-btn:hover {
  background-color: var(--status-danger, #f44336);
  color: var(--tree-bg-primary, #ffffff);
  box-shadow: var(--tree-shadow-light, 0 1px 3px rgba(0, 0, 0, 0.04));
  transform: translateY(-1px);
}

/* 📁 数据库容器 */
.databases-container {
  padding: var(--tree-spacing-sm, 4px) 0;
}

/* 🎨 数据库类型专属颜色 */
.text-mysql { color: var(--db-mysql, #00758f); }
.text-postgresql { color: var(--db-postgresql, #336791); }
.text-redis { color: var(--db-redis, #d82c20); }
.text-mongodb { color: var(--db-mongodb, #47a248); }
.text-success { color: var(--status-success, #4caf50); }
.text-warning { color: var(--status-warning, #ff9800); }
.text-danger { color: var(--status-danger, #f44336); }
.text-muted { color: var(--status-muted, #9e9e9e); }

/* 🖱️ 右键菜单样式 */
.context-menu-item {
  display: flex;
  align-items: center;
  gap: var(--tree-spacing-md, 8px);
  padding: var(--tree-spacing-md, 8px) var(--tree-spacing-lg, 12px);
  font-size: var(--tree-font-sm, 12px);
  cursor: pointer;
  transition: all var(--tree-transition-fast, 0.1s ease);
  user-select: none;
  border-radius: 4px;
  margin: 2px;
}

.context-menu-item:hover {
  background: var(--tree-hover-bg, rgba(74, 144, 226, 0.08));
  transform: translateX(2px);
}

.context-menu-item.danger {
  color: var(--status-danger, #f44336);
}

.context-menu-item.danger:hover {
  background: rgba(244, 67, 54, 0.1);
  color: var(--status-danger, #f44336);
}

.context-menu-item i {
  width: 14px;
  font-size: var(--tree-font-xs, 11px);
  text-align: center;
}

.context-menu-divider {
  height: 1px;
  background: var(--tree-border-light, #e8e8e8);
  margin: var(--tree-spacing-sm, 4px) 0;
}

/* ✨ 动画定义 */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
</style>