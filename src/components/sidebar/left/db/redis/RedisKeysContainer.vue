<template>
  <div class="redis-keys-container">
    <div v-if="redisKeys && redisKeys.sample_keys.length > 0" class="keys-info">
      <div class="keys-summary">
        <div class="summary-item">
          <i class="fas fa-key"></i>
          <span>总键数: {{ redisKeys.key_count }}</span>
        </div>
        <div v-if="redisKeys.expires_count > 0" class="summary-item">
          <i class="fas fa-clock"></i>
          <span>过期键: {{ redisKeys.expires_count }}</span>
        </div>
        <div v-if="redisKeys.memory_usage" class="summary-item">
          <i class="fas fa-microchip"></i>
          <span>内存: {{ formatBytes(redisKeys.memory_usage) }}</span>
        </div>
      </div>
      
      <div class="keys-list">
        <div class="keys-header">
          <span>键列表 (前100个)</span>
        </div>
        <div
          v-for="key in redisKeys.sample_keys"
          :key="key.key"
          class="redis-key-item"
          :class="{ 'selected': isKeySelected(key) }"
          @click="handleKeyClick(key)"
          @contextmenu.prevent="handleKeyContextMenu(key, $event)"
        >
          <div class="key-info">
            <i :class="getKeyTypeIcon(key.data_type)" class="key-type-icon"></i>
            <span class="key-name">{{ key.key }}</span>
          </div>
          <div class="key-meta">
            <span v-if="key.ttl" class="key-ttl">{{ formatTTL(key.ttl) }}</span>
            <span v-if="key.size" class="key-size">{{ formatBytes(key.size) }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 空状态 -->
    <div v-else class="empty-state">
      <i class="fas fa-key"></i>
      <span>该Redis数据库暂无键</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  redisKeys: {
    type: Object,
    default: null
  },
  database: {
    type: Object,
    required: true
  },
  connectionId: {
    type: String,
    required: true
  },
  dbType: {
    type: String,
    required: true
  },
  selectedNode: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['node-click', 'node-context-menu'])

function getKeyTypeIcon(dataType) {
  const iconMap = {
    'String': 'fas fa-font',
    'Hash': 'fas fa-hashtag',
    'List': 'fas fa-list',
    'Set': 'fas fa-circle',
    'ZSet': 'fas fa-sort-numeric-down-alt',
    'Stream': 'fas fa-flow'
  }
  return iconMap[dataType] || 'fas fa-key'
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function formatTTL(seconds) {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  return `${Math.floor(seconds / 3600)}h`
}

function isKeySelected(key) {
  return props.selectedNode && 
         props.selectedNode.type === 'redis-key' && 
         props.selectedNode.key === key.key
}

function handleKeyClick(key) {
  emit('node-click', {
    type: 'redis-key',
    key: key.key,
    dataType: key.data_type,
    database: props.database.name,
    connectionId: props.connectionId,
    dbType: props.dbType
  })
}

function handleKeyContextMenu(key, event) {
  emit('node-context-menu', {
    type: 'redis-key',
    key: key.key,
    dataType: key.data_type,
    database: props.database.name,
    connectionId: props.connectionId,
    dbType: props.dbType,
    event
  })
}
</script>

<style scoped>
.redis-keys-container {
  padding: 4px 0;
}

.keys-info {
  /* Redis键信息容器 */
}

.keys-summary {
  padding: 6px 8px;
  background: #f8f9fa;
  border-radius: 4px;
  margin-bottom: 8px;
}

.summary-item {
  display: flex;
  align-items: center;
  font-size: 10px;
  color: #666;
  margin-bottom: 2px;
}

.summary-item:last-child {
  margin-bottom: 0;
}

.summary-item i {
  width: 12px;
  margin-right: 4px;
  color: #d82c20;
}

.keys-header {
  font-size: 11px;
  font-weight: 600;
  color: #333;
  padding: 4px 8px;
  margin-bottom: 4px;
}

.keys-list {
  max-height: 300px;
  overflow-y: auto;
}

.redis-key-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 8px;
  cursor: pointer;
  border-radius: 2px;
  transition: background-color 0.2s ease;
  font-size: 11px;
}

.redis-key-item:hover {
  background-color: #f8f8f8;
}

.redis-key-item.selected {
  background-color: #ffeaa7;
  color: #2d3436;
}

.key-info {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.key-type-icon {
  font-size: 9px;
  margin-right: 4px;
  width: 10px;
  color: #d82c20;
}

.key-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.key-meta {
  display: flex;
  gap: 4px;
}

.key-ttl,
.key-size {
  font-size: 9px;
  color: #888;
  background: #f0f0f0;
  padding: 1px 3px;
  border-radius: 2px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  color: #999;
  font-size: 11px;
  text-align: center;
}

.empty-state i {
  font-size: 20px;
  margin-bottom: 8px;
  opacity: 0.5;
  color: #d82c20;
}
</style>