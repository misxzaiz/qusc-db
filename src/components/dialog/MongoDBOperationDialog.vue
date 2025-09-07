<template>
  <div v-if="visible" class="dialog-overlay" @click="handleOverlayClick">
    <div class="dialog mongodb-dialog" @click.stop>
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
        <!-- 数据库和集合信息显示 -->
        <div class="info-section">
          <div class="info-item">
            <span class="info-label">数据库:</span>
            <span class="info-value">{{ databaseName }}</span>
          </div>
          <div class="info-item" v-if="collectionName">
            <span class="info-label">集合:</span>
            <span class="info-value">{{ collectionName }}</span>
          </div>
        </div>

        <!-- 根据操作类型显示不同内容 -->
        <template v-if="operation === 'collection-info'">
          <div class="field-group">
            <label class="field-label">集合统计信息:</label>
            <div class="stats-container">
              <div class="stats-grid">
                <div class="stats-item">
                  <i class="fas fa-file-alt"></i>
                  <div class="stats-content">
                    <span class="stats-value">{{ collectionStats.documentCount || 0 }}</span>
                    <span class="stats-label">文档数</span>
                  </div>
                </div>
                <div class="stats-item">
                  <i class="fas fa-hdd"></i>
                  <div class="stats-content">
                    <span class="stats-value">{{ formatBytes(collectionStats.size || 0) }}</span>
                    <span class="stats-label">数据大小</span>
                  </div>
                </div>
                <div class="stats-item">
                  <i class="fas fa-sort"></i>
                  <div class="stats-content">
                    <span class="stats-value">{{ collectionStats.indexCount || 0 }}</span>
                    <span class="stats-label">索引数</span>
                  </div>
                </div>
                <div class="stats-item">
                  <i class="fas fa-database"></i>
                  <div class="stats-content">
                    <span class="stats-value">{{ formatBytes(collectionStats.storageSize || 0) }}</span>
                    <span class="stats-label">存储大小</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template v-if="operation === 'find-documents'">
          <div class="field-group">
            <label class="field-label">查询条件 (JSON):</label>
            <textarea 
              v-model="queryFilter" 
              class="field-textarea json-textarea" 
              placeholder='{ "status": "active" }'
              rows="4"
            ></textarea>
          </div>
          <div class="field-group">
            <label class="field-label">投影字段 (可选):</label>
            <textarea 
              v-model="projection" 
              class="field-textarea json-textarea" 
              placeholder='{ "name": 1, "email": 1, "_id": 0 }'
              rows="2"
            ></textarea>
          </div>
          <div class="options-row">
            <div class="field-group">
              <label class="field-label">限制数量:</label>
              <input 
                v-model.number="queryLimit" 
                type="number" 
                class="field-input" 
                min="1" 
                max="1000"
                placeholder="100"
              />
            </div>
            <div class="field-group">
              <label class="field-label">跳过数量:</label>
              <input 
                v-model.number="querySkip" 
                type="number" 
                class="field-input" 
                min="0"
                placeholder="0"
              />
            </div>
          </div>
          <div class="field-group">
            <label class="field-label">排序 (可选):</label>
            <textarea 
              v-model="sortOrder" 
              class="field-textarea json-textarea" 
              placeholder='{ "createdAt": -1, "name": 1 }'
              rows="2"
            ></textarea>
          </div>
        </template>

        <template v-if="operation === 'insert-document'">
          <div class="field-group">
            <label class="field-label">文档内容 (JSON):</label>
            <textarea 
              v-model="documentContent" 
              class="field-textarea json-textarea" 
              placeholder='{ "name": "用户名", "email": "user@example.com", "status": "active" }'
              rows="8"
            ></textarea>
          </div>
          <div class="field-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="insertMany" />
              <span>批量插入 (JSON数组格式)</span>
            </label>
          </div>
        </template>

        <template v-if="operation === 'update-document'">
          <div class="field-group">
            <label class="field-label">查询条件 (JSON):</label>
            <textarea 
              v-model="queryFilter" 
              class="field-textarea json-textarea" 
              placeholder='{ "_id": ObjectId("...") }'
              rows="3"
            ></textarea>
          </div>
          <div class="field-group">
            <label class="field-label">更新内容 (JSON):</label>
            <textarea 
              v-model="updateContent" 
              class="field-textarea json-textarea" 
              placeholder='{ "$set": { "status": "inactive", "updatedAt": new Date() } }'
              rows="6"
            ></textarea>
          </div>
          <div class="field-group">
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="updateMany" />
                <span>更新多个文档</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="upsert" />
                <span>如果不存在则插入 (upsert)</span>
              </label>
            </div>
          </div>
        </template>

        <template v-if="operation === 'delete-document'">
          <div class="field-group">
            <label class="field-label">删除条件 (JSON):</label>
            <textarea 
              v-model="queryFilter" 
              class="field-textarea json-textarea" 
              placeholder='{ "status": "inactive" }'
              rows="4"
            ></textarea>
          </div>
          <div class="field-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="deleteMany" />
              <span>删除多个文档 (谨慎使用)</span>
            </label>
          </div>
          <div v-if="queryFilter" class="warning-message">
            <i class="fas fa-exclamation-triangle"></i>
            <span>请仔细检查删除条件，删除操作不可逆！</span>
          </div>
        </template>

        <template v-if="operation === 'create-index'">
          <div class="field-group">
            <label class="field-label">索引字段 (JSON):</label>
            <textarea 
              v-model="indexFields" 
              class="field-textarea json-textarea" 
              placeholder='{ "email": 1, "status": -1 }'
              rows="3"
            ></textarea>
          </div>
          <div class="field-group">
            <label class="field-label">索引名称 (可选):</label>
            <input 
              v-model="indexName" 
              type="text" 
              class="field-input" 
              placeholder="自动生成或自定义名称"
            />
          </div>
          <div class="field-group">
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="uniqueIndex" />
                <span>唯一索引</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="sparseIndex" />
                <span>稀疏索引 (忽略空值)</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="backgroundIndex" />
                <span>后台创建 (不阻塞其他操作)</span>
              </label>
            </div>
          </div>
        </template>

        <template v-if="operation === 'aggregate'">
          <div class="field-group">
            <label class="field-label">聚合管道 (JSON数组):</label>
            <textarea 
              v-model="aggregationPipeline" 
              class="field-textarea json-textarea" 
              placeholder='[
  { "$match": { "status": "active" } },
  { "$group": { "_id": "$category", "count": { "$sum": 1 } } },
  { "$sort": { "count": -1 } }
]'
              rows="10"
            ></textarea>
          </div>
          <div class="field-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="allowDiskUse" />
              <span>允许使用磁盘 (处理大量数据)</span>
            </label>
          </div>
        </template>

        <template v-if="operation === 'create-collection'">
          <div class="field-group">
            <label class="field-label">集合名称:</label>
            <input 
              v-model="newCollectionName" 
              type="text" 
              class="field-input" 
              placeholder="输入新集合名称"
            />
          </div>
          <div class="field-group">
            <label class="field-label">集合选项 (JSON, 可选):</label>
            <textarea 
              v-model="collectionOptions" 
              class="field-textarea json-textarea" 
              placeholder='{ 
  "capped": false,
  "size": 1000000,
  "max": 1000,
  "validator": {
    "$jsonSchema": {
      "bsonType": "object",
      "required": ["name", "email"],
      "properties": {
        "name": { "bsonType": "string" },
        "email": { "bsonType": "string" }
      }
    }
  }
}'
              rows="8"
            ></textarea>
          </div>
        </template>

        <!-- 错误显示 -->
        <div v-if="error" class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          {{ error }}
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-message">
          <i class="fas fa-spinner fa-spin"></i>
          正在处理...
        </div>
      </div>
      
      <div class="dialog-footer">
        <button class="btn btn-secondary" @click="handleCancel">
          取消
        </button>
        <button 
          class="btn btn-primary" 
          @click="handleConfirm"
          :disabled="!canConfirm"
        >
          <i class="fas fa-check"></i>
          确定
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  operation: {
    type: String,
    required: true
  },
  connectionId: {
    type: String,
    required: true
  },
  databaseName: {
    type: String,
    required: true
  },
  collectionName: {
    type: String,
    default: ''
  },
  context: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['confirm', 'cancel', 'update:visible'])

