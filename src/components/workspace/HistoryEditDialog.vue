<template>
  <FormDialog
    :visible="true"
    title="编辑查询历史"
    width="600px"
    @close="$emit('close')"
    @confirm="handleSave"
  >
    <div class="history-edit-form">
      <!-- 基本信息 -->
      <div class="form-section">
        <h3>基本信息</h3>
        
        <div class="form-field">
          <label>描述</label>
          <input
            v-model="form.description"
            type="text"
            class="input"
            placeholder="为这个查询添加一个描述"
            maxlength="100"
          >
        </div>
        
        <div class="form-field">
          <label>备注</label>
          <textarea
            v-model="form.notes"
            class="textarea"
            placeholder="添加备注信息..."
            rows="3"
            maxlength="500"
          ></textarea>
        </div>
      </div>
      
      <!-- 标签管理 -->
      <div class="form-section">
        <h3>标签</h3>
        
        <div class="tags-container">
          <div class="current-tags">
            <span
              v-for="tag in form.tags"
              :key="tag"
              class="tag"
            >
              {{ tag }}
              <button
                class="tag-remove"
                @click="removeTag(tag)"
                title="移除标签"
              >
                ×
              </button>
            </span>
          </div>
          
          <div class="add-tag">
            <input
              v-model="newTag"
              type="text"
              class="input tag-input"
              placeholder="添加标签"
              @keyup.enter="addTag"
              @keyup.comma="addTag"
            >
            <button
              class="btn btn-secondary"
              @click="addTag"
              :disabled="!newTag.trim()"
            >
              添加
            </button>
          </div>
          
          <div class="suggested-tags">
            <span class="suggested-label">建议标签:</span>
            <button
              v-for="tag in suggestedTags"
              :key="tag"
              class="suggested-tag"
              @click="addSuggestedTag(tag)"
              :disabled="form.tags.includes(tag)"
            >
              {{ tag }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- 查询信息（只读） -->
      <div class="form-section">
        <h3>查询信息</h3>
        
        <div class="query-info">
          <div class="info-row">
            <span class="info-label">连接</span>
            <span class="info-value">
              {{ history.connection.name }} ({{ history.connection.type }})
            </span>
          </div>
          
          <div class="info-row">
            <span class="info-label">创建时间</span>
            <span class="info-value">{{ formatTime(history.createdAt) }}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">最后执行</span>
            <span class="info-value">{{ formatTime(history.lastExecutedAt) }}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">执行次数</span>
            <span class="info-value">{{ history.executionCount }}</span>
          </div>
          
          <div v-if="history.lastDuration" class="info-row">
            <span class="info-label">最后执行时长</span>
            <span class="info-value">{{ formatDuration(history.lastDuration) }}</span>
          </div>
        </div>
        
        <div class="query-preview">
          <label>SQL查询</label>
          <pre class="sql-code">{{ history.query }}</pre>
        </div>
      </div>
    </div>
  </FormDialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import FormDialog from '@/components/dialog/FormDialog.vue'

// Props
const props = defineProps({
  history: {
    type: Object,
    required: true
  }
})

// Emits
const emit = defineEmits(['update', 'close'])

// 响应式状态
const newTag = ref('')

const form = reactive({
  description: props.history.description || '',
  notes: props.history.notes || '',
  tags: [...props.history.tags]
})

// 计算属性
const suggestedTags = computed(() => {
  const suggestions = ['重要', '常用', '测试', '报表', '维护', '优化', '临时']
  return suggestions.filter(tag => !form.tags.includes(tag))
})

// 方法
const addTag = () => {
  const tag = newTag.value.trim().replace(',', '').toLowerCase()
  if (tag && !form.tags.includes(tag)) {
    form.tags.push(tag)
    newTag.value = ''
  }
}

const addSuggestedTag = (tag) => {
  if (!form.tags.includes(tag)) {
    form.tags.push(tag)
  }
}

const removeTag = (tag) => {
  const index = form.tags.indexOf(tag)
  if (index > -1) {
    form.tags.splice(index, 1)
  }
}

const handleSave = () => {
  const updates = {
    description: form.description.trim() || generateDescription(props.history.query),
    notes: form.notes.trim(),
    tags: form.tags.filter(tag => tag.trim())
  }
  
  emit('update', props.history.id, updates)
}

const generateDescription = (query) => {
  const trimmed = query.trim()
  const firstLine = trimmed.split('\n')[0]
  
  if (firstLine.length <= 50) {
    return firstLine
  }
  
  return firstLine.substring(0, 47) + '...'
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleString()
}

const formatDuration = (ms) => {
  if (!ms) return '0ms'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}
</script>

<style scoped>
.history-edit-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-section h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-field label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.tags-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.current-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 24px;
}

.tag {
  background: var(--primary-color);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.tag-remove {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 12px;
  padding: 0;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.tag-remove:hover {
  background: rgba(255, 255, 255, 0.2);
}

.add-tag {
  display: flex;
  gap: 8px;
  align-items: center;
}

.tag-input {
  flex: 1;
  max-width: 200px;
}

.suggested-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.suggested-label {
  font-size: 11px;
  color: var(--text-secondary);
  margin-right: 8px;
}

.suggested-tag {
  background: var(--gray-100);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.suggested-tag:hover:not(:disabled) {
  background: var(--gray-200);
  border-color: var(--primary-color);
}

.suggested-tag:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.query-info {
  background: var(--bg-secondary);
  padding: 12px;
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 12px;
}

.info-row:not(:last-child) {
  border-bottom: 1px solid var(--border-color);
}

.info-label {
  color: var(--text-secondary);
  font-weight: 500;
}

.info-value {
  color: var(--text-primary);
  text-align: right;
}

.query-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.query-preview label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.sql-code {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 11px;
  background: var(--bg-primary);
  padding: 12px;
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  color: var(--text-primary);
  max-height: 200px;
  overflow-y: auto;
}
</style>