<template>
  <div class="cell-editor-overlay" @click.self="cancel">
    <div class="editor-popup" :style="editorPosition">
      <!-- 编辑器头部 -->
      <div class="editor-header">
        <div class="editor-title">
          <span class="edit-icon">✏️</span>
          <span class="field-info">
            编辑: <strong>{{ column.name || 'Field' }}</strong>
            <span v-if="column.data_type" class="data-type">({{ column.data_type }})</span>
          </span>
        </div>
        <button class="close-btn" @click="cancel" title="取消编辑">
          ❌
        </button>
      </div>
      
      <!-- 编辑器主体 -->
      <div class="editor-body">
        <!-- 动态编辑器组件 -->
        <component 
          :is="editorComponent"
          v-model="editValue"
          :column="column"
          :constraints="constraints"
          :original-value="originalValue"
          @validate="handleValidation"
          @keydown.enter="applyAndClose"
          @keydown.escape="cancel"
        />
        
        <!-- 约束信息 -->
        <div class="constraints-info" v-if="hasConstraints">
          <div class="constraints-title">⚠️ 字段约束:</div>
          <ul class="constraints-list">
            <li v-for="constraint in constraintList" :key="constraint">
              {{ constraint }}
            </li>
          </ul>
        </div>
        
        <!-- 验证错误 -->
        <div class="validation-errors" v-if="validationErrors.length">
          <div class="error-title">❌ 验证错误:</div>
          <div v-for="error in validationErrors" :key="error" class="error-message">
            {{ error }}
          </div>
        </div>
        
        <!-- 值变化提示 -->
        <div class="value-change-info" v-if="hasValueChanged">
          <div class="change-label">🔄 值变化:</div>
          <div class="change-details">
            <div class="old-value">
              <span class="value-label">原值:</span>
              <code class="value-display">{{ formatDisplayValue(originalValue) }}</code>
            </div>
            <div class="new-value">
              <span class="value-label">新值:</span>
              <code class="value-display">{{ formatDisplayValue(editValue) }}</code>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 编辑器底部 -->
      <div class="editor-footer">
        <div class="footer-info">
          <span class="shortcut-hint">
            💡 <kbd>Enter</kbd> 应用 • <kbd>Esc</kbd> 取消
          </span>
        </div>
        <div class="footer-actions">
          <button 
            @click="apply" 
            :disabled="!canApply"
            class="btn btn-apply"
            title="应用更改"
          >
            ✅ 应用
          </button>
          <button 
            @click="cancel" 
            class="btn btn-cancel"
            title="取消编辑"
          >
            ❌ 取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import TextEditor from './editors/TextEditor.vue'
import NumberEditor from './editors/NumberEditor.vue'
import DateEditor from './editors/DateEditor.vue'
import BooleanEditor from './editors/BooleanEditor.vue'
import JSONEditor from './editors/JSONEditor.vue'
import { useDataValidation } from '@/composables/useDataValidation.js'

const props = defineProps({
  value: {
    required: true
  },
  column: {
    type: Object,
    required: true
  },
  constraints: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits([
  'save',
  'cancel'
])

// 响应式数据
const editValue = ref(props.value)
const originalValue = ref(props.value)
const editorPosition = ref({})
const validationErrors = ref([])

// 数据验证 composable
const { validateValue, isValidType } = useDataValidation(props.column, props.constraints)

// 计算属性
const editorComponent = computed(() => {
  const dataType = (props.column.data_type || '').toLowerCase()
  
  // 布尔类型
  if (dataType.includes('bool') || dataType.includes('tinyint')) {
    return BooleanEditor
  }
  
  // 数字类型
  if (dataType.includes('int') || dataType.includes('decimal') || 
      dataType.includes('float') || dataType.includes('double') || 
      dataType.includes('numeric')) {
    return NumberEditor
  }
  
  // 日期时间类型
  if (dataType.includes('date') || dataType.includes('time') || dataType.includes('timestamp')) {
    return DateEditor
  }
  
  // JSON类型
  if (dataType.includes('json')) {
    return JSONEditor
  }
  
  // 默认文本编辑器
  return TextEditor
})

const hasConstraints = computed(() => {
  return constraintList.value.length > 0
})

const constraintList = computed(() => {
  const constraints = []
  
  if (props.constraints.not_null) {
    constraints.push('NOT NULL - 不能为空')
  }
  
  if (props.constraints.unique) {
    constraints.push('UNIQUE - 值必须唯一')
  }
  
  if (props.constraints.primary_key) {
    constraints.push('PRIMARY KEY - 主键字段')
  }
  
  if (props.constraints.auto_increment) {
    constraints.push('AUTO INCREMENT - 自动递增')
  }
  
  if (props.constraints.max_length) {
    constraints.push(`最大长度: ${props.constraints.max_length}`)
  }
  
  if (props.column.data_type) {
    constraints.push(`数据类型: ${props.column.data_type}`)
  }
  
  return constraints
})

const hasValueChanged = computed(() => {
  return editValue.value !== originalValue.value
})

const canApply = computed(() => {
  return validationErrors.value.length === 0 && hasValueChanged.value
})

// 方法
const handleValidation = (errors) => {
  validationErrors.value = Array.isArray(errors) ? errors : []
}

const formatDisplayValue = (value) => {
  if (value === null) return 'NULL'
  if (value === undefined) return 'undefined'
  if (value === '') return '(空字符串)'
  if (typeof value === 'string' && value.length > 50) {
    return value.substring(0, 50) + '...'
  }
  return String(value)
}

const validateCurrentValue = () => {
  const errors = validateValue(editValue.value)
  validationErrors.value = errors
  return errors.length === 0
}

const apply = () => {
  if (!validateCurrentValue()) {
    return
  }
  
  if (!hasValueChanged.value) {
    cancel()
    return
  }
  
  emit('save', editValue.value)
}

const applyAndClose = () => {
  apply()
}

const cancel = () => {
  emit('cancel')
}

const calculatePosition = () => {
  // 这里简化处理，实际应该根据触发元素位置计算
  editorPosition.value = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 1000
  }
}

const handleKeyDown = (event) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    cancel()
  } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault()
    apply()
  }
}

