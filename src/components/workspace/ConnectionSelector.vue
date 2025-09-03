<template>
  <div class="connection-selector">
    <select 
      :value="selectedConnectionKey" 
      class="connection-select"
      @change="$emit('connection-change', $event.target.value)"
    >
      <option value="">选择连接</option>
      <option 
        v-for="connection in connectionsList" 
        :key="connection.key" 
        :value="connection.key"
      >
        {{ connection.displayName || connection.name }}
      </option>
    </select>
    
    <select 
      :value="selectedDatabase" 
      class="database-select"
      :disabled="!selectedConnectionKey || isLoadingDatabases"
      @change="$emit('database-change', $event.target.value)"
    >
      <option value="">选择数据库</option>
      <option 
        v-for="database in availableDatabases" 
        :key="database" 
        :value="database"
      >
        {{ database }}
      </option>
    </select>

  </div>
</template>

<script setup>
const props = defineProps({
  selectedConnectionKey: {
    type: String,
    default: ''
  },
  selectedDatabase: {
    type: String,
    default: ''
  },
  connectionsList: {
    type: Array,
    default: () => []
  },
  availableDatabases: {
    type: Array,
    default: () => []
  },
  isLoadingDatabases: {
    type: Boolean,
    default: false
  },
  currentConnection: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['connection-change', 'database-change'])
</script>

<style scoped>
.connection-selector {
  display: flex;
  gap: 8px;
  align-items: center;
}

.connection-select,
.database-select {
  padding: 2px 4px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: 10px;
  background: white;
  color: var(--gray-700);
  cursor: pointer;
  flex-shrink: 1;
}

.connection-select:focus,
.database-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
}

.connection-select:disabled,
.database-select:disabled {
  background: var(--gray-100);
  color: var(--gray-400);
  cursor: not-allowed;
}

.connection-select {
  min-width: 70px;
  max-width: 100px;
  width: 90px;
}

.database-select {
  min-width: 60px;
  max-width: 90px;
  width: 80px;
}

.connection-status {
  font-size: 11px;
  color: var(--gray-600);
}

.connection-info {
  background: rgba(34, 197, 94, 0.1);
  color: var(--success-color);
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
}

.connection-connecting {
  background: rgba(251, 191, 36, 0.1);
  color: var(--warning-color);
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
}
</style>