<template>
  <div class="history-list">
    <div class="list">
      <HistoryItem
        v-for="item in histories"
        :key="item.id"
        :history-item="item"
        @load="$emit('load', item)"
        @copy="$emit('copy', item.query)"
        @delete="$emit('delete', item.id)"
        @toggle-favorite="$emit('toggle-favorite', item.id)"
        @edit="$emit('edit', item)"
      />
      
      <EmptyState
        v-if="histories.length === 0"
        icon="📝"
        message="没有找到历史记录"
      />
    </div>
  </div>
</template>

<script setup>
import HistoryItem from './HistoryItem.vue'
import EmptyState from '../shared/EmptyState.vue'

// Props
const props = defineProps({
  histories: {
    type: Array,
    default: () => []
  }
})

// Emits
const emit = defineEmits(['load', 'copy', 'delete', 'toggle-favorite', 'edit'])
</script>

<style scoped>
.history-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.list {
  flex: 1;
  padding: 8px;
  overflow-y: auto;
}
</style>