// 状态数据
const loading = ref(false)
const error = ref('')
const collectionStats = ref({})

// 查询相关
const queryFilter = ref('{}')
const projection = ref('')
const queryLimit = ref(100)
const querySkip = ref(0)
const sortOrder = ref('')

// 文档操作相关
const documentContent = ref('')
const updateContent = ref('')
const insertMany = ref(false)
const updateMany = ref(false)
const upsert = ref(false)
const deleteMany = ref(false)

// 索引相关
const indexFields = ref('')
const indexName = ref('')
const uniqueIndex = ref(false)
const sparseIndex = ref(false)
const backgroundIndex = ref(true)

// 聚合相关
const aggregationPipeline = ref('')
const allowDiskUse = ref(false)

// 集合创建相关
const newCollectionName = ref('')
const collectionOptions = ref('')

// 计算属性
const operationIcon = computed(() => {
  const iconMap = {
    'collection-info': 'fas fa-info-circle',
    'find-documents': 'fas fa-search',
    'insert-document': 'fas fa-plus',
    'update-document': 'fas fa-edit',
    'delete-document': 'fas fa-trash',
    'create-index': 'fas fa-sort',
    'aggregate': 'fas fa-chart-bar',
    'create-collection': 'fas fa-layer-group',
    'database-stats': 'fas fa-database'
  }
  return iconMap[props.operation] || 'fas fa-leaf'
})

