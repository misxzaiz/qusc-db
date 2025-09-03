<template>
  <div class="action-buttons">
    <button 
      class="action-btn settings-button"
      @click="$emit('settings-open')"
      title="设置"
    >
      ⚙️
    </button>
    
    <button 
      class="action-btn ai-button"
      :class="{ active: aiPanelOpen }"
      @click="$emit('ai-panel-toggle')"
    >
      <span class="button-text">AI助手</span>
      <StatusIndicator 
        v-if="aiStatus" 
        :status="aiStatus"
        class="ai-status"
      />
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import StatusIndicator from './StatusIndicator.vue'
import { useTheme } from '@/composables/useTheme.js'

// 使用主题系统
const { currentTheme, activeTheme } = useTheme()

// Props
const props = defineProps({
  aiPanelOpen: {
    type: Boolean,
    default: false
  },
  aiStatus: {
    type: String,
    default: 'unknown'
  }
})

// Emits
const emit = defineEmits(['ai-panel-toggle', 'theme-toggle', 'settings-open'])

// 计算属性
const themeIcon = computed(() => {
  return activeTheme.value?.icon || '🎨'
})
</script>

<style scoped>
.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  background: none;
  border: none;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
  font-size: 12px;
  color: var(--gray-500);
  display: flex;
  align-items: center;
  gap: 4px;
  position: relative;
  
  &:hover {
    background: var(--gray-100);
    color: var(--gray-800);
  }
  
  &.active {
    border-bottom-color: var(--primary-color);
    color: var(--primary-color);
    background: var(--gray-50);
  }
}

.ai-button {
  position: relative;
}

.button-icon {
  font-size: 14px;
}

.button-text {
  font-weight: 500;
}

.ai-status {
  margin-left: 4px;
}
</style>