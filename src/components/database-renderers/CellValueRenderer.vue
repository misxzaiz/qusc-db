<template>
  <div class="cell-value-renderer" :class="cellClass">
    <!-- NULL 值 -->
    <span v-if="isNull" class="null-value">NULL</span>
    
    <!-- 空字符串 -->
    <span v-else-if="isEmpty" class="empty-value">(empty)</span>
    
    <!-- 布尔值 -->
    <div v-else-if="isBoolean" class="boolean-value">
      <Icon :name="booleanIcon" :class="booleanClass" />
      <span>{{ displayValue }}</span>
    </div>
    
    <!-- JSON 值 -->
    <div v-else-if="isJson" class="json-value">
      <details v-if="formattedJson">
        <summary class="json-summary">
          <Icon name="code" />
          {{ jsonSummary }}
        </summary>
        <pre class="json-content">{{ formattedJson }}</pre>
      </details>
      <span v-else class="json-error">Invalid JSON</span>
    </div>
    
    <!-- 日期时间值 -->
    <div v-else-if="isDateTime" class="datetime-value">
      <Icon name="clock" />
      <span class="datetime-text">{{ formattedDateTime }}</span>
      <span class="datetime-relative" :title="displayValue">{{ relativeTime }}</span>
    </div>
    
    <!-- 数字值 -->
    <div v-else-if="isNumber" class="number-value" :class="numberClass">
      <span class="number-text">{{ formattedNumber }}</span>
    </div>
    
    <!-- URL 值 -->
    <div v-else-if="isUrl" class="url-value">
      <Icon name="share-2" />
      <a :href="displayValue" target="_blank" class="url-link">
        {{ truncatedUrl }}
      </a>
    </div>
    
    <!-- 长文本值 -->
    <div v-else-if="isLongText" class="long-text-value">
      <div class="text-preview">{{ textPreview }}</div>
      <button v-if="showExpandButton" @click="toggleExpanded" class="expand-btn">
        <Icon :name="expanded ? 'minus' : 'plus'" />
        {{ expanded ? '收起' : '展开' }}
      </button>
      <div v-if="expanded" class="full-text">{{ displayValue }}</div>
    </div>
    
    <!-- 二进制数据 -->
    <div v-else-if="isBinary" class="binary-value">
      <Icon name="file-text" />
      <span class="binary-info">Binary ({{ binarySize }})</span>
      <button v-if="canDownload" @click="downloadBinary" class="download-btn">
        <Icon name="download" />
        下载
      </button>
    </div>
    
    <!-- 普通文本值 -->
    <span v-else class="text-value">{{ displayValue }}</span>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import Icon from '@/components/common/Icon.vue'