const operationTitle = computed(() => {
  const titleMap = {
    'collection-info': '集合信息',
    'find-documents': '查询文档',
    'insert-document': '插入文档',
    'update-document': '更新文档',
    'delete-document': '删除文档',
    'create-index': '创建索引',
    'aggregate': '聚合查询',
    'create-collection': '创建集合',
    'database-stats': '数据库统计'
  }
  return titleMap[props.operation] || 'MongoDB操作'
})

const canConfirm = computed(() => {
  if (props.operation === 'find-documents') {
    return isValidJSON(queryFilter.value)
  }
  if (props.operation === 'insert-document') {
    return documentContent.value.trim() && isValidJSON(documentContent.value)
  }
  if (props.operation === 'update-document') {
    return isValidJSON(queryFilter.value) && isValidJSON(updateContent.value)
  }
  if (props.operation === 'delete-document') {
    return isValidJSON(queryFilter.value)
  }
  if (props.operation === 'create-index') {
    return indexFields.value.trim() && isValidJSON(indexFields.value)
  }
  if (props.operation === 'aggregate') {
    return aggregationPipeline.value.trim() && isValidJSON(aggregationPipeline.value)
  }
  if (props.operation === 'create-collection') {
    return newCollectionName.value.trim()
  }
  return true
})

