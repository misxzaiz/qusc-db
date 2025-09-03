<template>
  <div class="workspace-tabs">
    <div 
      v-for="tab in tabs" 
      :key="tab.id"
      class="workspace-tab"
      :class="{ active: activeTab === tab.id }"
      @click="$emit('switch-tab', tab.id)"
    >
      <span>{{ tab.icon }}</span>
      {{ tab.name }}
      <button 
        v-if="tabs.length > 1"
        class="tab-close"
        @click.stop="$emit('close-tab', tab.id)"
      >
        ×
      </button>
    </div>
    
    <button class="btn-ghost new-tab-btn" @click="$emit('create-tab')">
      + 新建
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  tabs: {
    type: Array,
    required: true
  },
  activeTab: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['switch-tab', 'close-tab', 'create-tab'])
</script>

<style scoped>
.workspace-tabs {
  background: var(--gray-50);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  padding: 0 8px;
  height: var(--toolbar-height);
  overflow-x: auto;
}

.workspace-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: white;
  border: 1px solid var(--border-color);
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  font-size: 12px;
  cursor: pointer;
  margin-right: 2px;
  min-width: 120px;
  transition: all 0.2s ease;
}

.workspace-tab:hover {
  background: var(--gray-50);
}

.workspace-tab.active {
  background: white;
  border-color: var(--primary-color);
  color: var(--primary-color);
  z-index: 1;
}

.tab-close {
  background: none;
  border: none;
  color: var(--gray-400);
  cursor: pointer;
  padding: 0;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.tab-close:hover {
  background: var(--gray-200);
  color: var(--gray-600);
}

.new-tab-btn {
  margin-left: 8px;
  font-size: 12px;
  padding: 4px 8px;
}
</style>