<template>
  <FormDialog
    :visible="true"
    title="导入查询历史"
    width="500px"
    @close="$emit('close')"
    @confirm="handleImport"
    confirm-text="导入"
    :confirm-disabled="!importData"
  >
    <div class="import-dialog">
      <div class="import-section">
        <h3>选择文件</h3>
        
        <div class="file-upload">
          <label class="upload-area" :class="{ 'drag-over': dragOver }">
            <input
              type="file"
              accept=".json"
              class="file-input"
              @change="handleFileSelect"
            >
            
            <div class="upload-content">
              <div class="upload-icon">📁</div>
              <div class="upload-text">
                <div class="upload-primary">点击选择文件或拖拽到此处</div>
                <div class="upload-secondary">支持JSON格式的历史记录文件</div>
              </div>
            </div>
          </label>
        </div>
        
        <div v-if="fileName" class="selected-file">
          <div class="file-info">
            <span class="file-name">{{ fileName }}</span>
            <button class="file-remove" @click="clearFile">×</button>
          </div>
        </div>
      </div>
      
      <div v-if="importData" class="preview-section">
        <h3>导入预览</h3>
        
        <div class="preview-stats">
          <div class="stat-item">
            <span class="stat-label">查询记录</span>
            <span class="stat-value">{{ importData.histories?.length || 0 }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">导出时间</span>
            <span class="stat-value">{{ formatTime(importData.exported_at) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">文件版本</span>
            <span class="stat-value">{{ importData.version || 'Unknown' }}</span>
          </div>
        </div>
        
        <div class="merge-options">
          <h4>导入方式</h4>
          
          <div class="radio-group">
            <label class="radio-option">
              <input
                v-model="mergeMode"
                type="radio"
                value="replace"
              >
              <span class="radio-text">
                <strong>替换</strong> - 清空现有历史记录，使用导入的记录
              </span>
            </label>
            
            <label class="radio-option">
              <input
                v-model="mergeMode"
                type="radio"
                value="merge"
              >
              <span class="radio-text">
                <strong>合并</strong> - 保留现有记录，添加新的记录
              </span>
            </label>
          </div>
        </div>
        
        <div v-if="conflicts.length > 0" class="conflicts-section">
          <h4>冲突处理</h4>
          <div class="conflicts-info">
            发现 {{ conflicts.length }} 个重复的查询记录，合并模式下将跳过这些记录。
          </div>
          
          <div class="conflicts-list">
            <div
              v-for="conflict in conflicts.slice(0, 3)"
              :key="conflict.id"
              class="conflict-item"
            >
              {{ conflict.description }}
            </div>
            <div v-if="conflicts.length > 3" class="conflict-more">
              还有 {{ conflicts.length - 3 }} 个冲突...
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="error" class="error-section">
        <div class="error-message">
          <span class="error-icon">⚠️</span>
          {{ error }}
        </div>
      </div>
    </div>
  </FormDialog>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useQueryHistoryStore } from '@/stores/queryHistory.js'
import FormDialog from '@/components/dialog/FormDialog.vue'

// Emits
const emit = defineEmits(['import', 'close'])

// Store
const queryHistoryStore = useQueryHistoryStore()

// 响应式状态
const importData = ref(null)
const fileName = ref('')
const mergeMode = ref('merge')
const error = ref('')
const dragOver = ref(false)

// 计算属性
const conflicts = computed(() => {
  if (!importData.value?.histories || mergeMode.value === 'replace') {
    return []
  }
  
  const existingHashes = new Set(
    queryHistoryStore.histories.map(h => h.queryHash)
  )
  
  return importData.value.histories.filter(h => 
    existingHashes.has(h.queryHash)
  )
})

// 方法
const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    processFile(file)
  }
}

const processFile = (file) => {
  fileName.value = file.name
  error.value = ''
  
  const reader = new FileReader()
  
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)
      validateImportData(data)
      importData.value = data
    } catch (err) {
      error.value = '文件格式错误: ' + err.message
      importData.value = null
    }
  }
  
  reader.onerror = () => {
    error.value = '文件读取失败'
    importData.value = null
  }
  
  reader.readAsText(file)
}

