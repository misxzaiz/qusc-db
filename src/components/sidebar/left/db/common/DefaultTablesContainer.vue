<template>
  <div class="default-tables-container">
    <!-- 通用表容器，适用于未特化的数据库类型 -->
    <div v-if="tables.length > 0" class="tables-list">
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
    
    <!-- 空状态 -->
    <div v-else class="empty-state">
      <i class="fas fa-inbox"></i>
      <span>该数据库暂无表</span>
    </div>
  </div>
</template>

<script setup>
import TableNode from '../common/TableNode.vue'

const props = defineProps({
  tables: {
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

function handleNodeClick(nodeData) {
  emit('node-click', nodeData)
}

function handleNodeContextMenu(nodeData) {
  emit('node-context-menu', nodeData)
}
</script>

<style scoped>
.default-tables-container {
  padding: 2px 0;
}

.tables-list {
  /* 简单列表样式 */
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