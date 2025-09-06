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
          @click="refreshData"
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

      <!-- 数据库结构树 -->
      <div v-for="structure in databaseStructures" :key="structure.connection_id" class="connection-group">
        <div class="connection-header">
          <i :class="getDbTypeIcon(structure.db_type)"></i>
          <span class="connection-name">{{ getConnectionDisplayName(structure) }}</span>
          <span class="connection-status" :class="getStatusClass(structure)">●</span>
        </div>

        <div class="database-tree">
          <DatabaseTreeNode
            v-for="treeNode in buildTreeNodes(structure)"
            :key="treeNode.key"
            :node="treeNode"
            :selected="selectedNode?.key === treeNode.key"
            @node-click="handleNodeClick"
          />
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <i class="fas fa-spinner fa-spin"></i>
      <p>正在加载数据库结构...</p>
    </div>

    <!-- 错误状态 -->
    <div v-if="error && !loading" class="error-state">
      <i class="fas fa-exclamation-triangle"></i>
      <p>{{ error }}</p>
      <button @click="refreshData" class="retry-btn">重试</button>
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
const databaseStructures = ref([])
const selectedNode = ref(null)

// Computed
const connections = computed(() => connectionStore.activeConnections)

// 监听连接变化
watch(() => connectionStore.activeConnections, async (newConnections) => {
  if (newConnections.length > 0) {
    await loadDatabaseStructures()
  } else {
    databaseStructures.value = []
  }
}, { deep: true })

// 生命周期
onMounted(async () => {
  await loadDatabaseStructures()
})

/**
 * 加载数据库结构
 */
async function loadDatabaseStructures() {
  if (connectionStore.activeConnections.length === 0) {
    databaseStructures.value = []
    return
  }

  loading.value = true
  error.value = ''
  
  try {
    const structures = []
    
    for (const connection of connectionStore.activeConnections) {
      try {
        const structure = await DatabaseService.getDatabaseStructure(connection.id)
        structures.push(structure)
      } catch (err) {
        console.error(`Failed to load structure for connection ${connection.id}:`, err)
        // 继续加载其他连接，不让一个失败影响全部
      }
    }
    
    databaseStructures.value = structures
  } catch (err) {
    error.value = err.message || '加载数据库结构失败'
    console.error('Error loading database structures:', err)
  } finally {
    loading.value = false
  }
}

/**
 * 刷新数据
 */
async function refreshData() {
  await loadDatabaseStructures()
}

/**
 * 构建树节点数据
 */
function buildTreeNodes(structure) {
  const nodes = []
  
  // 为每个数据库创建节点
  for (const database of structure.databases) {
    const dbNode = {
      key: `${structure.connection_id}-${database.name}`,
      name: database.name,
      type: 'database',
      info: database.size_info?.formatted,
      children: buildDatabaseChildren(structure, database)
    }
    nodes.push(dbNode)
  }
  
  return nodes
}

/**
 * 构建数据库子节点
 */
