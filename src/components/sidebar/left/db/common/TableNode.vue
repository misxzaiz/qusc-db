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
    'function': 'fas fa-function'
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
.table-node {
  margin-bottom: 1px;
}

.table-header {
  display: flex;
  align-items: center;
  padding: 4px 12px;
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.2s ease;
  user-select: none;
  font-size: 12px;
}

.table-header:hover {
  background-color: #f8f8f8;
}

.table-node.selected .table-header {
  background-color: #e8f5e8;
  color: #2e7d32;
  border-left: 3px solid #4caf50;
}

.table-icon {
  font-size: 11px;
  margin-right: 6px;
  width: 12px;
  color: #50c878;
}

.table-name {
  flex: 1;
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.row-count {
  font-size: 10px;
  color: #666;
  background: #f0f0f0;
  padding: 1px 4px;
  border-radius: 6px;
}

.table-size {
  font-size: 9px;
  color: #888;
}

/* 不同类型的图标颜色 */
.table-node[data-type="view"] .table-icon {
  color: #2196f3;
}

.table-node[data-type="procedure"] .table-icon {
  color: #ff9800;
}

.table-node[data-type="function"] .table-icon {
  color: #9c27b0;
}

.table-node[data-type="view"].selected .table-header {
  background-color: #e3f2fd;
  color: #1565c0;
  border-left-color: #2196f3;
}

.table-node[data-type="procedure"].selected .table-header {
  background-color: #fff3e0;
  color: #f57c00;
  border-left-color: #ff9800;
}

.table-node[data-type="function"].selected .table-header {
  background-color: #f3e5f5;
  color: #7b1fa2;
  border-left-color: #9c27b0;
}
</style>