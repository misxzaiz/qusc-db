<template>
  <div 
    class="table-node" 
    :class="{ 'selected': isSelected }"
    @click="handleClick"
    @contextmenu.prevent="handleContextMenu"
  >
    <div class="table-header">
      <i :class="tableIcon" class="table-icon"></i>
      <span class="table-name">{{ table.name }}</span>
      <div class="table-meta">
        <span v-if="table.row_count" class="row-count">
          {{ formatCount(table.row_count) }} 行
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  table: {
    type: Object,
    required: true
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
  tableType: {
    type: String,
    default: 'table' // table, view, procedure, function
  }
})

const emit = defineEmits(['node-click', 'node-context-menu'])

const tableIcon = computed(() => {
  const iconMap = {
    'table': 'fas fa-table',
    'view': 'fas fa-eye', 
    'procedure': 'fas fa-cogs',
    'function': 'fas fa-code'
  }
  return iconMap[props.tableType] || 'fas fa-table'
})

const isSelected = computed(() => {
  return props.selectedNode && 
         props.selectedNode.type === props.tableType && 
         props.selectedNode.name === props.table.name &&
         props.selectedNode.database === props.database.name
})

function formatCount(count) {
  if (!count) return '0'
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return count.toString()
}

function handleClick() {
  emit('node-click', {
    type: props.tableType,
    table: props.table,
    database: props.database.name,
    connectionId: props.connectionId,
    dbType: props.dbType
  })
}

function handleContextMenu(event) {
  emit('node-context-menu', {
    type: props.tableType,
    table: props.table,
    database: props.database.name,
    connectionId: props.connectionId,
    dbType: props.dbType,
    event
  })
}
</script>

<style scoped>
/* 🔷 表节点 - 第四层（叶子节点）样式 */
.table-node {
  margin-bottom: 1px;
  position: relative;
}