// 方法
function isValidJSON(str) {
  if (!str || str.trim() === '') return false
  try {
    JSON.parse(str)
    return true
  } catch (e) {
    return false
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function handleOverlayClick() {
  handleCancel()
}

function handleCancel() {
  emit('cancel')
  emit('update:visible', false)
}

function handleConfirm() {
  const data = {
    operation: props.operation,
    connectionId: props.connectionId,
    databaseName: props.databaseName,
    collectionName: props.collectionName
  }

  // 根据操作类型添加特定数据
  switch (props.operation) {
    case 'find-documents':
      data.filter = queryFilter.value
      data.projection = projection.value
      data.limit = queryLimit.value
      data.skip = querySkip.value
      data.sort = sortOrder.value
      break
    case 'insert-document':
      data.document = documentContent.value
      data.insertMany = insertMany.value
      break
    case 'update-document':
      data.filter = queryFilter.value
      data.update = updateContent.value
      data.updateMany = updateMany.value
      data.upsert = upsert.value
      break
    case 'delete-document':
      data.filter = queryFilter.value
      data.deleteMany = deleteMany.value
      break
    case 'create-index':
      data.indexFields = indexFields.value
      data.indexName = indexName.value
      data.unique = uniqueIndex.value
      data.sparse = sparseIndex.value
      data.background = backgroundIndex.value
      break
    case 'aggregate':
      data.pipeline = aggregationPipeline.value
      data.allowDiskUse = allowDiskUse.value
      break
    case 'create-collection':
      data.collectionName = newCollectionName.value
      data.options = collectionOptions.value
      break
  }

  emit('confirm', data)
  emit('update:visible', false)
}

async function loadCollectionStats() {
  if (props.operation !== 'collection-info' || !props.collectionName) return

  loading.value = true
  error.value = ''

  try {
    // 这里应该调用实际的API获取集合统计
    // 暂时使用模拟数据
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    collectionStats.value = {
      documentCount: 1250,
      size: 2048576,
      indexCount: 5,
      storageSize: 4194304
    }

  } catch (err) {
    error.value = err.message || '获取集合信息失败'
    console.error('MongoDB 集合信息获取失败:', err)
  } finally {
    loading.value = false
  }
}

// 监听props变化
watch(() => props.visible, (newVal) => {
  if (newVal && props.operation === 'collection-info') {
    nextTick(() => {
      loadCollectionStats()
    })
  }
})

// 监听operation变化，重置状态
watch(() => props.operation, () => {
  // 重置所有状态
  error.value = ''
  collectionStats.value = {}
  
  // 查询相关
  queryFilter.value = '{}'
  projection.value = ''
  queryLimit.value = 100
  querySkip.value = 0
  sortOrder.value = ''
  
  // 文档操作相关
  documentContent.value = ''
  updateContent.value = ''
  insertMany.value = false
  updateMany.value = false
  upsert.value = false
  deleteMany.value = false
  
  // 索引相关
  indexFields.value = ''
  indexName.value = ''
  uniqueIndex.value = false
  sparseIndex.value = false
  backgroundIndex.value = true
  
  // 聚合相关
  aggregationPipeline.value = ''
  allowDiskUse.value = false
  
  // 集合创建相关
  newCollectionName.value = ''
  collectionOptions.value = ''
})
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(2px);
}

.mongodb-dialog {
  min-width: 600px;
  max-width: 900px;
  max-height: 90vh;
}

.dialog {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: linear-gradient(135deg, #4db33d 0%, #3e8b2e 100%);
  color: white;
}

.dialog-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
}

.operation-icon {
  margin-right: 8px;
  font-size: 14px;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.dialog-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.info-section {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  margin-bottom: 8px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-label {
  font-weight: 500;
  color: #4a5568;
  min-width: 80px;
}

.info-value {
  color: #2d3748;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
}

.field-group {
  margin-bottom: 20px;
}

.field-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

.field-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field-input:focus {
  outline: none;
  border-color: #4db33d;
  box-shadow: 0 0 0 3px rgba(77, 179, 61, 0.1);
}

.field-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.json-textarea {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  font-size: 13px;
}

.field-textarea:focus {
  outline: none;
  border-color: #4db33d;
  box-shadow: 0 0 0 3px rgba(77, 179, 61, 0.1);
}

.options-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #4db33d;
}

.stats-container {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
}

.stats-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.stats-item i {
  font-size: 20px;
  color: #4db33d;
  width: 24px;
  text-align: center;
}

.stats-content {
  display: flex;
  flex-direction: column;
}

.stats-value {
  font-size: 18px;
  font-weight: 600;
  color: #2d3748;
  line-height: 1;
}

.stats-label {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.error-message {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 12px 16px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}

.warning-message {
  background: #fffbeb;
  border: 1px solid #fed7aa;
  color: #d97706;
  padding: 12px 16px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}

.loading-message {
  background: #f0f7ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
  padding: 12px 16px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}

.dialog-footer {
  padding: 16px 24px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-secondary {
  background: #e5e7eb;
  color: #374151;
}

.btn-secondary:hover {
  background: #d1d5db;
}

.btn-primary {
  background: #4db33d;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #3e8b2e;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 暗色主题支持 */
[data-theme="dark"] .dialog {
  background: #1e293b;
  color: #e2e8f0;
}

[data-theme="dark"] .info-section {
  background: #334155;
  border-color: #475569;
}

[data-theme="dark"] .stats-container {
  background: #334155;
  border-color: #475569;
}

[data-theme="dark"] .stats-item {
  background: #1e293b;
  border-color: #475569;
}
</style>