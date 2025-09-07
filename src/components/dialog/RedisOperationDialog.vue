<template>
  <div v-if="visible" class="dialog-overlay" @click="handleOverlayClick">
    <div class="dialog" @click.stop>
      <div class="dialog-header">
        <h3 class="dialog-title">
          <i :class="operationIcon" class="operation-icon"></i>
          {{ operationTitle }}
        </h3>
        <button class="close-btn" @click="handleCancel">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="dialog-body">
        <!-- 显示键名 -->
        <div class="field-group">
          <label class="field-label">键名:</label>
          <input 
            v-model="keyName" 
            type="text" 
            class="field-input" 
            :readonly="!isNewKey"
            placeholder="输入Redis键名"
          />
        </div>
        
        <!-- 根据操作类型显示不同字段 -->
        <template v-if="operation === 'get'">
          <div class="field-group">
            <label class="field-label">值:</label>
            <textarea 
              v-model="value" 
              class="field-textarea" 
              readonly
              placeholder="键值将在这里显示"
              rows="6"
            ></textarea>
          </div>
        </template>
        
        <template v-if="operation === 'set'">
          <div class="field-group">
            <label class="field-label">值:</label>
            <textarea 
              v-model="value" 
              class="field-textarea" 
              placeholder="输入要设置的值"
              rows="6"
            ></textarea>
          </div>
          
          <div class="field-group">
            <label class="field-label">TTL (秒, 可选):</label>
            <input 
              v-model.number="ttl" 
              type="number" 
              class="field-input" 
              placeholder="留空表示永不过期"
              min="1"
            />
          </div>
        </template>
        
        <template v-if="operation === 'hget'">
          <div class="field-group">
            <label class="field-label">字段名:</label>
            <input 
              v-model="fieldName" 
              type="text" 
              class="field-input" 
              placeholder="输入Hash字段名"
            />
          </div>
          <div class="field-group">
            <label class="field-label">值:</label>
            <textarea 
              v-model="value" 
              class="field-textarea" 
              readonly
              placeholder="字段值将在这里显示"
              rows="4"
            ></textarea>
          </div>
        </template>
        
        <template v-if="operation === 'hset'">
          <div class="field-group">
            <label class="field-label">字段名:</label>
            <input 
              v-model="fieldName" 
              type="text" 
              class="field-input" 
              placeholder="输入Hash字段名"
            />
          </div>
          <div class="field-group">
            <label class="field-label">值:</label>
            <textarea 
              v-model="value" 
              class="field-textarea" 
              placeholder="输入字段值"
              rows="4"
            ></textarea>
          </div>
        </template>
        
        <template v-if="operation === 'keys'">
          <div class="field-group">
            <label class="field-label">匹配模式:</label>
            <input 
              v-model="pattern" 
              type="text" 
              class="field-input" 
              placeholder="如: user:*, *name*, test?"
            />
          </div>
          <div class="field-group" v-if="keys.length > 0">
            <label class="field-label">匹配的键 ({{ keys.length }}):</label>
            <div class="keys-list">
              <div v-for="key in keys" :key="key" class="key-item">
                <i class="fas fa-key"></i>
                {{ key }}
              </div>
            </div>
          </div>
        </template>
        
        <!-- 错误信息 -->
        <div v-if="error" class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          {{ error }}
        </div>
      </div>
      
      <div class="dialog-footer">
        <button 
          class="btn btn-secondary" 
          @click="handleCancel"
          :disabled="loading"
        >
          取消
        </button>
        <button 
          class="btn btn-primary" 
          @click="handleConfirm"
          :disabled="loading || !isValid"
        >
          <i v-if="loading" class="fas fa-spinner fa-spin"></i>
          <i v-else :class="operationIcon"></i>
          {{ confirmButtonText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  operation: {
    type: String,
    required: true // 'get', 'set', 'del', 'hget', 'hset', 'keys' etc.
  },
  keyName: {
    type: String,
    default: ''
  },
  dataType: {
    type: String,
    default: 'String'
  },
  connectionId: {
    type: String,
    required: true
  },
  databaseName: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['confirm', 'cancel', 'update:visible'])

// 表单数据
const keyName = ref('')
const value = ref('')
const fieldName = ref('')
const ttl = ref(null)
const pattern = ref('*')
const keys = ref([])

// 状态
const loading = ref(false)
const error = ref('')

// 计算属性
const isNewKey = computed(() => props.operation === 'set' && !props.keyName)

const operationConfig = computed(() => {
  const configs = {
    get: { title: '获取键值', icon: 'fas fa-download', confirm: '获取' },
    set: { title: '设置键值', icon: 'fas fa-upload', confirm: '设置' },
    del: { title: '删除键', icon: 'fas fa-trash', confirm: '删除' },
    hget: { title: '获取Hash字段', icon: 'fas fa-download', confirm: '获取' },
    hset: { title: '设置Hash字段', icon: 'fas fa-upload', confirm: '设置' },
    keys: { title: '查找键', icon: 'fas fa-search', confirm: '搜索' }
  }
  return configs[props.operation] || { title: '操作', icon: 'fas fa-cog', confirm: '确定' }
})

const operationTitle = computed(() => operationConfig.value.title)
const operationIcon = computed(() => operationConfig.value.icon)
const confirmButtonText = computed(() => operationConfig.value.confirm)

const isValid = computed(() => {
  if (!keyName.value.trim()) return false
  
  switch (props.operation) {
    case 'set':
      return value.value.trim() !== ''
    case 'hget':
    case 'hset':
      return fieldName.value.trim() !== '' && (props.operation === 'hget' || value.value.trim() !== '')
    default:
      return true
  }
})

// 监听props变化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    resetForm()
  }
})