// 生命周期
onMounted(() => {
  calculatePosition()
  
  // 自动验证初始值
  nextTick(() => {
    validateCurrentValue()
  })
  
  // 添加全局按键监听
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.cell-editor-overlay {
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
  backdrop-filter: blur(2px);
}

.editor-popup {
  background: white;
  border-radius: 8px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  min-width: 400px;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: popupAppear 0.2s ease-out;
}

@keyframes popupAppear {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

/* 编辑器头部 */
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--gray-50);
  border-bottom: 1px solid var(--border-color);
}

.editor-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-800);
}

.edit-icon {
  font-size: 16px;
}

.field-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.data-type {
  font-size: 11px;
  color: var(--gray-500);
  font-weight: 400;
  background: var(--gray-100);
  padding: 2px 6px;
  border-radius: 4px;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: var(--gray-500);
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--gray-200);
  color: var(--gray-700);
}

/* 编辑器主体 */
.editor-body {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 约束信息 */
.constraints-info {
  background: var(--yellow-50);
  border: 1px solid var(--yellow-200);
  border-radius: 6px;
  padding: 8px 12px;
}

.constraints-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--yellow-800);
  margin-bottom: 4px;
}

.constraints-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.constraints-list li {
  font-size: 11px;
  color: var(--yellow-700);
  padding: 1px 0;
}

/* 验证错误 */
.validation-errors {
  background: var(--red-50);
  border: 1px solid var(--red-200);
  border-radius: 6px;
  padding: 8px 12px;
}

.error-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--red-800);
  margin-bottom: 4px;
}

.error-message {
  font-size: 11px;
  color: var(--red-700);
  padding: 1px 0;
}

/* 值变化信息 */
.value-change-info {
  background: var(--blue-50);
  border: 1px solid var(--blue-200);
  border-radius: 6px;
  padding: 8px 12px;
}

.change-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--blue-800);
  margin-bottom: 6px;
}

.change-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.old-value, .new-value {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.value-label {
  font-weight: 500;
  min-width: 40px;
  color: var(--gray-600);
}

.value-display {
  background: var(--gray-100);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Monaco', monospace;
  font-size: 10px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.new-value .value-display {
  background: var(--blue-100);
  color: var(--blue-800);
}

/* 编辑器底部 */
.editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--gray-50);
  border-top: 1px solid var(--border-color);
}

.footer-info {
  font-size: 11px;
  color: var(--gray-500);
}

.shortcut-hint {
  display: flex;
  align-items: center;
  gap: 4px;
}

.shortcut-hint kbd {
  background: var(--gray-200);
  color: var(--gray-700);
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 10px;
  font-family: inherit;
}

.footer-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 6px 14px;
  border-radius: 4px;
  border: 1px solid;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-apply {
  background: var(--green-600);
  color: white;
  border-color: var(--green-600);
}

.btn-apply:hover:not(:disabled) {
  background: var(--green-700);
  border-color: var(--green-700);
}

.btn-apply:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--gray-400);
  border-color: var(--gray-400);
}

.btn-cancel {
  background: var(--gray-200);
  color: var(--gray-700);
  border-color: var(--gray-300);
}

.btn-cancel:hover {
  background: var(--gray-300);
  border-color: var(--gray-400);
}

/* 响应式设计 */
@media (max-width: 480px) {
  .editor-popup {
    min-width: 90vw;
    max-width: 90vw;
    max-height: 90vh;
    margin: 5vh auto;
  }
  
  .editor-header,
  .editor-footer {
    padding: 10px 12px;
  }
  
  .editor-body {
    padding: 12px;
  }
  
  .footer-info {
    display: none;
  }
  
  .change-details {
    flex-direction: column;
  }
  
  .old-value, .new-value {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
}
</style>