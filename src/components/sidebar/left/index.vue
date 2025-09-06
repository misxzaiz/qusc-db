<template>
  <aside class="sidebar" :class="{ expanded }">
    <!-- 连接管理面板 -->
    <DbPanel
        v-show="activePanel === 'db'"
        @connection-select="$emit('connection-select', $event)"
    />

    <!-- 查询历史面板 -->
    <HistoryPanel 
      v-show="activePanel === 'history'"
    />
  </aside>
</template>

<script setup>
import ConnectionPanel from './ConnectionPanel.vue'
import DatabaseTreePanel from './DatabaseTreePanel.vue'
import HistoryPanel from './HistoryPanel.vue'
import DbPanel from "@/components/sidebar/left/DbPanel.vue";

// Props
const props = defineProps({
  expanded: {
    type: Boolean,
    default: false
  },
  activePanel: {
    type: String,
    default: ''
  }
})

// Emits
const emit = defineEmits(['connection-select', 'table-selected', 'schema-refresh'])
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  background: white;
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: all 0.3s ease;
  position: relative;
  z-index: 10;
}

.sidebar:not(.expanded) {
  width: 0;
  overflow: hidden;
}

.panel {
  height: 100%;
  overflow: hidden;
}
</style>