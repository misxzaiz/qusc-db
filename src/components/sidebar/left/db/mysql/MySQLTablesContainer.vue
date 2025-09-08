<template>
  <div class="mysql-tables-container">
    <!-- 表文件夹 -->
    <div v-if="tables.length > 0" class="folder-section">
      <div 
        class="folder-header" 
        @click="toggleTablesFolder"
        :class="{ 'expanded': isTablesExpanded }"
      >
        <i class="expand-icon fas fa-chevron-right" :class="{ 'expanded': isTablesExpanded }"></i>
        <i class="fas fa-folder folder-icon"></i>
        <span class="folder-name">表</span>
        <span class="folder-count">{{ tables.length }}</span>
      </div>
      
      <div v-if="isTablesExpanded" class="folder-content">
        <TableNode
          v-for="table in filteredTables"
          :key="table.name"
          :table="table"
          :database="database"
          :connection-id="connectionId"
          :db-type="dbType"
          :table-type="'table'"
          :selected-node="selectedNode"
          @node-click="handleNodeClick"
          @node-context-menu="handleNodeContextMenu"
        />
      </div>
    </div>
    
    <!-- 视图文件夹 -->
    <div v-if="views.length > 0" class="folder-section">
      <div 
        class="folder-header" 
        @click="toggleViewsFolder"
        :class="{ 'expanded': isViewsExpanded }"
      >
        <i class="expand-icon fas fa-chevron-right" :class="{ 'expanded': isViewsExpanded }"></i>
        <i class="fas fa-folder folder-icon"></i>
        <span class="folder-name">视图</span>
        <span class="folder-count">{{ views.length }}</span>
      </div>
      
      <div v-if="isViewsExpanded" class="folder-content">
        <TableNode
          v-for="view in filteredViews"
          :key="view.name"
          :table="view"
          :database="database"
          :connection-id="connectionId"
          :db-type="dbType"
          :table-type="'view'"
          :selected-node="selectedNode"
          @node-click="handleNodeClick"
          @node-context-menu="handleNodeContextMenu"
        />
      </div>
    </div>
    
    <!-- 存储过程文件夹 -->
    <div v-if="procedures.length > 0" class="folder-section">
      <div 
        class="folder-header" 
        @click="toggleProceduresFolder"
        :class="{ 'expanded': isProceduresExpanded }"
      >
        <i class="expand-icon fas fa-chevron-right" :class="{ 'expanded': isProceduresExpanded }"></i>
        <i class="fas fa-folder folder-icon"></i>
        <span class="folder-name">存储过程</span>
        <span class="folder-count">{{ procedures.length }}</span>
      </div>
      
      <div v-if="isProceduresExpanded" class="folder-content">
        <TableNode
          v-for="procedure in filteredProcedures"
          :key="procedure.name"
          :table="procedure"
          :database="database"
          :connection-id="connectionId"
          :db-type="dbType"
          :table-type="'procedure'"
          :selected-node="selectedNode"
          @node-click="handleNodeClick"
          @node-context-menu="handleNodeContextMenu"
        />
      </div>
    </div>
    
    <!-- 函数文件夹 -->
    <div v-if="functions.length > 0" class="folder-section">
      <div 
        class="folder-header" 
        @click="toggleFunctionsFolder"
        :class="{ 'expanded': isFunctionsExpanded }"
      >
        <i class="expand-icon fas fa-chevron-right" :class="{ 'expanded': isFunctionsExpanded }"></i>
        <i class="fas fa-folder folder-icon"></i>
        <span class="folder-name">函数</span>
        <span class="folder-count">{{ functions.length }}</span>
      </div>
      
      <div v-if="isFunctionsExpanded" class="folder-content">
        <TableNode
          v-for="func in filteredFunctions"
          :key="func.name"
          :table="func"
          :database="database"
          :connection-id="connectionId"
          :db-type="dbType"
          :table-type="'function'"
          :selected-node="selectedNode"
          @node-click="handleNodeClick"
          @node-context-menu="handleNodeContextMenu"
        />
      </div>
    </div>
    
    <!-- 筛选无结果提示 -->
    <div v-if="tableFilter && !hasAnyFilteredResults" class="no-filter-results">
      <i class="fas fa-search"></i>
      <span>没有找到包含 "{{ tableFilter }}" 的表</span>
    </div>
    
    <!-- 空状态 -->
    <div v-if="isEmpty" class="empty-state">
      <i class="fas fa-inbox"></i>
      <span>该数据库暂无表、视图、存储过程或函数</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import TableNode from '../common/TableNode.vue'

