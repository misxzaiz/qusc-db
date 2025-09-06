<template>
  <div class="database-node" :class="{ 'expanded': isExpanded, 'selected': isSelected }">
    <div 
      class="database-header" 
      @click="handleToggle"
      @contextmenu.prevent="handleContextMenu"
    >
      <i 
        class="expand-icon fas fa-chevron-right" 
        :class="{ 'expanded': isExpanded }"
      ></i>
      <i :class="databaseIcon" class="database-icon"></i>
      <span class="database-name">{{ database.name }}</span>
      <span v-if="database.table_count" class="database-info">
        {{ database.table_count }} 表
      </span>
    </div>
    
    <div v-if="isExpanded" class="database-content">
      <div v-if="loading" class="loading-state">
        <i class="fas fa-spinner fa-spin"></i>
        <span>加载表列表中...</span>
      </div>
      
      <div v-else-if="error" class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <span>{{ error }}</span>
        <button @click="handleRetry" class="retry-btn">重试</button>
      </div>
      
      <div v-else class="tables-container">
        <!-- 根据数据库类型显示不同的子节点 -->
        <component 
          :is="getTableComponent()"
          :tables="tables"
          :views="views" 
          :procedures="procedures"
          :functions="functions"
          :redis-keys="redisKeys"
          :mongodb-collections="mongoCollections"
          :database="database"
          :connection-id="connectionId"
          :db-type="dbType"
          :selected-node="selectedNode"
          @node-click="handleNodeClick"
          @node-context-menu="handleNodeContextMenu"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineAsyncComponent } from 'vue'
import DatabaseService from '@/services/databaseService'

// 预定义表容器组件映射
const TABLE_COMPONENTS = {
  'MySQL': defineAsyncComponent(() => import('../mysql/MySQLTablesContainer.vue')),
  'PostgreSQL': defineAsyncComponent(() => import('../mysql/MySQLTablesContainer.vue')), // 暂时复用MySQL
  'Redis': defineAsyncComponent(() => import('../redis/RedisKeysContainer.vue')),
  'MongoDB': defineAsyncComponent(() => import('../mongodb/MongoCollectionsContainer.vue')),
  'default': defineAsyncComponent(() => import('./DefaultTablesContainer.vue'))
}

const props = defineProps({
  database: {
    type: Object,
    required: true
  },
  connectionId: {
    type: String,
    required: true
  },
  dbType: {
    type: String,
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

// 表数据
const tables = ref([])
const views = ref([])
const procedures = ref([])
const functions = ref([])
const redisKeys = ref(null)
const mongoCollections = ref(null)

const databaseIcon = computed(() => {
  return 'fas fa-database'
})

const isSelected = computed(() => {
  return props.selectedNode && 
         props.selectedNode.type === 'database' && 
         props.selectedNode.name === props.database.name
})

function getTableComponent() {
  return TABLE_COMPONENTS[props.dbType] || TABLE_COMPONENTS['default']
}

async function handleToggle() {
  if (!isExpanded.value) {
    await loadTables()
  }
  isExpanded.value = !isExpanded.value
  
  emit('node-click', {
    type: 'database',
    database: props.database,
    connectionId: props.connectionId,
    expanded: isExpanded.value
  })
}

async function loadTables() {
  if (tables.value.length > 0 || redisKeys.value || mongoCollections.value) {
    return // 已经加载过了
  }
  
  loading.value = true
  error.value = null
  
  try {
    const response = await DatabaseService.getDatabaseTables(
      props.connectionId, 
      props.database.name
    )
    
    // 根据数据库类型分配数据
    if (response.tables) tables.value = response.tables
    if (response.views) views.value = response.views
    if (response.procedures) procedures.value = response.procedures
    if (response.functions) functions.value = response.functions
    if (response.redis_keys) redisKeys.value = response.redis_keys
    if (response.mongodb_collections) mongoCollections.value = response.mongodb_collections
    
    console.log(`成功加载数据库 ${props.database.name} 的内容`)
  } catch (err) {
    error.value = err.message || '加载表列表失败'
    console.error('DatabaseNode: 加载表失败', err)
  } finally {
    loading.value = false
  }
}

async function handleRetry() {
  await loadTables()
}

function handleContextMenu(event) {
  emit('node-context-menu', {
    type: 'database',
    database: props.database,
    connectionId: props.connectionId,
    event
  })
}

function handleNodeClick(nodeData) {
  emit('node-click', nodeData)
}

function handleNodeContextMenu(nodeData) {
  emit('node-context-menu', nodeData)
}
</script>

<style scoped>
.database-node {
  margin-bottom: 2px;
}

.database-header {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  user-select: none;
}

.database-header:hover {
  background-color: #f0f0f0;
}

.database-node.selected .database-header {
  background-color: #e3f2fd;
  color: #1976d2;
}

.expand-icon {
  font-size: 9px;
  margin-right: 6px;
  color: #666;
  transition: transform 0.2s ease;
  width: 10px;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.database-icon {
  font-size: 12px;
  margin-right: 6px;
  color: #4a90e2;
}

.database-name {
  flex: 1;
  font-weight: 500;
  font-size: 13px;
}

.database-info {
  font-size: 11px;
  color: #666;
  margin-right: 8px;
  background: #f5f5f5;
  padding: 1px 6px;
  border-radius: 8px;
}

.database-size {
  font-size: 10px;
  color: #888;
}

.database-content {
  margin-left: 16px;
  padding-left: 8px;
  border-left: 1px solid #e8e8e8;
}

.loading-state,
.error-state {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  font-size: 11px;
  color: #666;
}

.loading-state i {
  margin-right: 6px;
  color: #1976d2;
}

.error-state {
  color: #d32f2f;
}

.error-state i {
  margin-right: 6px;
}

.retry-btn {
  margin-left: 6px;
  padding: 2px 6px;
  border: 1px solid #d32f2f;
  background: transparent;
  color: #d32f2f;
  border-radius: 2px;
  cursor: pointer;
  font-size: 10px;
}

.retry-btn:hover {
  background-color: #d32f2f;
  color: white;
}

.tables-container {
  padding: 2px 0;
}
</style>