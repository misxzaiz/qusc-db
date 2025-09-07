<template>
  <div v-if="visible" class="info-dialog-overlay" @click="handleOverlayClick">
    <div class="info-dialog" @click.stop>
      <div class="info-dialog-header">
        <h3 class="info-dialog-title">
          <i class="fas fa-info-circle"></i>
          {{ title }}
        </h3>
        <button class="close-btn" @click="handleClose">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="info-dialog-body">
        <div v-if="loading" class="loading-state">
          <i class="fas fa-spinner fa-spin"></i>
          <p>正在获取信息...</p>
        </div>
        
        <div v-else-if="error" class="error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>{{ error }}</p>
          <button @click="$emit('retry')" class="retry-btn">重试</button>
        </div>
        
        <div v-else class="info-content">
          <div class="info-section" v-for="section in parsedData" :key="section.title">
            <h4 class="section-title">{{ section.title }}</h4>
            <div class="section-content">
              <div v-if="section.type === 'keyvalue'" class="key-value-pairs">
                <div v-for="item in section.data" :key="item.key" class="key-value-item">
                  <span class="key">{{ item.key }}:</span>
                  <span class="value">{{ item.value }}</span>
                </div>
              </div>
              <div v-else-if="section.type === 'list'" class="list-content">
                <ul>
                  <li v-for="item in section.data" :key="item">{{ item }}</li>
                </ul>
              </div>
              <div v-else class="raw-content">
                <pre>{{ section.data }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="info-dialog-footer">
        <button class="btn btn-primary" @click="handleClose">
          <i class="fas fa-check"></i>
          确定
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
  title: {
    type: String,
    default: '信息'
  },
  data: {
    type: Object,
    default: () => ({})
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'retry', 'update:visible'])

// 解析数据为可显示的格式
const parsedData = computed(() => {
  if (!props.data || !props.data.rows) return []
  
  const sections = []
  
  // Redis INFO 命令返回的数据通常是文本格式
  if (props.data.rows.length > 0) {
    const infoText = props.data.rows[0][0] || ''
    const lines = infoText.split('\n')
    
    let currentSection = null
    
    lines.forEach(line => {
      line = line.trim()
      if (!line) return
      
      // 检查是否是节标题 (以 # 开头)
      if (line.startsWith('#')) {
        if (currentSection) {
          sections.push(currentSection)
        }
        currentSection = {
          title: line.substring(1).trim(),
          type: 'keyvalue',
          data: []
        }
      } else if (currentSection && line.includes(':')) {
        // 键值对数据
        const [key, ...valueParts] = line.split(':')
        const value = valueParts.join(':').trim()
        currentSection.data.push({
          key: key.trim(),
          value: value
        })
      }
    })
    
    if (currentSection) {
      sections.push(currentSection)
    }
  }
  
  return sections
})

function handleOverlayClick() {
  handleClose()
}

function handleClose() {
  emit('update:visible', false)
  emit('close')
}
</script>

<style scoped>
.info-dialog-overlay {
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

.info-dialog {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  min-width: 600px;
  max-width: 800px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.info-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
}

.info-dialog-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
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

.info-dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
  color: #666;
}

.loading-state i, .error-state i {
  font-size: 32px;
  margin-bottom: 16px;
}

.loading-state i {
  color: #4a90e2;
}

.error-state i {
  color: #f44336;
}

.retry-btn {
  margin-top: 16px;
  padding: 8px 16px;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: #357abd;
}

.info-content {
  max-height: 60vh;
  overflow-y: auto;
}

.info-section {
  margin-bottom: 24px;
}

.section-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  padding-bottom: 6px;
  border-bottom: 2px solid #4a90e2;
}

.section-content {
  background: #f8f9fa;
  border-radius: 4px;
  padding: 12px;
}

.key-value-pairs {
  display: grid;
  gap: 8px;
}

.key-value-item {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 12px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.key {
  font-weight: 600;
  color: #555;
}

.value {
  color: #333;
  word-break: break-word;
}

.list-content ul {
  margin: 0;
  padding-left: 20px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.raw-content pre {
  margin: 0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-word;
}

.info-dialog-footer {
  padding: 16px 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
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

.btn-primary {
  background: #4a90e2;
  color: white;
  border-color: #4a90e2;
}

.btn-primary:hover {
  background: #357abd;
  border-color: #357abd;
}
</style>