watch(() => props.keyName, (newVal) => {
  keyName.value = newVal || ''
})

function resetForm() {
  keyName.value = props.keyName || ''
  value.value = ''
  fieldName.value = ''
  ttl.value = null
  pattern.value = '*'
  keys.value = []
  error.value = ''
  loading.value = false
}

function handleOverlayClick() {
  if (!loading.value) {
    handleCancel()
  }
}

function handleCancel() {
  emit('update:visible', false)
  emit('cancel')
}

function handleConfirm() {
  if (!isValid.value || loading.value) return
  
  const operationData = {
    operation: props.operation,
    keyName: keyName.value.trim(),
    connectionId: props.connectionId,
    databaseName: props.databaseName
  }
  
  // 根据操作类型添加额外数据
  switch (props.operation) {
    case 'set':
      operationData.value = value.value
      if (ttl.value) operationData.ttl = ttl.value
      break
    case 'hget':
    case 'hset':
      operationData.fieldName = fieldName.value.trim()
      if (props.operation === 'hset') operationData.value = value.value
      break
    case 'keys':
      operationData.pattern = pattern.value.trim()
      break
  }
  
  emit('confirm', operationData)
}

// 暴露方法供父组件调用
defineExpose({
  setLoading: (val) => { loading.value = val },
  setError: (msg) => { error.value = msg },
  setValue: (val) => { value.value = val },
  setKeys: (keyList) => { keys.value = keyList },
  clearError: () => { error.value = '' }
})
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  min-width: 500px;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
}

.dialog-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.operation-icon {
  color: #4a90e2;
}

.close-btn {
  border: none;
  background: none;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.dialog-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.field-group {
  margin-bottom: 16px;
}

.field-label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.field-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.field-input:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.1);
}

.field-input:readonly {
  background: #f8f8f8;
  color: #666;
}

.field-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 14px;
  font-family: 'Consolas', 'Monaco', monospace;
  resize: vertical;
  transition: border-color 0.2s;
  min-height: 80px;
}

.field-textarea:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.1);
}

.field-textarea:readonly {
  background: #f8f8f8;
  color: #666;
}

.keys-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: #fafafa;
}

.key-item {
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.key-item:last-child {
  border-bottom: none;
}

.key-item i {
  color: #4a90e2;
  font-size: 12px;
}

.error-message {
  background: #ffebee;
  color: #d32f2f;
  padding: 10px 12px;
  border-radius: 4px;
  border-left: 4px solid #f44336;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.dialog-footer {
  padding: 16px 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  background: #fafafa;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid transparent;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #666;
  border-color: #e0e0e0;
}

.btn-secondary:hover:not(:disabled) {
  background: #f8f8f8;
  border-color: #d0d0d0;
}

.btn-primary {
  background: #4a90e2;
  color: white;
  border-color: #4a90e2;
}

.btn-primary:hover:not(:disabled) {
  background: #357abd;
  border-color: #357abd;
}
</style>