<template>
  <div class="connection-list">
    <div class="list">
      <ConnectionItem
        v-for="connection in connections"
        :key="connection.name"
        :connection="connection"
        :is-connecting="connectingId === connection.name"
        @connect="handleConnect"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
      />
      
      <EmptyState
        v-if="!hasConnections"
        icon="📊"
        message="暂无数据库连接"
      >
        <template #action>
          <button class="btn btn-primary" @click="$emit('create')">
            创建第一个连接
          </button>
        </template>
      </EmptyState>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ConnectionItem from './ConnectionItem.vue'
import EmptyState from '../shared/EmptyState.vue'

const props = defineProps({
  connections: {
    type: Array,
    default: () => []
  },
  hasConnections: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['connect', 'edit', 'delete', 'create'])

const connectingId = ref(null)

const handleConnect = async (connection) => {
  connectingId.value = connection.name
  
  try {
    await emit('connect', connection)
  } finally {
    connectingId.value = null
  }
}
</script>

<style scoped>
.connection-list {
  flex: 1;
  overflow-y: auto;
}

.list {
  padding: 8px;
  height: 100%;
}
</style>