export default {
  name: 'CellValueRenderer',
  components: {
    Icon
  },
  props: {
    value: {
      default: null
    },
    column: {
      type: Object,
      required: true
    },
    dbType: {
      type: String,
      default: 'MySQL'
    },
    maxLength: {
      type: Number,
      default: 100
    }
  },
  setup(props) {
    const expanded = ref(false)
    
    // 计算属性
    const displayValue = computed(() => {
      if (props.value === null || props.value === undefined) return null
      return String(props.value)
    })
    
    const isNull = computed(() => {
      return props.value === null || props.value === undefined
    })
    
    const isEmpty = computed(() => {
      return !isNull.value && displayValue.value === ''
    })
    
    const isBoolean = computed(() => {
      const columnType = props.column.type?.toLowerCase()
      return columnType === 'boolean' || columnType === 'bool' ||
        (typeof props.value === 'boolean') ||
        (displayValue.value === 'true' || displayValue.value === 'false')
    })
    
    const booleanIcon = computed(() => {
      const val = displayValue.value
      return (val === 'true' || val === true) ? 'check' : 'x'
    })
    
    const booleanClass = computed(() => {
      const val = displayValue.value
      return (val === 'true' || val === true) ? 'bool-true' : 'bool-false'
    })
    
    const isJson = computed(() => {
      const columnType = props.column.type?.toLowerCase()
      if (columnType === 'json' || columnType === 'jsonb') return true
      
      if (typeof props.value === 'object') return true
      
      if (typeof props.value === 'string') {
        const str = props.value.trim()
        return (str.startsWith('{') && str.endsWith('}')) ||
               (str.startsWith('[') && str.endsWith(']'))
      }
      
      return false
    })
    
    const formattedJson = computed(() => {
      if (!isJson.value) return null
      
      try {
        const obj = typeof props.value === 'string' 
          ? JSON.parse(props.value)
          : props.value
        return JSON.stringify(obj, null, 2)
      } catch {
        return null
      }
    })
    
    const jsonSummary = computed(() => {
      if (!formattedJson.value) return 'Invalid JSON'
      
      try {
        const obj = typeof props.value === 'string' 
          ? JSON.parse(props.value)
          : props.value
          
        if (Array.isArray(obj)) {
          return `Array (${obj.length} items)`
        } else if (typeof obj === 'object') {
          const keys = Object.keys(obj)
          return `Object (${keys.length} keys)`
        }
        return 'JSON'
      } catch {
        return 'Invalid JSON'
      }
    })
    
    const isDateTime = computed(() => {
      const columnType = props.column.type?.toLowerCase()
      const dateTypes = ['date', 'datetime', 'timestamp', 'time']
      
      if (dateTypes.some(type => columnType?.includes(type))) {
        return true
      }
      
      // 尝试解析日期字符串
      if (typeof props.value === 'string') {
        const date = new Date(props.value)
        return !isNaN(date.getTime()) && props.value.match(/\d{4}-\d{2}-\d{2}/)
      }
      
      return false
    })
    
    const formattedDateTime = computed(() => {
      if (!isDateTime.value) return displayValue.value
      
      try {
        const date = new Date(props.value)
        return date.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      } catch {
        return displayValue.value
      }
    })
    
    const relativeTime = computed(() => {
      if (!isDateTime.value) return ''
      
      try {
        const date = new Date(props.value)
        const now = new Date()
        const diffMs = now - date
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHours / 24)
        
        if (diffMins < 1) return '刚刚'
        if (diffMins < 60) return `${diffMins}分钟前`
        if (diffHours < 24) return `${diffHours}小时前`
        if (diffDays < 30) return `${diffDays}天前`
        return ''
      } catch {
        return ''
      }
    })
    
    const isNumber = computed(() => {
      const columnType = props.column.type?.toLowerCase()
      const numberTypes = ['int', 'integer', 'bigint', 'decimal', 'float', 'double', 'number', 'numeric']
      
      if (numberTypes.some(type => columnType?.includes(type))) {
        return true
      }
      
      return !isNaN(Number(props.value)) && props.value !== '' && props.value !== null
    })
    
    const formattedNumber = computed(() => {
      if (!isNumber.value) return displayValue.value
      
      const num = Number(props.value)
      const columnType = props.column.type?.toLowerCase()
      
      // 整数类型不需要小数点
      if (columnType?.includes('int')) {
        return num.toLocaleString('zh-CN')
      }
      
      // 浮点数保留适当的小数位数
      if (num % 1 === 0) {
        return num.toLocaleString('zh-CN')
      } else {
        return num.toLocaleString('zh-CN', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 6
        })
      }
    })
    
    const numberClass = computed(() => {
      if (!isNumber.value) return ''
      
      const num = Number(props.value)
      if (num > 0) return 'positive'
      if (num < 0) return 'negative'
      return 'zero'
    })
    
    const isUrl = computed(() => {
      if (typeof props.value !== 'string') return false
      
      try {
        new URL(props.value)
        return props.value.startsWith('http://') || props.value.startsWith('https://')
      } catch {
        return false
      }
    })
    
    const truncatedUrl = computed(() => {
      if (!isUrl.value) return displayValue.value
      
      const url = displayValue.value
      if (url.length <= 50) return url
      
      try {
        const urlObj = new URL(url)
        return `${urlObj.hostname}${urlObj.pathname.substring(0, 20)}...`
      } catch {
        return url.substring(0, 50) + '...'
      }
    })
    
    const isLongText = computed(() => {
      return !isNull.value && 
             !isEmpty.value && 
             !isJson.value && 
             !isDateTime.value && 
             !isNumber.value && 
             !isUrl.value &&
             displayValue.value.length > props.maxLength
    })
    
    const textPreview = computed(() => {
      if (!isLongText.value) return displayValue.value
      return displayValue.value.substring(0, props.maxLength) + '...'
    })
    
    const showExpandButton = computed(() => {
      return isLongText.value && displayValue.value.length > props.maxLength
    })
    
    const isBinary = computed(() => {
      const columnType = props.column.type?.toLowerCase()
      return columnType === 'blob' || 
             columnType === 'binary' || 
             columnType === 'varbinary' ||
             (typeof props.value === 'object' && props.value instanceof ArrayBuffer)
    })
    
    const binarySize = computed(() => {
      if (!isBinary.value) return ''
      
      if (props.value instanceof ArrayBuffer) {
        return formatBytes(props.value.byteLength)
      } else if (typeof props.value === 'string') {
        // 假设是base64编码
        return formatBytes(props.value.length * 0.75)
      }
      
      return 'Unknown'
    })
    
    const canDownload = computed(() => {
      return isBinary.value && props.value
    })
    
    const cellClass = computed(() => {
      const classes = [`cell-${props.column.type?.toLowerCase() || 'text'}`]
      
      if (isNull.value) classes.push('is-null')
      if (isEmpty.value) classes.push('is-empty')
      if (isJson.value) classes.push('is-json')
      if (isDateTime.value) classes.push('is-datetime')
      if (isNumber.value) classes.push('is-number')
      if (isUrl.value) classes.push('is-url')
      if (isLongText.value) classes.push('is-long-text')
      if (isBinary.value) classes.push('is-binary')
      
      return classes.join(' ')
    })
    
    // 方法
    const toggleExpanded = () => {
      expanded.value = !expanded.value
    }
    
    const downloadBinary = () => {
      if (!canDownload.value) return
      
      try {
        let blob
        if (props.value instanceof ArrayBuffer) {
          blob = new Blob([props.value])
        } else if (typeof props.value === 'string') {
          // 假设是base64
          const binaryString = atob(props.value)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          blob = new Blob([bytes])
        }
        
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `binary_data_${Date.now()}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (err) {
        console.error('下载失败:', err)
      }
    }
    
    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }
    
    return {
      expanded,
      displayValue,
      isNull,
      isEmpty,
      isBoolean,
      booleanIcon,
      booleanClass,
      isJson,
      formattedJson,
      jsonSummary,
      isDateTime,
      formattedDateTime,
      relativeTime,
      isNumber,
      formattedNumber,
      numberClass,
      isUrl,
      truncatedUrl,
      isLongText,
      textPreview,
      showExpandButton,
      isBinary,
      binarySize,
      canDownload,
      cellClass,
      toggleExpanded,
      downloadBinary
    }
  }
}
</script>

<style lang="scss" scoped>
.cell-value-renderer {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 1.25rem;
  
  .null-value {
    color: #9ca3af;
    font-style: italic;
    font-size: 0.875rem;
  }
  
  .empty-value {
    color: #d1d5db;
    font-style: italic;
    font-size: 0.875rem;
  }
  
  .boolean-value {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    
    .bool-true {
      color: #10b981;
    }
    
    .bool-false {
      color: #ef4444;
    }
  }
  
  .json-value {
    width: 100%;
    
    .json-summary {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      cursor: pointer;
      color: #6366f1;
      font-size: 0.875rem;
      
      &:hover {
        color: #4f46e5;
      }
    }
    
    .json-content {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      line-height: 1.4;
      white-space: pre;
      overflow-x: auto;
      max-height: 200px;
      overflow-y: auto;
    }
    
    .json-error {
      color: #ef4444;
      font-style: italic;
    }
  }
  
  .datetime-value {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-family: 'JetBrains Mono', monospace;
    
    .datetime-text {
      color: #374151;
    }
    
    .datetime-relative {
      font-size: 0.75rem;
      color: #6b7280;
      background: #f3f4f6;
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
    }
  }
  
  .number-value {
    font-family: 'JetBrains Mono', monospace;
    
    &.positive .number-text {
      color: #059669;
    }
    
    &.negative .number-text {
      color: #dc2626;
    }
    
    &.zero .number-text {
      color: #6b7280;
    }
  }
  
  .url-value {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    
    .url-link {
      color: #3b82f6;
      text-decoration: none;
      
      &:hover {
        text-decoration: underline;
      }
    }
  }
  
  .long-text-value {
    width: 100%;
    
    .text-preview {
      line-height: 1.4;
    }
    
    .expand-btn {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin-top: 0.25rem;
      padding: 0.125rem 0.375rem;
      border: 1px solid #d1d5db;
      border-radius: 0.25rem;
      background: white;
      color: #6b7280;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
        background: #f3f4f6;
        border-color: #9ca3af;
      }
    }
    
    .full-text {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      line-height: 1.4;
      white-space: pre-wrap;
      word-wrap: break-word;
      max-height: 200px;
      overflow-y: auto;
    }
  }
  
  .binary-value {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    
    .binary-info {
      color: #6b7280;
      font-size: 0.875rem;
    }
    
    .download-btn {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.125rem 0.375rem;
      border: 1px solid #d1d5db;
      border-radius: 0.25rem;
      background: white;
      color: #6b7280;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
        background: #f3f4f6;
        border-color: #9ca3af;
      }
    }
  }
  
  .text-value {
    word-break: break-word;
    line-height: 1.4;
  }
}

// 根据数据库类型的特殊样式
.cell-mysql {
  &.is-number .number-text {
    color: #00758f;
  }
}

.cell-postgresql {
  &.is-json .json-summary {
    color: #336791;
  }
}

.cell-redis {
  &.is-url .url-link {
    color: #dc2626;
  }
}

.cell-mongodb {
  &.is-json .json-summary {
    color: #47a248;
  }
}
</style>