<template>
  <BaseDialog
    :visible="visible"
    :title="title"
    :icon="icon"
    :size="size"
    :closable="closable"
    :mask-closable="maskClosable"
    :loading="loading"
    :scrollable="true"
    :show-default-footer="true"
    :show-cancel="showCancel"
    :show-confirm="showSubmit"
    :cancel-text="cancelText"
    :confirm-text="submitText"
    :confirm-enabled="canSubmit"
    :draggable="draggable"
    :resizable="resizable"
    @update:visible="handleVisibleChange"
    @confirm="handleSubmit"
    @cancel="handleCancel"
    @close="handleClose"
  >
    <form @submit.prevent="handleSubmit" class="form-dialog">
      <!-- 表单错误提示 -->
      <div v-if="formErrors.length > 0" class="form-errors">
        <div class="error-title">⚠️ 请修正以下错误：</div>
        <ul class="error-list">
          <li v-for="error in formErrors" :key="error" class="error-item">
            {{ error }}
          </li>
        </ul>
      </div>
      
      <!-- 表单内容 -->
      <div class="form-content">
        <slot :form-data="formData" :errors="fieldErrors" :validate-field="validateField" />
      </div>
      
      <!-- 表单操作提示 -->
      <div v-if="helpText" class="form-help">
        <div class="help-icon">💡</div>
        <div class="help-text">{{ helpText }}</div>
      </div>
    </form>
  </BaseDialog>
</template>

<script setup>
import { ref, computed, watch, reactive, nextTick } from 'vue'
import BaseDialog from './BaseDialog.vue'

// Props
const props = defineProps({
  // 基础属性
  visible: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: '📝'
  },
  
  // 对话框配置
  size: {
    type: String,
    default: 'medium'
  },
  closable: {
    type: Boolean,
    default: true
  },
  maskClosable: {
    type: Boolean,
    default: false
  },
  draggable: {
    type: Boolean,
    default: false
  },
  resizable: {
    type: Boolean,
    default: false
  },
  
  // 表单配置
  initialData: {
    type: Object,
    default: () => ({})
  },
  validationRules: {
    type: Object,
    default: () => ({})
  },
  submitHandler: {
    type: Function,
    default: null
  },
  
  // 按钮配置
  showCancel: {
    type: Boolean,
    default: true
  },
  showSubmit: {
    type: Boolean,
    default: true
  },
  cancelText: {
    type: String,
    default: '取消'
  },
  submitText: {
    type: String,
    default: '确定'
  },
  
  // 帮助信息
  helpText: {
    type: String,
    default: ''
  },
  
  // 自动聚焦
  autoFocus: {
    type: Boolean,
    default: true
  }
})

// Emits
const emit = defineEmits([
  'update:visible',
  'submit',
  'cancel',
  'close',
  'form-change',
  'validation-change'
])

// 响应式数据
const loading = ref(false)
const formData = reactive({ ...props.initialData })
const fieldErrors = reactive({})
const formErrors = ref([])

// 计算属性
const canSubmit = computed(() => {
  return !loading.value && formErrors.value.length === 0 && Object.keys(fieldErrors).length === 0
})