.table-header {
  display: flex;
  align-items: center;
  padding: var(--tree-spacing-sm, 4px) var(--tree-spacing-lg, 12px);
  cursor: pointer;
  border-radius: 4px;
  transition: all var(--tree-transition-normal, 0.2s ease);
  user-select: none;
  font-size: var(--tree-font-sm, 12px);
  position: relative;
  background: var(--tree-bg-primary, #ffffff);
  border-left: 3px solid transparent;
}

/* 🎯 表节点悬停效果 */
.table-header:hover {
  background: linear-gradient(135deg, 
    rgba(80, 200, 120, 0.05) 0%, 
    rgba(80, 200, 120, 0.08) 100%);
  transform: translateX(2px);
  border-left-color: rgba(80, 200, 120, 0.4);
  box-shadow: var(--tree-shadow-light, 0 1px 3px rgba(0, 0, 0, 0.04));
}

/* 🎨 选中状态样式 */
.table-node.selected .table-header {
  background: rgba(80, 200, 120, 0.15);
  color: #2e7d32;
  border-left-color: #4caf50;
  box-shadow: inset 0 0 0 1px rgba(76, 175, 80, 0.2);
}

.table-node.selected .table-header:hover {
  background: rgba(80, 200, 120, 0.15);
  transform: none;
}

/* 🔷 表图标 */
.table-icon {
  font-size: var(--tree-font-xs, 11px);
  margin-right: var(--tree-spacing-sm, 6px);
  width: 14px;
  text-align: center;
  color: #50c878;
  transition: all var(--tree-transition-normal, 0.2s ease);
  filter: drop-shadow(0 1px 1px rgba(80, 200, 120, 0.3));
}

.table-header:hover .table-icon {
  color: #4caf50;
  transform: scale(1.1);
}

.table-node.selected .table-icon {
  color: #2e7d32;
}

/* 📝 表名称 */
.table-name {
  flex: 1;
  font-weight: 400;
  color: var(--tree-text-primary, #333333);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: all var(--tree-transition-normal, 0.2s ease);
}

.table-header:hover .table-name {
  color: #2e7d32;
  font-weight: 500;
}

.table-node.selected .table-name {
  color: #2e7d32;
  font-weight: 600;
}

/* 📊 表元信息容器 */
.table-meta {
  display: flex;
  align-items: center;
  gap: var(--tree-spacing-sm, 6px);
}

/* 🔢 行数标签 */
.row-count {
  font-size: var(--tree-font-xxs, 10px);
  color: var(--tree-text-secondary, #666666);
  background: var(--tree-bg-secondary, #f0f0f0);
  padding: 1px var(--tree-spacing-sm, 4px);
  border-radius: 8px;
  transition: all var(--tree-transition-normal, 0.2s ease);
  border: 1px solid transparent;
  min-width: 30px;
  text-align: center;
}

.table-header:hover .row-count {
  background: rgba(80, 200, 120, 0.1);
  color: #2e7d32;
  border-color: rgba(76, 175, 80, 0.3);
  transform: scale(1.05);
}

.table-node.selected .row-count {
  background: rgba(46, 125, 50, 0.15);
  color: #2e7d32;
  border-color: #4caf50;
  font-weight: 600;
}

/* 📏 大小信息 */
.table-size {
  font-size: var(--tree-font-xxs, 9px);
  color: var(--tree-text-muted, #888888);
  transition: color var(--tree-transition-normal, 0.2s ease);
}

.table-header:hover .table-size {
  color: var(--tree-text-secondary, #666666);
}

/* 🌈 不同类型表节点的个性化样式 */

/* 👁️ 视图节点样式 */
.table-node[data-type="view"] .table-icon {
  color: #2196f3;
}

.table-node[data-type="view"] .table-header:hover {
  background: linear-gradient(135deg, 
    rgba(33, 150, 243, 0.05) 0%, 
    rgba(33, 150, 243, 0.08) 100%);
  border-left-color: rgba(33, 150, 243, 0.4);
}

.table-node[data-type="view"].selected .table-header {
  background: rgba(33, 150, 243, 0.15);
  color: #1565c0;
  border-left-color: #2196f3;
}

.table-node[data-type="view"] .table-header:hover .table-icon {
  color: #1976d2;
}

.table-node[data-type="view"] .table-header:hover .table-name,
.table-node[data-type="view"].selected .table-name {
  color: #1565c0;
}

.table-node[data-type="view"] .table-header:hover .row-count {
  background: rgba(33, 150, 243, 0.1);
  color: #1565c0;
  border-color: rgba(33, 150, 243, 0.3);
}

/* ⚙️ 存储过程节点样式 */
.table-node[data-type="procedure"] .table-icon {
  color: #ff9800;
}

.table-node[data-type="procedure"] .table-header:hover {
  background: linear-gradient(135deg, 
    rgba(255, 152, 0, 0.05) 0%, 
    rgba(255, 152, 0, 0.08) 100%);
  border-left-color: rgba(255, 152, 0, 0.4);
}

.table-node[data-type="procedure"].selected .table-header {
  background: rgba(255, 152, 0, 0.15);
  color: #f57c00;
  border-left-color: #ff9800;
}

.table-node[data-type="procedure"] .table-header:hover .table-icon {
  color: #f57c00;
}

.table-node[data-type="procedure"] .table-header:hover .table-name,
.table-node[data-type="procedure"].selected .table-name {
  color: #f57c00;
}

.table-node[data-type="procedure"] .table-header:hover .row-count {
  background: rgba(255, 152, 0, 0.1);
  color: #f57c00;
  border-color: rgba(255, 152, 0, 0.3);
}

/* 🔧 函数节点样式 */
.table-node[data-type="function"] .table-icon {
  color: #9c27b0;
}

.table-node[data-type="function"] .table-header:hover {
  background: linear-gradient(135deg, 
    rgba(156, 39, 176, 0.05) 0%, 
    rgba(156, 39, 176, 0.08) 100%);
  border-left-color: rgba(156, 39, 176, 0.4);
}

.table-node[data-type="function"].selected .table-header {
  background: rgba(156, 39, 176, 0.15);
  color: #7b1fa2;
  border-left-color: #9c27b0;
}

.table-node[data-type="function"] .table-header:hover .table-icon {
  color: #7b1fa2;
}

.table-node[data-type="function"] .table-header:hover .table-name,
.table-node[data-type="function"].selected .table-name {
  color: #7b1fa2;
}

.table-node[data-type="function"] .table-header:hover .row-count {
  background: rgba(156, 39, 176, 0.1);
  color: #7b1fa2;
  border-color: rgba(156, 39, 176, 0.3);
}

/* ✨ 微妙进入动画 */
.table-node {
  animation: fadeInRight 0.3s ease-out;
  animation-delay: var(--animation-delay, 0s);
}

@keyframes fadeInRight {
  from {
    opacity: 0;
    transform: translateX(10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 🎪 活跃状态指示器 */
.table-header::after {
  content: '';
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: transparent;
  transition: all var(--tree-transition-normal, 0.2s ease);
}

.table-header:hover::after {
  background: currentColor;
  opacity: 0.3;
}

.table-node.selected .table-header::after {
  background: currentColor;
  opacity: 0.6;
  box-shadow: 0 0 8px currentColor;
}

/* 🔄 表节点加载状态 */
.table-node.loading .table-header {
  position: relative;
  overflow: hidden;
}

.table-node.loading .table-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(255, 255, 255, 0.4) 50%, 
    transparent 100%);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}

/* 💫 悬停时的微妙脉冲效果 */
.table-header:hover {
  animation: gentlePulse 2s ease-in-out infinite;
}

@keyframes gentlePulse {
  0%, 100% { 
    box-shadow: var(--tree-shadow-light, 0 1px 3px rgba(0, 0, 0, 0.04));
  }
  50% { 
    box-shadow: var(--tree-shadow-medium, 0 2px 8px rgba(0, 0, 0, 0.06));
  }
}

/* 🎯 焦点状态（键盘导航） */
.table-header:focus {
  outline: 2px solid var(--tree-primary, #4a90e2);
  outline-offset: 1px;
  border-radius: 4px;
}

.table-header:focus:not(:hover) {
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}
</style>