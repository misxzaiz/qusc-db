<template>
  <div
    v-if="visible && content"
    class="tooltip"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
  >
    <div class="tooltip-content">
      <div v-if="title" class="tooltip-title">
        <span class="tooltip-icon">{{ icon }}</span>
        <span class="tooltip-text">{{ title }}</span>
      </div>
      
      <div class="tooltip-body">
        <div 
          v-for="(item, index) in parsedContent" 
          :key="index" 
          class="tooltip-item"
        >
          <span class="item-label">{{ item.label }}:</span>
          <span class="item-value">{{ item.value }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

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
  content: {
    type: [String, Object, Array],
    default: null
  }
})

// 解析内容为键值对数组
const parsedContent = computed(() => {
  if (!props.content) return []
  
  if (typeof props.content === 'string') {
    return [{ label: '信息', value: props.content }]
  }
  
  if (Array.isArray(props.content)) {
    return props.content
  }
  
  if (typeof props.content === 'object') {
    return Object.entries(props.content).map(([key, value]) => ({
      label: key,
      value: value
    }))
  }
  
  return []
})
</script>

<style scoped>
.tooltip {
  position: fixed;
  background: var(--gray-900);
  color: white;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 2000;
  pointer-events: none;
  max-width: 280px;
  font-size: 11px;
  opacity: 0.95;
}

.tooltip-content {
  padding: 8px 10px;
}

.tooltip-title {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.tooltip-icon {
  font-size: 12px;
}

.tooltip-text {
  font-weight: 600;
  font-size: 10px;
}

.tooltip-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tooltip-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 9px;
  line-height: 1.3;
}

.item-label {
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
  flex-shrink: 0;
}

.item-value {
  color: rgba(255, 255, 255, 0.95);
  text-align: right;
  word-break: break-all;
}

/* 深色主题适配 */
[data-theme="light"] .tooltip {
  background: var(--gray-800);
}
</style>