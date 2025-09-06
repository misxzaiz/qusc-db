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
          :connection-id="connection.id"
          :db-type="connection.config.db_type"
          :selected-node="selectedNode"
          @node-click="handleNodeClick"
          @node-expand="handleNodeExpand"
          @node-context-menu="handleNodeContextMenu"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import DatabaseNode from './DatabaseNode.vue'
import DatabaseService from '@/services/databaseService'

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

const emit = defineEmits(['node-click', 'node-expand', 'node-context-menu'])

const isExpanded = ref(false)
const loading = ref(false)
const error = ref(null)
const databases = ref([])

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
    await loadDatabases()
  }
  isExpanded.value = !isExpanded.value
  
  emit('node-click', {
    type: 'connection',
    connection: props.connection,
    expanded: isExpanded.value
  })
}

async function loadDatabases() {
  if (databases.value.length > 0) return
  
  loading.value = true
  error.value = null
  
  try {
    const response = await DatabaseService.getDatabases(props.connection.id)
    databases.value = response.databases
  } catch (err) {
    error.value = err.message || '加载数据库列表失败'
    console.error('ConnectionNode: 加载数据库失败', err)
  } finally {
    loading.value = false
  }
}

async function handleRetry() {
  await loadDatabases()
}

function handleContextMenu(event) {
  emit('node-context-menu', {
    type: 'connection',
    connection: props.connection,
    event
  })
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
</style>