function buildDatabaseChildren(structure, database) {
  const children = []
  
  // MySQL/PostgreSQL 结构
  if (['MySQL', 'PostgreSQL'].includes(structure.db_type)) {
    // 表文件夹
    if (database.tables.length > 0) {
      children.push({
        key: `${structure.connection_id}-${database.name}-tables`,
        name: '表',
        type: 'folder-tables',
        info: `${database.tables.length}`,
        children: database.tables.map(table => ({
          key: `${structure.connection_id}-${database.name}-table-${table.name}`,
          name: table.name,
          type: 'table',
          info: `${DatabaseService.formatCount(table.row_count)} 行, ${table.size_info?.formatted || '0B'}`,
          children: []
        }))
      })
    }
    
    // 视图文件夹
    if (database.views.length > 0) {
      children.push({
        key: `${structure.connection_id}-${database.name}-views`,
        name: '视图',
        type: 'folder-views',
        info: `${database.views.length}`,
        children: database.views.map(view => ({
          key: `${structure.connection_id}-${database.name}-view-${view.name}`,
          name: view.name,
          type: 'view',
          children: []
        }))
      })
    }
    
    // 存储过程文件夹
    if (database.procedures.length > 0) {
      children.push({
        key: `${structure.connection_id}-${database.name}-procedures`,
        name: '存储过程',
        type: 'folder-procedures',
        info: `${database.procedures.length}`,
        children: database.procedures.map(proc => ({
          key: `${structure.connection_id}-${database.name}-procedure-${proc.name}`,
          name: proc.name,
          type: 'procedure',
          children: []
        }))
      })
    }
    
    // 函数文件夹
    if (database.functions.length > 0) {
      children.push({
        key: `${structure.connection_id}-${database.name}-functions`,
        name: '函数',
        type: 'folder-functions',
        info: `${database.functions.length}`,
        children: database.functions.map(func => ({
          key: `${structure.connection_id}-${database.name}-function-${func.name}`,
          name: func.name,
          type: 'function',
          info: func.return_type,
          children: []
        }))
      })
    }
  }
  
  // Redis 结构
  if (structure.db_type === 'Redis' && database.redis_keys) {
    const redisInfo = database.redis_keys
    children.push({
      key: `${structure.connection_id}-${database.name}-keys`,
      name: '键',
      type: 'folder-keys',
      info: `${DatabaseService.formatCount(redisInfo.key_count)} 个`,
      children: redisInfo.sample_keys.map(keyNode => ({
        key: `${structure.connection_id}-${database.name}-key-${keyNode.key}`,
        name: keyNode.key,
        type: 'key',
        info: `${keyNode.data_type}${keyNode.ttl ? ` (TTL: ${keyNode.ttl}s)` : ''}`,
        children: []
      }))
    })
    
    if (redisInfo.expires_count > 0) {
      children.push({
        key: `${structure.connection_id}-${database.name}-expiry`,
        name: '过期键',
        type: 'folder-keys',
        info: `${DatabaseService.formatCount(redisInfo.expires_count)} 个`,
        children: []
      })
    }
  }
  
  // MongoDB 结构
  if (structure.db_type === 'MongoDB' && database.mongodb_collections) {
    const mongoInfo = database.mongodb_collections
    
    // 集合文件夹
    if (mongoInfo.collections.length > 0) {
      children.push({
        key: `${structure.connection_id}-${database.name}-collections`,
        name: '集合',
        type: 'folder-collections',
        info: `${mongoInfo.collections.length}`,
        children: mongoInfo.collections.map(collection => ({
          key: `${structure.connection_id}-${database.name}-collection-${collection.name}`,
          name: collection.name,
          type: 'collection',
          info: `${DatabaseService.formatCount(collection.document_count)} 文档`,
          children: collection.indexes.map(index => ({
            key: `${structure.connection_id}-${database.name}-collection-${collection.name}-index-${index.name}`,
            name: index.name,
            type: 'index',
            info: index.unique ? '唯一' : '普通',
            children: []
          }))
        }))
      })
    }
    
    // GridFS文件夹
    if (mongoInfo.gridfs_buckets.length > 0) {
      children.push({
        key: `${structure.connection_id}-${database.name}-gridfs`,
        name: 'GridFS',
        type: 'folder-gridfs',
        info: `${mongoInfo.gridfs_buckets.length}`,
        children: mongoInfo.gridfs_buckets.map(bucket => ({
          key: `${structure.connection_id}-${database.name}-gridfs-${bucket.name}`,
          name: bucket.name,
          type: 'collection',
          info: `${DatabaseService.formatCount(bucket.file_count)} 文件`,
          children: []
        }))
      })
    }
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
 * 获取连接显示名称
 */
function getConnectionDisplayName(structure) {
  const conn = structure.connection_info
  return `${conn.host}:${conn.port}${conn.database_name ? `/${conn.database_name}` : ''}`
}

/**
 * 获取连接状态样式
 */
function getStatusClass(structure) {
  // 简化实现，后续可以根据实际连接状态调整
  return 'status-connected'
}

/**
 * 处理节点点击事件
 */
function handleNodeClick(node) {
  selectedNode.value = node
  
  // 可以在这里触发其他事件，比如显示表数据、键详情等
  console.log('Selected node:', node)
  
  // 触发自定义事件给父组件
  // emit('node-selected', node)
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

.connection-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 8px;
  font-weight: 500;
  font-size: 13px;
}

.connection-name {
  flex: 1;
  color: #333;
}

.connection-status {
  font-size: 8px;
}

.status-connected {
  color: #4caf50;
}

.status-disconnected {
  color: #f44336;
}

.status-connecting {
  color: #ff9800;
}

.database-tree {
  margin-left: 8px;
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