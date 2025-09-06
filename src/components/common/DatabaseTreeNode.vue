<template>
  <div class="database-tree-node" :class="{ expanded: isExpanded }">
    <div 
      class="node-content" 
      @click="toggleExpand"
      :class="{ 
        'has-children': hasChildren,
        'selected': selected
      }"
    >
      <div class="node-icon">
        <i v-if="hasChildren" :class="expandIcon"></i>
        <i :class="typeIcon" :style="{ color: iconColor }"></i>
      </div>
      <div class="node-label">
        <span class="node-name">{{ node.name }}</span>
        <span v-if="node.info" class="node-info">{{ node.info }}</span>
      </div>
    </div>
    
    <div v-if="isExpanded && hasChildren" class="node-children">
      <DatabaseTreeNode
        v-for="child in node.children"
        :key="child.key"
        :node="child"
        :level="level + 1"
        @node-click="$emit('node-click', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  level: {
    type: Number,
    default: 0
  },
  selected: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['node-click'])

const isExpanded = ref(false)

// 判断是否有子节点
const hasChildren = computed(() => {
  return props.node.children && props.node.children.length > 0
})

// 展开/收起图标
const expandIcon = computed(() => {
  return isExpanded.value ? 'fas fa-chevron-down' : 'fas fa-chevron-right'
})

// 节点类型图标
const typeIcon = computed(() => {
  const iconMap = {
    // 数据库类型
    'mysql': 'fas fa-database',
    'postgresql': 'fas fa-database', 
    'redis': 'fas fa-cube',
    'mongodb': 'fas fa-leaf',
    // 数据库对象类型
    'database': 'fas fa-database',
    'table': 'fas fa-table',
    'view': 'fas fa-eye',
    'procedure': 'fas fa-cogs',
    'function': 'fas fa-code',
    'key': 'fas fa-key',
    'collection': 'fas fa-layer-group',
    'index': 'fas fa-sort',
    // 文件夹类型
    'folder-tables': 'fas fa-folder',
    'folder-views': 'fas fa-folder',
    'folder-procedures': 'fas fa-folder',
    'folder-functions': 'fas fa-folder',
    'folder-keys': 'fas fa-folder',
    'folder-collections': 'fas fa-folder',
    'folder-gridfs': 'fas fa-folder',
  }
  return iconMap[props.node.type] || 'fas fa-file'
})

// 图标颜色
const iconColor = computed(() => {
  const colorMap = {
    'mysql': '#00758f',
    'postgresql': '#336791',
    'redis': '#d82c20', 
    'mongodb': '#47a248',
    'database': '#4a90e2',
    'table': '#50c878',
    'view': '#ffa500',
    'procedure': '#9932cc',
    'function': '#ff69b4',
    'key': '#ff6347',
    'collection': '#20b2aa',
    'index': '#daa520'
  }
  return colorMap[props.node.type] || '#666'
})

// 切换展开状态
function toggleExpand() {
  if (hasChildren.value) {
    isExpanded.value = !isExpanded.value
  }
  emit('node-click', props.node)
}
</script>

<style scoped>
.database-tree-node {
  user-select: none;
}

.node-content {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
  margin-left: calc(v-bind(level) * 16px);
}

.node-content:hover {
  background-color: #f5f5f5;
}

.node-content.selected {
  background-color: #e3f2fd;
  color: #1976d2;
}

.node-content.has-children {
  font-weight: 500;
}

.node-icon {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: 8px;
  min-width: 20px;
}

.node-icon i {
  font-size: 12px;
}

.node-icon .fas.fa-chevron-down,
.node-icon .fas.fa-chevron-right {
  color: #666;
  width: 12px;
}

.node-label {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.node-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-info {
  font-size: 11px;
  color: #888;
  background: #f0f0f0;
  padding: 1px 4px;
  border-radius: 2px;
  white-space: nowrap;
}

.node-children {
  margin-left: 8px;
}
</style>