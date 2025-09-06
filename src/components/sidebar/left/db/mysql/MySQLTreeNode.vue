<template>
  <div class="mysql-tree-node">
    <DatabaseTreeNode
      v-for="node in treeNodes"
      :key="node.key"
      :node="node"
      :selected="selectedNode?.key === node.key"
      @node-click="handleNodeClick"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import DatabaseTreeNode from '@/components/common/DatabaseTreeNode.vue'
import { MySQLStructureBuilder } from './MySQLStructureBuilder.js'

// Props
const props = defineProps({
  structure: {
    type: Object,
    required: true
  },
  connectionId: {
    type: String,
    required: true
  },
  parentConnection: {
    type: Object,
    required: true
  },
  selectedNode: {
    type: Object,
    default: null
  }
})

// Events
const emit = defineEmits(['node-click', 'node-expand', 'node-context-menu'])

// 构建 MySQL 特定的树节点
const treeNodes = computed(() => {
  return MySQLStructureBuilder.buildTreeNodes(props.structure, props.parentConnection)
})

// 处理节点点击
function handleNodeClick(node) {
  emit('node-click', node)
}
</script>

<style scoped>
.mysql-tree-node {
  /* MySQL 特定的样式 */
}

/* 可以为不同类型的节点添加特殊样式 */
.mysql-tree-node :deep(.tree-node[data-type="table"]) {
  border-left: 3px solid #4CAF50;
}

.mysql-tree-node :deep(.tree-node[data-type="view"]) {
  border-left: 3px solid #2196F3;
}

.mysql-tree-node :deep(.tree-node[data-type="procedure"]) {
  border-left: 3px solid #FF9800;
}

.mysql-tree-node :deep(.tree-node[data-type="function"]) {
  border-left: 3px solid #9C27B0;
}

/* 文件夹节点样式 */
.mysql-tree-node :deep(.tree-node[data-type="folder-tables"]) {
  font-weight: 600;
  color: #4CAF50;
}

.mysql-tree-node :deep(.tree-node[data-type="folder-views"]) {
  font-weight: 600;
  color: #2196F3;
}

.mysql-tree-node :deep(.tree-node[data-type="folder-procedures"]) {
  font-weight: 600;
  color: #FF9800;
}

.mysql-tree-node :deep(.tree-node[data-type="folder-functions"]) {
  font-weight: 600;
  color: #9C27B0;
}
</style>