// 表单验证规则
const defaultRules = {
  required: (value, field) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${field}不能为空`
    }
    return null
  },
  
  email: (value) => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return '请输入有效的邮箱地址'
    }
    return null
  },
  
  url: (value) => {
    if (value && !/^https?:\/\/.+/.test(value)) {
      return '请输入有效的URL地址'
    }
    return null
  },
  
  minLength: (min) => (value) => {
    if (value && value.length < min) {
      return `长度不能少于${min}个字符`
    }
    return null
  },
  
  maxLength: (max) => (value) => {
    if (value && value.length > max) {
      return `长度不能超过${max}个字符`
    }
    return null
  },
  
  min: (min) => (value) => {
    if (value !== null && value !== undefined && Number(value) < min) {
      return `值不能小于${min}`
    }
    return null
  },
  
  max: (max) => (value) => {
    if (value !== null && value !== undefined && Number(value) > max) {
      return `值不能大于${max}`
    }
    return null
  },
  
  pattern: (regex, message = '格式不正确') => (value) => {
    if (value && !regex.test(value)) {
      return message
    }
    return null
  }
}

// 获取嵌套字段的值
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined
  }, obj)
}

// 方法
const validateField = (fieldName, value) => {
  const rules = props.validationRules[fieldName] || []
  const fieldLabel = getFieldLabel(fieldName)
  
  // 如果没有传入value，从formData中获取（支持嵌套字段）
  if (value === undefined) {
    value = getNestedValue(formData, fieldName)
  }
  
  delete fieldErrors[fieldName]
  
  for (const rule of rules) {
    let error = null
    
    if (typeof rule === 'string') {
      // 预定义规则
      if (defaultRules[rule]) {
        error = defaultRules[rule](value, fieldLabel)
      }
    } else if (typeof rule === 'function') {
      // 自定义函数
      error = rule(value, fieldLabel, formData)
    } else if (typeof rule === 'object') {
      // 规则对象
      const ruleName = rule.rule || rule.type
      const ruleFunction = defaultRules[ruleName]
      
      if (ruleFunction) {
        if (rule.params) {
          error = ruleFunction(...rule.params)(value, fieldLabel, formData)
        } else {
          error = ruleFunction(value, fieldLabel, formData)
        }
      }
      
      // 自定义错误消息
      if (error && rule.message) {
        error = rule.message
      }
    }
    
    if (error) {
      fieldErrors[fieldName] = error
      break
    }
  }
  
  updateFormErrors()
  emit('validation-change', { field: fieldName, error: fieldErrors[fieldName] })
  
  return !fieldErrors[fieldName]
}

const validateForm = () => {
  let isValid = true
  
  // 清空之前的错误
  Object.keys(fieldErrors).forEach(key => delete fieldErrors[key])
  
  // 验证所有有规则的字段
  Object.keys(props.validationRules).forEach(fieldName => {
    const fieldValue = getNestedValue(formData, fieldName)
    if (!validateField(fieldName, fieldValue)) {
      isValid = false
    }
  })
  
  updateFormErrors()
  return isValid
}

const updateFormErrors = () => {
  formErrors.value = Object.values(fieldErrors)
}

const getFieldLabel = (fieldName) => {
  // 可以从props或其他地方获取字段标签
  const labelMap = {
    name: '名称',
    email: '邮箱',
    password: '密码',
    url: 'URL',
    port: '端口',
    host: '主机',
    'config.db_type': '数据库类型',
    'config.host': '主机地址',
    'config.port': '端口号',
    'config.username': '用户名',
    'config.password': '密码',
    'config.database': '数据库名',
    // 可以扩展更多字段标签映射
  }
  
  return labelMap[fieldName] || fieldName.split('.').pop() || fieldName
}

const resetForm = () => {
  // 重置表单数据
  Object.keys(formData).forEach(key => delete formData[key])
  Object.assign(formData, { ...props.initialData })
  
  // 清空错误
  Object.keys(fieldErrors).forEach(key => delete fieldErrors[key])
  formErrors.value = []
}

const handleSubmit = async () => {
  if (loading.value) return
  
  // 验证表单
  if (!validateForm()) {
    return
  }
  
  loading.value = true
  
  try {
    let result
    
    if (props.submitHandler) {
      result = await props.submitHandler({ ...formData })
    } else {
      result = { ...formData }
    }
    
    emit('submit', result)

  } catch (error) {
    console.error('表单提交失败:', error)
    
    // 处理服务器端验证错误
    if (error.validation) {
      Object.assign(fieldErrors, error.validation)
      updateFormErrors()
    }
    
    // 可以显示通用错误消息
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
  emit('update:visible', false)
}

const handleClose = () => {
  emit('close')
}

const handleVisibleChange = (visible) => {
  emit('update:visible', visible)
}

// 监听表单数据变化
watch(() => formData, (newData) => {
  emit('form-change', { ...newData })
  
  // 当表单数据变化时，清除相关的验证错误
  // 这样用户修改后能立即看到错误消失
  Object.keys(newData).forEach(key => {
    if (typeof newData[key] === 'object' && newData[key] !== null) {
      // 处理嵌套对象
      Object.keys(newData[key]).forEach(nestedKey => {
        const fieldName = `${key}.${nestedKey}`
        if (fieldErrors[fieldName] && newData[key][nestedKey]) {
          delete fieldErrors[fieldName]
          updateFormErrors()
        }
      })
    } else if (fieldErrors[key] && newData[key]) {
      delete fieldErrors[key]
      updateFormErrors()
    }
  })
}, { deep: true })

// 监听初始数据变化
watch(() => props.initialData, (newInitialData) => {
  resetForm()
}, { deep: true })

// 生命周期
watch(() => props.visible, async (newVal) => {
  if (newVal) {
    resetForm()
    
    // 自动聚焦第一个输入框
    if (props.autoFocus) {
      await nextTick()
      const firstInput = document.querySelector('.form-dialog input, .form-dialog textarea, .form-dialog select')
      if (firstInput) {
        firstInput.focus()
      }
    }
  }
})

// 导出组件实例方法
defineExpose({
  validateForm,
  validateField,
  resetForm,
  formData,
  fieldErrors
})
</script>

<style scoped>
.form-dialog {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-errors {
  background: var(--error-bg, #fef2f2);
  border: 1px solid var(--error-border, #fecaca);
  border-radius: var(--border-radius);
  padding: 12px 16px;
}

.error-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--error-color);
  margin-bottom: 8px;
}

.error-list {
  margin: 0;
  padding-left: 16px;
}

.error-item {
  font-size: 13px;
  color: var(--error-color);
  margin-bottom: 4px;
}

.error-item:last-child {
  margin-bottom: 0;
}

.form-content {
  flex: 1;
}

.form-help {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: var(--info-bg, #f0f9ff);
  border: 1px solid var(--info-border, #bae6fd);
  border-radius: var(--border-radius);
  padding: 12px 16px;
}

.help-icon {
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}

.help-text {
  font-size: 13px;
  color: var(--info-color, #0284c7);
  line-height: 1.4;
}

/* 表单元素样式增强 */
:deep(.form-group) {
  margin-bottom: 16px;
}

:deep(.form-group:last-child) {
  margin-bottom: 0;
}

:deep(.form-row) {
  display: flex;
  gap: 16px;
}

:deep(.form-row .form-group) {
  flex: 1;
  margin-bottom: 0;
}

:deep(label) {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--gray-700);
  margin-bottom: 6px;
}

:deep(.required)::after {
  content: ' *';
  color: var(--error-color);
}

:deep(.input),
:deep(.select),
:deep(.textarea) {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: 14px;
  transition: all 0.2s ease;
}

:deep(.input:focus),
:deep(.select:focus),
:deep(.textarea:focus) {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

:deep(.input.error),
:deep(.select.error),
:deep(.textarea.error) {
  border-color: var(--error-color);
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.1);
}

:deep(.field-error) {
  font-size: 12px;
  color: var(--error-color);
  margin-top: 4px;
}

:deep(.form-hint) {
  font-size: 11px;
  color: var(--gray-500);
  margin-top: 4px;
}

:deep(.textarea) {
  min-height: 80px;
  resize: vertical;
}

:deep(.checkbox-group),
:deep(.radio-group) {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

:deep(.checkbox-item),
:deep(.radio-item) {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

:deep(.checkbox),
:deep(.radio) {
  width: 16px;
  height: 16px;
}
</style>