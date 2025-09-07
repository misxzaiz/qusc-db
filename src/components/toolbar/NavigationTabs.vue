<template>
  <div class="navigation-tabs">
    <button 
      v-for="panel in panels" 
      :key="panel.id"
      class="nav-tab"
      :class="{ active: activePanel === panel.id }"
      @click="$emit('panel-select', panel.id)"
    >
      <i v-if="panel.icon.startsWith('fas')" :class="panel.icon" class="tab-icon"></i>
      <span v-else class="tab-icon">{{ panel.icon }}</span>
      <span class="tab-name">{{ panel.name }}</span>
    </button>
  </div>
</template>

<script setup>
// Props
const props = defineProps({
  activePanel: {
    type: String,
    default: ''
  }
})

// Emits
const emit = defineEmits(['panel-select'])

// 左侧面板配置
const panels = [
  {
    id: 'db',
    name: 'DB',
    icon: 'fas fa-database'
  },
  {
    id: 'history',
    name: '历史',
    icon: '📝'
  }
]
</script>

<style scoped>
.navigation-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-tab {
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

.tab-icon {
  font-size: 14px;
}

.tab-name {
  font-weight: 500;
}
</style>