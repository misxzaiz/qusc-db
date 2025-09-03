<template>
  <div
    v-if="visible"
    class="context-menu"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
    @click.stop
  >
    <div class="context-menu-header" v-if="title">
      <span class="menu-icon">{{ icon }}</span>
      <span class="menu-title">{{ title }}</span>
    </div>
    
    <div class="context-menu-items">
      <div
        v-for="item in items"
        :key="item.id"
        class="context-menu-item"
        :class="{ 
          'disabled': item.disabled, 
          'danger': item.danger,
          'separator': item.separator 
        }"
        @click="handleItemClick(item)"
      >
        <div v-if="item.separator" class="menu-separator"></div>
        <template v-else>
          <span class="item-icon">{{ item.icon }}</span>
          <span class="item-text">{{ item.text }}</span>
          <span v-if="item.shortcut" class="item-shortcut">{{ item.shortcut }}</span>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  title: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  },
  items: {
    type: Array,
    default: () => []
  }
})

// Emits
const emit = defineEmits(['item-click', 'close'])

// 方法
const handleItemClick = (item) => {
  if (item.disabled || item.separator) return
  
  emit('item-click', item)
  emit('close')
}
</script>

<style scoped>
.context-menu {
  position: fixed;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 160px;
  max-width: 240px;
  overflow: hidden;
  font-size: 11px;
}

.context-menu-header {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  background: var(--gray-50);
  border-bottom: 1px solid var(--border-color);
  gap: 4px;
}

.menu-icon {
  font-size: 12px;
}

.menu-title {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 10px;
}

.context-menu-items {
  padding: 2px 0;
}

.context-menu-item {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  gap: 6px;
  min-height: 18px;
}

.context-menu-item:not(.separator):not(.disabled):hover {
  background: var(--primary-color);
  color: white;
}

.context-menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.context-menu-item.danger {
  color: #dc2626;
}

.context-menu-item.danger:hover {
  background: #dc2626;
  color: white;
}

.context-menu-item.separator {
  padding: 0;
  cursor: default;
}

.menu-separator {
  height: 1px;
  background: var(--border-color);
  margin: 2px 8px;
}

.item-icon {
  font-size: 10px;
  min-width: 12px;
  text-align: center;
}

.item-text {
  flex: 1;
  font-size: 10px;
  line-height: 1.2;
}

.item-shortcut {
  font-size: 9px;
  opacity: 0.7;
  color: var(--text-secondary);
}

/* 深色主题适配 */
[data-theme="dark"] .context-menu {
  background: var(--gray-800);
  border-color: var(--gray-600);
}

[data-theme="dark"] .context-menu-header {
  background: var(--gray-700);
  border-color: var(--gray-600);
}

[data-theme="dark"] .menu-separator {
  background: var(--gray-600);
}

[data-theme="dark"] .context-menu-item.danger {
  color: #f87171;
}
</style>