const props = defineProps({
  tables: {
    type: Array,
    default: () => []
  },
  views: {
    type: Array,
    default: () => []
  },
  procedures: {
    type: Array,
    default: () => []
  },
  functions: {
    type: Array,
    default: () => []
  },
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

const emit = defineEmits(['node-click', 'node-context-menu'])

// 展开状态
const isTablesExpanded = ref(true) // 表默认展开
const isViewsExpanded = ref(false)
const isProceduresExpanded = ref(false)
const isFunctionsExpanded = ref(false)

// 筛选逻辑：根据表名筛选
const filteredTables = computed(() => {
  if (!props.tableFilter.trim()) {
    return props.tables
  }
  const query = props.tableFilter.toLowerCase().trim()
  return props.tables.filter(table => 
    table.name.toLowerCase().includes(query)
  )
})

const filteredViews = computed(() => {
  if (!props.tableFilter.trim()) {
    return props.views
  }
  const query = props.tableFilter.toLowerCase().trim()
  return props.views.filter(view => 
    view.name.toLowerCase().includes(query)
  )
})

const filteredProcedures = computed(() => {
  if (!props.tableFilter.trim()) {
    return props.procedures
  }
  const query = props.tableFilter.toLowerCase().trim()
  return props.procedures.filter(procedure => 
    procedure.name.toLowerCase().includes(query)
  )
})

const filteredFunctions = computed(() => {
  if (!props.tableFilter.trim()) {
    return props.functions
  }
  const query = props.tableFilter.toLowerCase().trim()
  return props.functions.filter(func => 
    func.name.toLowerCase().includes(query)
  )
})

const isEmpty = computed(() => {
  return props.tables.length === 0 && 
         props.views.length === 0 && 
         props.procedures.length === 0 && 
         props.functions.length === 0
})

const hasAnyFilteredResults = computed(() => {
  return filteredTables.value.length > 0 || 
         filteredViews.value.length > 0 || 
         filteredProcedures.value.length > 0 || 
         filteredFunctions.value.length > 0
})

function toggleTablesFolder() {
  isTablesExpanded.value = !isTablesExpanded.value
}

function toggleViewsFolder() {
  isViewsExpanded.value = !isViewsExpanded.value
}

function toggleProceduresFolder() {
  isProceduresExpanded.value = !isProceduresExpanded.value
}

function toggleFunctionsFolder() {
  isFunctionsExpanded.value = !isFunctionsExpanded.value
}

function handleNodeClick(nodeData) {
  emit('node-click', nodeData)
}

function handleNodeContextMenu(nodeData) {
  emit('node-context-menu', nodeData)
}
</script>

<style scoped>
/* 📂 MySQL表容器 - 第三层样式 */
.mysql-tables-container {
  padding: var(--tree-spacing-xs, 2px) 0;
}

/* 📁 文件夹分组区域 */
.folder-section {
  margin-bottom: var(--tree-spacing-sm, 4px);
  position: relative;
}

.folder-section:last-child {
  margin-bottom: 0;
}

/* 📂 文件夹头部样式 */
.folder-header {
  display: flex;
  align-items: center;
  padding: var(--tree-spacing-sm, 4px) var(--tree-spacing-md, 8px);
  cursor: pointer;
  border-radius: 5px;
  transition: all var(--tree-transition-normal, 0.2s ease);
  user-select: none;
  font-size: var(--tree-font-xs, 11px);
  font-weight: 600;
  position: relative;
  background: var(--tree-bg-primary, #ffffff);
  border: 1px solid transparent;
}

/* 🎯 文件夹悬停效果 */
.folder-header:hover {
  background: linear-gradient(135deg, 
    rgba(255, 152, 0, 0.05) 0%, 
    rgba(255, 152, 0, 0.08) 100%);
  border-color: rgba(255, 152, 0, 0.3);
  transform: translateX(1px);
  box-shadow: var(--tree-shadow-light, 0 1px 3px rgba(0, 0, 0, 0.04));
}

/* 🎨 展开状态样式 */
.folder-header.expanded {
  background: rgba(255, 152, 0, 0.08);
  border-color: rgba(255, 152, 0, 0.2);
  box-shadow: var(--tree-shadow-light, 0 1px 3px rgba(0, 0, 0, 0.04));
}

.folder-header.expanded:hover {
  background: rgba(255, 152, 0, 0.12);
}

/* ▶️ 文件夹展开图标 */
.expand-icon {
  font-size: var(--tree-font-xxs, 10px);
  margin-right: var(--tree-spacing-sm, 4px);
  color: var(--tree-text-secondary, #666666);
  transition: all var(--tree-transition-normal, 0.2s ease);
  width: 10px;
  text-align: center;
  transform-origin: center;
}

.expand-icon.expanded {
  transform: rotate(90deg);
  color: #ff9800;
}

.folder-header:hover .expand-icon {
  color: #ff9800;
  transform: scale(1.1);
}

.folder-header:hover .expand-icon.expanded {
  transform: rotate(90deg) scale(1.1);
}

/* 📁 文件夹图标 */
.folder-icon {
  font-size: var(--tree-font-xxs, 10px);
  margin-right: var(--tree-spacing-sm, 4px);
  color: #ff9800;
  transition: all var(--tree-transition-normal, 0.2s ease);
  filter: drop-shadow(0 1px 1px rgba(255, 152, 0, 0.3));
}

.folder-header:hover .folder-icon {
  transform: scale(1.05);
  color: #f57c00;
}

.folder-header.expanded .folder-icon {
  color: #f57c00;
}

/* 📝 文件夹名称 */
.folder-name {
  flex: 1;
  color: var(--tree-text-primary, #333333);
  transition: color var(--tree-transition-normal, 0.2s ease);
  letter-spacing: 0.02em;
}

.folder-header:hover .folder-name {
  color: #f57c00;
}

.folder-header.expanded .folder-name {
  color: #f57c00;
  font-weight: 700;
}

/* 🔢 文件夹计数标签 */
.folder-count {
  font-size: var(--tree-font-xxs, 10px);
  color: var(--tree-text-secondary, #666666);
  background: var(--tree-bg-secondary, #e8e8e8);
  padding: 1px var(--tree-spacing-sm, 4px);
  border-radius: 8px;
  transition: all var(--tree-transition-normal, 0.2s ease);
  border: 1px solid transparent;
  min-width: 20px;
  text-align: center;
}

.folder-header:hover .folder-count {
  background: rgba(255, 152, 0, 0.1);
  color: #f57c00;
  border-color: rgba(255, 152, 0, 0.3);
  transform: scale(1.05);
}

.folder-header.expanded .folder-count {
  background: rgba(245, 124, 0, 0.15);
  color: #f57c00;
  border-color: rgba(245, 124, 0, 0.4);
  font-weight: 600;
}

/* 📦 文件夹内容区域 */
.folder-content {
  margin-left: var(--tree-indent-folder, 12px);
  padding-left: var(--tree-spacing-sm, 4px);
  border-left: 2px solid rgba(255, 152, 0, 0.2);
  position: relative;
  transition: all var(--tree-transition-normal, 0.2s ease);
  overflow: hidden;
}

/* 🎭 文件夹层连接线 */
.folder-content::before {
  content: '';
  position: absolute;
  left: -4px;
  top: 0;
  width: 6px;
  height: 2px;
  background: rgba(255, 152, 0, 0.3);
  transition: all var(--tree-transition-normal, 0.2s ease);
}

.folder-section:hover .folder-content {
  border-left-color: rgba(245, 124, 0, 0.4);
}

.folder-section:hover .folder-content::before {
  background: rgba(245, 124, 0, 0.5);
  width: 8px;
}

/* 💫 展开动画 */
.folder-content {
  animation: expandIn 0.3s ease-out;
}

@keyframes expandIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scaleY(0.8);
  }
  to {
    opacity: 1;
    transform: translateY(0) scaleY(1);
  }
}

/* 🔍 筛选无结果提示样式 */
.no-filter-results {
  display: flex;
  align-items: center;
  padding: var(--tree-spacing-md, 8px) var(--tree-spacing-lg, 12px);
  color: var(--tree-text-secondary, #666666);
  font-size: var(--tree-font-sm, 12px);
  text-align: center;
  background: rgba(33, 150, 243, 0.05);
  border: 1px dashed rgba(33, 150, 243, 0.2);
  border-radius: 6px;
  margin: var(--tree-spacing-sm, 4px) 0;
}

.no-filter-results i {
  margin-right: var(--tree-spacing-sm, 4px);
  color: var(--tree-primary, #4a90e2);
  font-size: var(--tree-font-sm, 12px);
}

.no-filter-results span {
  flex: 1;
}

/* 📄 空状态样式 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--tree-spacing-xl, 16px);
  color: var(--tree-text-muted, #999999);
  font-size: var(--tree-font-xs, 11px);
  text-align: center;
  background: var(--tree-bg-secondary, #fafafa);
  border-radius: 6px;
  border: 1px dashed var(--tree-border-light, #e8e8e8);
  margin: var(--tree-spacing-sm, 4px) 0;
}

.empty-state i {
  font-size: 24px;
  margin-bottom: var(--tree-spacing-md, 8px);
  opacity: 0.4;
  color: var(--tree-text-muted, #999999);
}

/* 🌈 不同类型文件夹的个性化颜色 */
.folder-section:nth-child(1) {
  /* 表文件夹 - 绿色主题 */
  --folder-primary: #4caf50;
  --folder-primary-light: rgba(76, 175, 80, 0.1);
}

.folder-section:nth-child(1) .folder-header:hover {
  background: linear-gradient(135deg, 
    var(--folder-primary-light) 0%, 
    rgba(76, 175, 80, 0.08) 100%);
  border-color: rgba(76, 175, 80, 0.3);
}

.folder-section:nth-child(1) .folder-icon,
.folder-section:nth-child(1) .expand-icon.expanded,
.folder-section:nth-child(1) .folder-header:hover .folder-name {
  color: var(--folder-primary);
}

.folder-section:nth-child(2) {
  /* 视图文件夹 - 蓝色主题 */
  --folder-primary: #2196f3;
  --folder-primary-light: rgba(33, 150, 243, 0.1);
}

.folder-section:nth-child(2) .folder-header:hover {
  background: linear-gradient(135deg, 
    var(--folder-primary-light) 0%, 
    rgba(33, 150, 243, 0.08) 100%);
  border-color: rgba(33, 150, 243, 0.3);
}

.folder-section:nth-child(2) .folder-icon,
.folder-section:nth-child(2) .expand-icon.expanded,
.folder-section:nth-child(2) .folder-header:hover .folder-name {
  color: var(--folder-primary);
}

.folder-section:nth-child(3) {
  /* 存储过程文件夹 - 紫色主题 */
  --folder-primary: #9c27b0;
  --folder-primary-light: rgba(156, 39, 176, 0.1);
}

.folder-section:nth-child(3) .folder-header:hover {
  background: linear-gradient(135deg, 
    var(--folder-primary-light) 0%, 
    rgba(156, 39, 176, 0.08) 100%);
  border-color: rgba(156, 39, 176, 0.3);
}

.folder-section:nth-child(3) .folder-icon,
.folder-section:nth-child(3) .expand-icon.expanded,
.folder-section:nth-child(3) .folder-header:hover .folder-name {
  color: var(--folder-primary);
}

.folder-section:nth-child(4) {
  /* 函数文件夹 - 橙红色主题 */
  --folder-primary: #ff5722;
  --folder-primary-light: rgba(255, 87, 34, 0.1);
}

.folder-section:nth-child(4) .folder-header:hover {
  background: linear-gradient(135deg, 
    var(--folder-primary-light) 0%, 
    rgba(255, 87, 34, 0.08) 100%);
  border-color: rgba(255, 87, 34, 0.3);
}

.folder-section:nth-child(4) .folder-icon,
.folder-section:nth-child(4) .expand-icon.expanded,
.folder-section:nth-child(4) .folder-header:hover .folder-name {
  color: var(--folder-primary);
}

/* ✨ 进入动画 */
.folder-section {
  animation: slideInLeft 0.3s ease-out;
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 🎪 微妙的阴影效果 */
.folder-header {
  position: relative;
}

.folder-header::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 10%;
  right: 10%;
  height: 1px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(0, 0, 0, 0.05) 50%, 
    transparent 100%);
  opacity: 0;
  transition: opacity var(--tree-transition-normal, 0.2s ease);
}

.folder-header:hover::after {
  opacity: 1;
}
</style>