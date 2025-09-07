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
          :database="databaseWithTables"
          :connection-id="connectionId"
          :db-type="dbType"
          :selected-node="selectedNode"
          :table-filter="tableFilter"
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
  },
  tableFilter: {
    type: String,
    default: ''
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

// 创建包含加载数据的数据库对象，供子组件使用
const databaseWithTables = computed(() => {
  return {
    ...props.database,
    tables: tables.value,
    views: views.value,
    procedures: procedures.value,
    functions: functions.value
  }
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
    dbType: props.dbType,
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
/* 🗃️ 数据库节点 - 第二层样式 */
.database-node {
  margin-bottom: var(--tree-spacing-xs, 2px);
  position: relative;
}

.database-header {
  display: flex;
  align-items: center;
  padding: var(--tree-spacing-sm, 4px) var(--tree-spacing-lg, 12px);
  cursor: pointer;
  border-radius: 6px;
  transition: all var(--tree-transition-normal, 0.2s ease);
  user-select: none;
  position: relative;
  background: var(--tree-bg-primary, #ffffff);
}

/* 🎯 数据库节点悬停效果 */
.database-header:hover {
  background: linear-gradient(135deg, 
    var(--tree-primary-ultra-light, rgba(74, 144, 226, 0.05)) 0%, 
    rgba(74, 144, 226, 0.08) 100%);
  transform: translateX(2px);
  box-shadow: var(--tree-shadow-light, 0 1px 3px rgba(0, 0, 0, 0.04));
}

/* 🎨 选中状态样式 */
.database-node.selected .database-header {
  background: var(--tree-selected-bg, rgba(74, 144, 226, 0.15));
  color: var(--tree-selected-text, #1976d2);
  border-left: 3px solid var(--tree-selected-border, #4a90e2);
  padding-left: var(--tree-spacing-md, 8px);
  box-shadow: inset 0 0 0 1px rgba(74, 144, 226, 0.2);
}

.database-node.selected .database-header:hover {
  background: var(--tree-selected-bg, rgba(74, 144, 226, 0.15));
  transform: none;
}

/* ▶️ 数据库展开图标 */
.expand-icon {
  font-size: var(--tree-font-xxs, 10px);
  margin-right: var(--tree-spacing-sm, 4px);
  color: var(--tree-text-secondary, #666666);
  transition: all var(--tree-transition-normal, 0.2s ease);
  width: 12px;
  text-align: center;
  transform-origin: center;
}

.expand-icon.expanded {
  transform: rotate(90deg);
  color: var(--tree-primary, #4a90e2);
}

.database-header:hover .expand-icon {
  color: var(--tree-primary, #4a90e2);
  transform: scale(1.1);
}

.database-header:hover .expand-icon.expanded {
  transform: rotate(90deg) scale(1.1);
}

/* 🗄️ 数据库图标 */
.database-icon {
  font-size: var(--tree-font-sm, 12px);
  margin-right: var(--tree-spacing-sm, 4px);
  color: var(--tree-primary, #4a90e2);
  transition: all var(--tree-transition-normal, 0.2s ease);
}

.database-header:hover .database-icon {
  color: var(--tree-selected-text, #1976d2);
  transform: scale(1.05);
}

.database-node.selected .database-icon {
  color: var(--tree-selected-text, #1976d2);
}

/* 📝 数据库名称 */
.database-name {
  flex: 1;
  font-weight: 500;
  font-size: var(--tree-font-md, 13px);
  color: var(--tree-text-primary, #333333);
  transition: color var(--tree-transition-normal, 0.2s ease);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.database-header:hover .database-name {
  color: var(--tree-selected-text, #1976d2);
}

.database-node.selected .database-name {
  color: var(--tree-selected-text, #1976d2);
  font-weight: 600;
}

/* 📊 数据库信息标签 */
.database-info {
  font-size: var(--tree-font-xs, 11px);
  color: var(--tree-text-secondary, #666666);
  margin-right: var(--tree-spacing-md, 8px);
  background: var(--tree-bg-secondary, #f5f5f5);
  padding: 2px var(--tree-spacing-sm, 4px);
  border-radius: 10px;
  transition: all var(--tree-transition-normal, 0.2s ease);
  border: 1px solid transparent;
}

.database-header:hover .database-info {
  background: var(--tree-primary-ultra-light, rgba(74, 144, 226, 0.05));
  border-color: var(--tree-primary, #4a90e2);
  color: var(--tree-selected-text, #1976d2);
  transform: scale(1.05);
}

.database-node.selected .database-info {
  background: rgba(25, 118, 210, 0.1);
  color: var(--tree-selected-text, #1976d2);
  border-color: var(--tree-selected-text, #1976d2);
}

/* 📦 数据库内容区域 */
.database-content {
  margin-left: var(--tree-indent-database, 16px);
  padding-left: var(--tree-spacing-md, 8px);
  border-left: 2px solid var(--tree-line-color, #e8e8e8);
  position: relative;
  transition: all var(--tree-transition-normal, 0.2s ease);
}

/* 🎭 数据库层连接线 */
.database-content::before {
  content: '';
  position: absolute;
  left: -5px;
  top: 0;
  width: 8px;
  height: 2px;
  background: var(--tree-line-color, #e8e8e8);
  transition: background-color var(--tree-transition-normal, 0.2s ease);
}

.database-node.selected .database-content {
  border-left-color: var(--tree-selected-border, #4a90e2);
}

.database-node.selected .database-content::before {
  background: var(--tree-selected-border, #4a90e2);
}

/* ⏳ 加载和错误状态 */
.loading-state,
.error-state {
  display: flex;
  align-items: center;
  padding: var(--tree-spacing-sm, 4px) var(--tree-spacing-lg, 12px);
  font-size: var(--tree-font-xs, 11px);
  color: var(--tree-text-secondary, #666666);
  border-radius: 4px;
  margin-bottom: var(--tree-spacing-xs, 2px);
}

.loading-state {
  background: var(--tree-primary-ultra-light, rgba(74, 144, 226, 0.05));
  animation: pulse 2s ease-in-out infinite;
}

.loading-state i {
  margin-right: var(--tree-spacing-sm, 4px);
  color: var(--tree-primary, #4a90e2);
  animation: spin 1s linear infinite;
}

.error-state {
  background: rgba(244, 67, 54, 0.05);
  color: var(--status-danger, #f44336);
  border: 1px solid rgba(244, 67, 54, 0.15);
}

.error-state i {
  margin-right: var(--tree-spacing-sm, 4px);
  color: var(--status-danger, #f44336);
}

.retry-btn {
  margin-left: var(--tree-spacing-sm, 4px);
  padding: var(--tree-spacing-xs, 2px) var(--tree-spacing-sm, 4px);
  border: 1px solid var(--status-danger, #f44336);
  background: transparent;
  color: var(--status-danger, #f44336);
  border-radius: 3px;
  cursor: pointer;
  font-size: var(--tree-font-xxs, 10px);
  transition: all var(--tree-transition-normal, 0.2s ease);
}

.retry-btn:hover {
  background-color: var(--status-danger, #f44336);
  color: var(--tree-bg-primary, #ffffff);
  box-shadow: var(--tree-shadow-light, 0 1px 3px rgba(0, 0, 0, 0.04));
  transform: translateY(-1px);
}

/* 📁 表容器 */
.tables-container {
  padding: var(--tree-spacing-xs, 2px) 0;
}

/* ✨ 动画定义 */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

/* 💫 微妙的进入动画 */
.database-node {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>