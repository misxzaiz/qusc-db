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
          v-for="table in tables"
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
          v-for="view in views"
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
          v-for="procedure in procedures"
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
          v-for="func in functions"
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
  }
})

const emit = defineEmits(['node-click', 'node-context-menu'])

// 展开状态
const isTablesExpanded = ref(true) // 表默认展开
const isViewsExpanded = ref(false)
const isProceduresExpanded = ref(false)
const isFunctionsExpanded = ref(false)

const isEmpty = computed(() => {
  return props.tables.length === 0 && 
         props.views.length === 0 && 
         props.procedures.length === 0 && 
         props.functions.length === 0
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
.mysql-tables-container {
  padding: 2px 0;
}

.folder-section {
  margin-bottom: 4px;
}

.folder-header {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 3px;
  transition: background-color 0.2s ease;
  user-select: none;
  font-size: 11px;
  font-weight: 600;
}

.folder-header:hover {
  background-color: #f5f5f5;
}

.folder-header.expanded {
  background-color: #f0f0f0;
}

.expand-icon {
  font-size: 8px;
  margin-right: 4px;
  color: #666;
  transition: transform 0.2s ease;
  width: 8px;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.folder-icon {
  font-size: 10px;
  margin-right: 4px;
  color: #ff9800;
}

.folder-name {
  flex: 1;
  color: #333;
}

.folder-count {
  font-size: 9px;
  color: #666;
  background: #e8e8e8;
  padding: 1px 4px;
  border-radius: 6px;
}

.folder-content {
  margin-left: 12px;
  padding-left: 4px;
  border-left: 1px solid #f0f0f0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  color: #999;
  font-size: 11px;
  text-align: center;
}

.empty-state i {
  font-size: 20px;
  margin-bottom: 8px;
  opacity: 0.5;
}
</style>