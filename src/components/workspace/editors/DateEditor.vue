<template>
  <div class="date-editor">
    <div class="date-input-group">
      <!-- 日期时间输入框 -->
      <input
        ref="inputRef"
        :type="inputType"
        v-model="localValue"
        :min="minDate"
        :max="maxDate"
        class="date-input"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @change="handleChange"
      />
      
      <!-- 当前时间按钮 -->
      <button @click="setNow" class="now-btn" title="设为当前时间">
        📅 现在
      </button>
    </div>
    
    <!-- 日期预设快捷键 -->
    <div class="date-presets">
      <button 
        v-for="preset in presets" 
        :key="preset.label"
        @click="setPreset(preset.value)"
        class="preset-btn"
        :title="preset.tooltip"
      >
        {{ preset.label }}
      </button>
    </div>
    
    <!-- 日期工具栏 -->
    <div class="date-footer">
      <div class="date-format-info" v-if="showFormatInfo">
        📋 格式: {{ dateFormat }}
      </div>
      
      <div class="date-tools">
        <button 
          @click="clearDate"
          class="tool-btn"
          title="清空日期"
          v-if="localValue"
        >
          🗑️
        </button>
        <button 
          @click="setNull"
          class="tool-btn"
          title="设为NULL"
        >
          ∅
        </button>
        <button 
          @click="toggleTimezone"
          class="tool-btn"
          :class="{ active: showTimezone }"
          title="显示时区信息"
          v-if="isDateTime"
        >
          🌍
        </button>
      </div>
    </div>
    
    <!-- 时区信息 -->
    <div class="timezone-info" v-if="showTimezone && isDateTime">
      <div class="timezone-label">时区信息:</div>
      <div class="timezone-details">
        <div class="timezone-item">
          <span class="tz-label">本地:</span>
          <span class="tz-value">{{ localTimeString }}</span>
        </div>
        <div class="timezone-item">
          <span class="tz-label">UTC:</span>
          <span class="tz-value">{{ utcTimeString }}</span>
        </div>
      </div>
    </div>
    
    <!-- 日期预览 -->
    <div class="date-preview" v-if="showPreview">
      <div class="preview-label">格式化预览:</div>
      <div class="preview-value">{{ formattedDate }}</div>
    </div>
    
    <!-- 相对时间显示 -->
    <div class="relative-time" v-if="showRelativeTime">
      <span class="relative-label">相对时间:</span>
      <span class="relative-value">{{ relativeTimeString }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Date, null],
    default: null
  },
  column: {
    type: Object,
    required: true
  },
  constraints: {
    type: Object,
    default: () => ({})
  },
  originalValue: {
    type: [String, Date, null],
    default: null
  }
})

const emit = defineEmits([
  'update:modelValue',
  'validate'
])

// 引用
const inputRef = ref(null)

// 响应式数据
const localValue = ref('')
const isFocused = ref(false)
const showTimezone = ref(false)

// 计算属性
const dataType = computed(() => (props.column.data_type || '').toLowerCase())

const isDate = computed(() => {
  return dataType.value === 'date'
})

const isTime = computed(() => {
  return dataType.value === 'time'
})

const isDateTime = computed(() => {
  return dataType.value.includes('datetime') || 
         dataType.value.includes('timestamp')
})

const inputType = computed(() => {
  if (isDate.value) return 'date'
  if (isTime.value) return 'time'
  if (isDateTime.value) return 'datetime-local'
  return 'datetime-local'
})

const dateFormat = computed(() => {
  if (isDate.value) return 'YYYY-MM-DD'
  if (isTime.value) return 'HH:mm:ss'
  if (isDateTime.value) return 'YYYY-MM-DD HH:mm:ss'
  return 'YYYY-MM-DD HH:mm:ss'
})

const minDate = computed(() => {
  // 根据数据类型设置最小日期
  if (isDate.value || isDateTime.value) {
    return '1000-01-01'
  }
  return null
})

const maxDate = computed(() => {
  // 根据数据类型设置最大日期
  if (isDate.value || isDateTime.value) {
    return '9999-12-31'
  }
  return null
})

const showFormatInfo = computed(() => {
  return isFocused.value || !localValue.value
})

const showPreview = computed(() => {
  return localValue.value && isFocused.value
})

