<template>
  <div class="mysql-tree-node">
    <DatabaseTreeNode
      v-for="node in treeNodes"
      :key="node.key"
      :node="node"
      :selected="selectedNode?.key === node.key"
      @node-click="handleNodeClick"
      @node-expand="handleNodeExpand"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import DatabaseTreeNode from '@/components/common/DatabaseTreeNode.vue'
import { MySQLStructureBuilder } from './MySQLStructureBuilder.js'
import DatabaseService from '@/services/databaseService'

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

// 缓存已加载的数据库表信息
const loadedDatabases = ref(new Set())
const databaseTablesCache = ref({})

// 构建 MySQL 特定的树节点
const treeNodes = computed(() => {
  // 验证必要的数据
  if (!props.structure || !props.parentConnection) {
    console.warn('MySQLTreeNode: 缺少必要的数据', {
      structure: !!props.structure,
      parentConnection: !!props.parentConnection
    })
    return []
  }
  
  try {
    // 使用轻量级结构构建基础数据库节点
    const nodes = props.structure.databases.map(db => ({
      key: `${props.parentConnection.key}-${db.name}`,
      name: db.name,
      type: 'database',
      info: db.table_count ? `${db.table_count} 表` : '',
      children: databaseTablesCache.value[db.name] || [], // 使用缓存的表信息
      expanded: false,
      meta: {
        table_count: db.table_count,
        has_tables: db.has_tables,
        size_info: db.size_info,
        database_name: db.name
      }
    }))
    
    return nodes
  } catch (error) {
    console.error('MySQLTreeNode: 构建树节点失败', error)
    return []
  }
})

// 处理节点点击
function handleNodeClick(node) {
  emit('node-click', node)
}

// 处理节点展开（按需加载表信息）
async function handleNodeExpand(node) {
  if (node.type === 'database' && !loadedDatabases.value.has(node.meta.database_name)) {
    try {
      // 调用新的分离式API获取表信息
      const tablesResponse = await DatabaseService.getDatabaseTables(
        props.connectionId, 
        node.meta.database_name
      )
      
      // 使用 MySQLStructureBuilder 构建表树结构
      const tableNodes = MySQLStructureBuilder.buildDatabaseChildren(
        {
          name: node.meta.database_name,
          tables: tablesResponse.tables,
          views: tablesResponse.views,
          procedures: tablesResponse.procedures,
          functions: tablesResponse.functions
        },
        props.parentConnection
      )
      
      // 缓存表信息
      databaseTablesCache.value[node.meta.database_name] = tableNodes
      loadedDatabases.value.add(node.meta.database_name)
      
      console.log(`成功加载数据库 ${node.meta.database_name} 的表信息`)
    } catch (error) {
      console.error(`加载数据库 ${node.meta.database_name} 的表信息失败:`, error)
    }
  }
  
  emit('node-expand', node)
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