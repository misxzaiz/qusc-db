<template>
  <div 
    class="history-item list-item"
    :class="{ error: hasError, favorite: historyItem.isFavorite }"
    @click="$emit('load', historyItem)"
  >
    <div class="history-status">
      <div class="query-type-icon">
        {{ getQueryTypeIcon(historyItem.query) }}
      </div>
      <div 
        class="status-indicator"
        :class="{ success: !hasError, error: hasError }"
      >
        {{ hasError ? '✗' : '✓' }}
      </div>
    </div>
    
    <div class="history-content">
      <div class="history-header">
        <div class="history-query" :title="historyItem.query">
          {{ historyItem.description || truncateQuery(historyItem.query) }}
        </div>
        <button
          class="favorite-btn"
          :class="{ active: historyItem.isFavorite }"
          @click.stop="$emit('toggle-favorite', historyItem.id)"
          :title="historyItem.isFavorite ? '取消收藏' : '收藏'"
        >
          {{ historyItem.isFavorite ? '⭐' : '☆' }}
        </button>
      </div>
      
      <div class="history-meta">
        <span class="history-time">{{ formatTime(historyItem.lastExecutedAt) }}</span>
        <span class="connection-info">
          • {{ historyItem.connection.name }}
        </span>
        <span class="execution-count">
          • 执行{{ historyItem.executionCount }}次
        </span>
        <span v-if="historyItem.lastDuration" class="execution-time">
          • {{ formatDuration(historyItem.lastDuration) }}
        </span>
        <span v-if="historyItem.lastResult" class="result-info">
          • {{ formatResultInfo(historyItem.lastResult) }}
        </span>
      </div>
      
      <!-- 标签 -->
      <div v-if="historyItem.tags.length > 0" class="history-tags">
        <span
          v-for="tag in historyItem.tags.slice(0, 3)"
          :key="tag"
          class="tag"
          :class="`tag-${tag}`"
        >
          {{ tag }}
        </span>
        <span v-if="historyItem.tags.length > 3" class="tag-more">
          +{{ historyItem.tags.length - 3 }}
        </span>
      </div>
      
      <div v-if="hasError && historyItem.lastError" class="history-error">
        {{ truncateQuery(historyItem.lastError.message, 80) }}
      </div>
    </div>
    
    <div class="history-actions">
      <button 
        class="btn-ghost tooltip action-btn" 
        data-tooltip="编辑"
        @click.stop="$emit('edit', historyItem)"
      >
        ✏️
      </button>
      <button 
        class="btn-ghost tooltip action-btn" 
        data-tooltip="复制查询"
        @click.stop="$emit('copy', historyItem.query)"
      >
        📋
      </button>
      <button 
        class="btn-ghost tooltip action-btn" 
        data-tooltip="删除记录"
        @click.stop="$emit('delete', historyItem.id)"
      >
        🗑️
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  historyItem: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['load', 'copy', 'delete', 'toggle-favorite', 'edit'])

// 计算属性
const hasError = computed(() => !!props.historyItem.lastError)

// 方法
const truncateQuery = (text, length = 60) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInMinutes = Math.floor((now - date) / (1000 * 60))
  
  if (diffInMinutes < 1) return '刚刚'
  if (diffInMinutes < 60) return `${diffInMinutes}分钟前`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}小时前`
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}天前`
  
  return date.toLocaleDateString()
}

const formatDuration = (ms) => {
  if (!ms) return '0ms'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

const formatResultInfo = (result) => {
  const parts = []
  
  if (result.rowCount !== undefined) {
    parts.push(`${result.rowCount}行`)
  }
  
  if (result.columnCount !== undefined) {
    parts.push(`${result.columnCount}列`)
  }
  
  if (result.affectedRows !== undefined) {
    parts.push(`影响${result.affectedRows}行`)
  }
  
  return parts.join(', ') || '成功'
}

const getQueryTypeIcon = (query) => {
  const trimmed = query.trim().toUpperCase()
  if (trimmed.startsWith('SELECT')) return '🔍'
  if (trimmed.startsWith('INSERT')) return '➕'
  if (trimmed.startsWith('UPDATE')) return '✏️'
  if (trimmed.startsWith('DELETE')) return '🗑️'
  if (trimmed.startsWith('CREATE')) return '🔨'
  if (trimmed.startsWith('DROP')) return '💥'
  return '📝'
}
</script>

<style scoped>
.history-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  margin-bottom: 6px;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.history-item:hover {
  background: var(--bg-tertiary);
  border-color: var(--primary-color);
}

.history-item.error {
  border-left: 3px solid var(--error-color);
}

.history-item.favorite {
  border-left: 3px solid #fbbf24;
}

.history-status {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.query-type-icon {
  font-size: 14px;
  opacity: 0.8;
}

.status-indicator {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: bold;
  color: white;
}

.status-indicator.success {
  background: var(--success-color);
}

.status-indicator.error {
  background: var(--error-color);
}

.history-content {
  flex: 1;
  min-width: 0;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 6px;
  gap: 8px;
}

.history-query {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.4;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.favorite-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  opacity: 0.6;
  transition: all 0.2s ease;
  padding: 2px;
  border-radius: 3px;
  flex-shrink: 0;
}

.favorite-btn:hover {
  opacity: 1;
  background: var(--bg-secondary);
}

.favorite-btn.active {
  opacity: 1;
  color: #fbbf24;
}

.history-meta {
  font-size: 10px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  line-height: 1.2;
  word-break: break-all;
}

.history-time {
  color: var(--text-tertiary);
}

.connection-info {
  color: var(--primary-color);
  font-weight: 500;
}

.execution-count,
.execution-time {
  color: var(--text-secondary);
}

.result-info {
  color: var(--success-color);
  font-weight: 500;
}

.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-bottom: 4px;
}

.tag {
  background: var(--gray-100);
  color: var(--text-secondary);
  padding: 1px 4px;
  border-radius: 6px;
  font-size: 9px;
  font-weight: 500;
}

.tag-select { background: #dbeafe; color: #1e40af; }
.tag-insert { background: #dcfce7; color: #166534; }
.tag-update { background: #fef3c7; color: #92400e; }
.tag-delete { background: #fecaca; color: #991b1b; }
.tag-join { background: #e0e7ff; color: #3730a3; }
.tag-complex { background: #fae8ff; color: #86198f; }

.tag-more {
  background: var(--gray-200);
  color: var(--text-tertiary);
  padding: 1px 4px;
  border-radius: 6px;
  font-size: 9px;
}

.history-error {
  font-size: 10px;
  color: var(--error-color);
  background: rgba(239, 68, 68, 0.05);
  padding: 4px 6px;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  line-height: 1.3;
  margin-top: 4px;
}

.history-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.history-item:hover .history-actions {
  opacity: 1;
}

.action-btn {
  padding: 4px;
  font-size: 11px;
  border-radius: 3px;
}
</style>