const showRelativeTime = computed(() => {
  return localValue.value && (isDate.value || isDateTime.value) && isFocused.value
})

const presets = computed(() => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  if (isTime.value) {
    return [
      { label: '00:00', value: '00:00:00', tooltip: '午夜' },
      { label: '06:00', value: '06:00:00', tooltip: '早上6点' },
      { label: '12:00', value: '12:00:00', tooltip: '中午12点' },
      { label: '18:00', value: '18:00:00', tooltip: '下午6点' }
    ]
  }
  
  const formatDate = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    if (isDate.value) {
      return `${year}-${month}-${day}`
    }
    
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
  }
  
  return [
    { label: '今天', value: formatDate(today), tooltip: '今天' },
    { label: '昨天', value: formatDate(new Date(today.getTime() - 86400000)), tooltip: '昨天' },
    { label: '明天', value: formatDate(new Date(today.getTime() + 86400000)), tooltip: '明天' },
    { label: '本周一', value: formatDate(new Date(today.getTime() - (today.getDay() - 1) * 86400000)), tooltip: '本周一' }
  ]
})

const formattedDate = computed(() => {
  if (!localValue.value) return ''
  
  try {
    const date = new Date(localValue.value)
    if (isNaN(date.getTime())) return '无效日期'
    
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: isDateTime.value ? 'numeric' : undefined,
      minute: isDateTime.value ? 'numeric' : undefined,
      second: isDateTime.value ? 'numeric' : undefined,
      weekday: 'long'
    }).format(date)
  } catch (e) {
    return '无效日期'
  }
})

const localTimeString = computed(() => {
  if (!localValue.value || !isDateTime.value) return ''
  
  try {
    const date = new Date(localValue.value)
    return date.toLocaleString('zh-CN')
  } catch (e) {
    return '无效日期'
  }
})

const utcTimeString = computed(() => {
  if (!localValue.value || !isDateTime.value) return ''
  
  try {
    const date = new Date(localValue.value)
    return date.toISOString().replace('T', ' ').replace('Z', ' UTC')
  } catch (e) {
    return '无效日期'
  }
})

const relativeTimeString = computed(() => {
  if (!localValue.value) return ''
  
  try {
    const date = new Date(localValue.value)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (days > 0) return `${days}天前`
    if (days < 0) return `${Math.abs(days)}天后`
    if (hours > 0) return `${hours}小时前`
    if (hours < 0) return `${Math.abs(hours)}小时后`
    if (minutes > 0) return `${minutes}分钟前`
    if (minutes < 0) return `${Math.abs(minutes)}分钟后`
    return '刚刚'
  } catch (e) {
    return '无效时间'
  }
})

// 方法
const handleInput = () => {
  emit('update:modelValue', localValue.value)
  validateValue()
}

const handleFocus = () => {
  isFocused.value = true
}

const handleBlur = () => {
  isFocused.value = false
  validateValue()
}

const handleChange = () => {
  validateValue()
}

const validateValue = () => {
  const errors = []
  
  if (!localValue.value) {
    if (props.constraints.not_null) {
      errors.push('此字段不能为空')
    }
    emit('validate', errors)
    return
  }
  
  try {
    const date = new Date(localValue.value)
    if (isNaN(date.getTime())) {
      errors.push('请输入有效的日期时间')
    } else {
      // 检查日期范围
      if (minDate.value && localValue.value < minDate.value) {
        errors.push(`日期不能早于 ${minDate.value}`)
      }
      if (maxDate.value && localValue.value > maxDate.value) {
        errors.push(`日期不能晚于 ${maxDate.value}`)
      }
    }
  } catch (e) {
    errors.push('请输入有效的日期时间格式')
  }
  
  emit('validate', errors)
}

const setNow = () => {
  const now = new Date()
  
  if (isDate.value) {
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    localValue.value = `${year}-${month}-${day}`
  } else if (isTime.value) {
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    localValue.value = `${hours}:${minutes}:${seconds}`
  } else {
    // datetime-local 格式
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    localValue.value = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
  }
  
  handleInput()
  focusInput()
}

const setPreset = (value) => {
  localValue.value = value
  handleInput()
  focusInput()
}