const validateImportData = (data) => {
  if (!data || typeof data !== 'object') {
    throw new Error('无效的JSON文件')
  }
  
  if (!data.histories || !Array.isArray(data.histories)) {
    throw new Error('文件不包含有效的历史记录数据')
  }
  
  // 验证历史记录格式
  for (const history of data.histories) {
    if (!history.id || !history.query || !history.queryHash) {
      throw new Error('历史记录格式不正确')
    }
  }
}

const clearFile = () => {
  fileName.value = ''
  importData.value = null
  error.value = ''
}

const handleImport = () => {
  if (importData.value) {
    emit('import', importData.value, mergeMode.value)
  }
}

const formatTime = (timestamp) => {
  if (!timestamp) return 'Unknown'
  return new Date(timestamp).toLocaleString()
}

// 拖拽处理
const handleDragOver = (e) => {
  e.preventDefault()
  dragOver.value = true
}

const handleDragLeave = (e) => {
  e.preventDefault()
  dragOver.value = false
}

const handleDrop = (e) => {
  e.preventDefault()
  dragOver.value = false
  
  const files = e.dataTransfer.files
  if (files.length > 0) {
    const file = files[0]
    if (file.type === 'application/json' || file.name.endsWith('.json')) {
      processFile(file)
    } else {
      error.value = '请选择JSON格式的文件'
    }
  }
}

// 生命周期
onMounted(() => {
  document.addEventListener('dragover', handleDragOver)
  document.addEventListener('dragleave', handleDragLeave)
  document.addEventListener('drop', handleDrop)
})

onUnmounted(() => {
  document.removeEventListener('dragover', handleDragOver)
  document.removeEventListener('dragleave', handleDragLeave)
  document.removeEventListener('drop', handleDrop)
})
</script>

<style scoped>
.import-dialog {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.import-section,
.preview-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.import-section h3,
.preview-section h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.file-upload {
  position: relative;
}

.upload-area {
  display: block;
  width: 100%;
  min-height: 120px;
  border: 2px dashed var(--border-color);
  border-radius: var(--border-radius);
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.upload-area:hover,
.upload-area.drag-over {
  border-color: var(--primary-color);
  background: rgba(99, 102, 241, 0.05);
}

.file-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
  gap: 12px;
}

.upload-icon {
  font-size: 32px;
  opacity: 0.6;
}

.upload-text {
  text-align: center;
}

.upload-primary {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.upload-secondary {
  font-size: 12px;
  color: var(--text-secondary);
}

.selected-file {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: 12px;
}

.file-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.file-name {
  font-size: 13px;
  color: var(--text-primary);
}

.file-remove {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: var(--text-tertiary);
  padding: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-remove:hover {
  background: var(--error-color);
  color: white;
}

.preview-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
}

.stat-label {
  display: block;
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.stat-value {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: var(--primary-color);
}

.merge-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.merge-options h4 {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  padding: 8px;
  border-radius: var(--border-radius);
  transition: background-color 0.2s ease;
}

.radio-option:hover {
  background: var(--bg-tertiary);
}

.radio-text {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.conflicts-section {
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: var(--border-radius);
  padding: 12px;
}

.conflicts-section h4 {
  font-size: 12px;
  font-weight: 600;
  color: #92400e;
  margin: 0 0 8px 0;
}

.conflicts-info {
  font-size: 11px;
  color: #92400e;
  margin-bottom: 8px;
}

.conflicts-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.conflict-item {
  font-size: 11px;
  color: #78350f;
  padding: 4px 8px;
  background: rgba(245, 158, 11, 0.1);
  border-radius: 3px;
}

.conflict-more {
  font-size: 11px;
  color: #78350f;
  font-style: italic;
  padding: 4px 8px;
}

.error-section {
  background: #fecaca;
  border: 1px solid var(--error-color);
  border-radius: var(--border-radius);
  padding: 12px;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #991b1b;
}

.error-icon {
  font-size: 14px;
}
</style>