const clearDate = () => {
  localValue.value = ''
  emit('update:modelValue', '')
  validateValue()
  focusInput()
}

const setNull = () => {
  localValue.value = ''
  emit('update:modelValue', null)
  validateValue()
  focusInput()
}

const toggleTimezone = () => {
  showTimezone.value = !showTimezone.value
}

const focusInput = () => {
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.focus()
    }
  })
}

// 生命周期
onMounted(() => {
  focusInput()
  validateValue()
})

// 监听props变化
watch(() => props.modelValue, (newValue) => {
  if (newValue instanceof Date) {
    // 转换Date对象为字符串
    if (isDate.value) {
      localValue.value = newValue.toISOString().split('T')[0]
    } else if (isTime.value) {
      localValue.value = newValue.toTimeString().split(' ')[0]
    } else {
      // datetime-local格式
      const offset = newValue.getTimezoneOffset()
      const localDate = new Date(newValue.getTime() - offset * 60000)
      localValue.value = localDate.toISOString().slice(0, 19)
    }
  } else {
    localValue.value = newValue || ''
  }
}, { immediate: true })
</script>

<style scoped>
.date-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 320px;
}

.date-input-group {
  display: flex;
  align-items: stretch;
  gap: 2px;
}

.date-input {
  flex: 1;
  border: 2px solid var(--border-color);
  border-radius: 4px 0 0 4px;
  padding: 8px 12px;
  font-size: 13px;
  font-family: var(--font-mono, 'Monaco', monospace);
  color: var(--text-color);
  background: white;
  transition: all 0.2s ease;
}

.date-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.now-btn {
  border: 2px solid var(--border-color);
  border-left: none;
  border-radius: 0 4px 4px 0;
  background: var(--primary-color);
  color: white;
  padding: 0 12px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.now-btn:hover {
  background: var(--primary-color-dark);
}

.date-presets {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.preset-btn {
  padding: 4px 8px;
  border: 1px solid var(--gray-300);
  background: white;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  color: var(--gray-700);
  transition: all 0.2s ease;
}

.preset-btn:hover {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.date-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
}

.date-format-info {
  color: var(--gray-600);
  background: var(--gray-50);
  padding: 2px 8px;
  border-radius: 3px;
  border: 1px solid var(--gray-200);
}

.date-tools {
  display: flex;
  gap: 4px;
}

.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px solid var(--gray-300);
  background: white;
  border-radius: 3px;
  cursor: pointer;
  font-size: 10px;
  color: var(--gray-600);
  transition: all 0.2s ease;
}

.tool-btn:hover {
  background: var(--gray-100);
  border-color: var(--gray-400);
  color: var(--gray-800);
}

.tool-btn.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.timezone-info {
  background: var(--blue-50);
  border: 1px solid var(--blue-200);
  border-radius: 6px;
  padding: 8px 12px;
}

.timezone-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--blue-800);
  margin-bottom: 4px;
}

.timezone-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.timezone-item {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
}

.tz-label {
  font-weight: 500;
  color: var(--blue-700);
}

.tz-value {
  font-family: var(--font-mono, 'Monaco', monospace);
  color: var(--blue-800);
}

.date-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  background: var(--green-50);
  padding: 4px 8px;
  border-radius: 3px;
  border: 1px solid var(--green-200);
}

.preview-label {
  color: var(--green-700);
  font-weight: 500;
}

.preview-value {
  color: var(--green-800);
  font-weight: 600;
}

.relative-time {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  background: var(--purple-50);
  padding: 4px 8px;
  border-radius: 3px;
  border: 1px solid var(--purple-200);
}

.relative-label {
  color: var(--purple-700);
  font-weight: 500;
}

.relative-value {
  color: var(--purple-800);
  font-weight: 600;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .date-editor {
    min-width: 280px;
  }
  
  .date-input {
    padding: 6px 10px;
    font-size: 12px;
  }
  
  .now-btn {
    padding: 0 8px;
    font-size: 10px;
  }
  
  .date-presets {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .date-footer {
    flex-direction: column;
    gap: 6px;
    align-items: stretch;
  }
  
  .date-tools {
    justify-content: center;
  }
  
  .timezone-item {
    flex-direction: column;
    gap: 2px;
  }
}
</style>