<template>
  <div class="adaptive-query-viewer" :class="`db-${currentDbType.toLowerCase()}`">
    <!-- 查看器头部 -->
    <div class="viewer-header" v-if="!hideHeader">
      <div class="query-info">
        <div class="db-indicator" :class="`db-${currentDbType.toLowerCase()}`">
          <Icon :name="getDbIcon(currentDbType)" />
          <span>{{ currentDbType }}</span>
        </div>
        
        <div class="display-mode" v-if="uiConfig">
          <Icon :name="getDisplayModeIcon(uiConfig.displayMode)" />
          <span>{{ getDisplayModeText(uiConfig.displayMode) }}</span>
        </div>
        
        <div class="execution-info" v-if="queryResult">
          <span class="success-indicator" :class="{ success: isSuccessful, error: !isSuccessful }">
            {{ isSuccessful ? '✅' : '❌' }}
          </span>
          <span>{{ getResultSummary() }}</span>
        </div>
      </div>
      
      <div class="viewer-actions">
        <!-- 视图切换按钮（如果支持多种视图） -->
        <div v-if="availableViewModes.length > 1" class="view-modes">
          <button 
            v-for="mode in availableViewModes"
            :key="mode"
            class="view-mode-btn"
            :class="{ active: currentViewMode === mode }"
            @click="switchViewMode(mode)"
            :title="getViewModeTitle(mode)"
          >
            <Icon :name="getViewModeIcon(mode)" />
          </button>
        </div>
        
        <!-- 通用操作按钮 -->
        <button 
          class="action-btn"
          @click="refreshQuery"
          :disabled="isLoading"
          title="刷新查询"
        >
          <Icon name="refresh" :class="{ spinning: isLoading }" />
        </button>
        
        <button 
          class="action-btn"
          @click="exportResults"
          :disabled="!hasData"
          title="导出结果"
        >
          <Icon name="download" />
        </button>
        
        <!-- 数据库特定操作 -->
        <template v-if="uiConfig && uiConfig.supportedOperations">
          <button 
            v-for="operation in visibleOperations"
            :key="operation"
            class="operation-btn"
            :class="`op-${operation.toLowerCase()}`"
            @click="executeOperation(operation)"
            :title="getOperationTitle(operation)"
          >
            <Icon :name="getOperationIcon(operation)" />
          </button>
        </template>
      </div>
    </div>

    <!-- 主要内容区 -->
    <div class="viewer-content" :style="viewerStyles">
      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner">
          <Icon name="loading" class="spinning" />
        </div>
        <div class="loading-text">{{ loadingText }}</div>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="error-state">
        <div class="error-icon">
          <Icon name="alert-circle" />
        </div>
        <div class="error-content">
          <h3 class="error-title">查询执行失败</h3>
          <div class="error-message">{{ error }}</div>
          <div class="error-actions">
            <button class="btn btn-primary" @click="retryQuery">
              <Icon name="refresh" />
              重试
            </button>
            <button class="btn btn-secondary" @click="explainError">
              <Icon name="help-circle" />
              AI解释错误
            </button>
          </div>
        </div>
      </div>

      <!-- 空结果状态 -->
      <div v-else-if="!hasData" class="empty-state">
        <div class="empty-icon">
          <Icon :name="getEmptyStateIcon()" />
        </div>
        <div class="empty-content">
          <h3 class="empty-title">{{ getEmptyStateTitle() }}</h3>
          <div class="empty-message">{{ getEmptyStateMessage() }}</div>
          <div class="empty-actions" v-if="showEmptyActions">
            <button class="btn btn-primary" @click="createSampleData">
              <Icon name="plus" />
              创建示例数据
            </button>
          </div>
        </div>
      </div>

      <!-- 数据渲染区 -->
      <div v-else class="data-renderer">
        <!-- 关系型数据库渲染器 -->
        <RelationalTableRenderer
          v-if="isRelationalDB"
          :query-data="enhancedQueryResult"
          :db-type="currentDbType"
          :view-mode="currentViewMode"
          :sortable="true"
          :editable="allowEditing"
          @sort-change="handleSortChange"
          @cell-update="handleCellUpdate"
          @row-select="handleRowSelect"
          @load-more="handleLoadMore"
        />

        <!-- Redis渲染器 -->
        <RedisRenderer
          v-else-if="currentDbType === 'Redis'"
          :query-data="enhancedQueryResult"
          :connection-id="connectionId"
          :editable="allowEditing"
          @value-update="handleValueUpdate"
          @key-delete="handleKeyDelete"
          @ttl-update="handleTTLUpdate"
          @refresh-database="refreshQuery"
          @monitor-toggle="handleMonitorToggle"
        />

        <!-- MongoDB渲染器 -->
        <MongoDBRenderer
          v-else-if="currentDbType === 'MongoDB'"
          :query-data="enhancedQueryResult"
          :connection-id="connectionId"
          :editable="allowEditing"
          @document-update="handleDocumentUpdate"
          @document-delete="handleDocumentDelete"
          @field-update="handleFieldUpdate"
          @pipeline-execute="handlePipelineExecute"
          @export-documents="exportResults"
        />

        <!-- 通用JSON渲染器（后备方案） -->
        <JsonRenderer
          v-else
          :data="queryResult"
          :editable="allowEditing"
          @data-update="handleDataUpdate"
        />
      </div>
    </div>

    <!-- 状态栏 -->
    <div class="viewer-statusbar" v-if="showStatusbar">
      <div class="status-info">
        <span v-if="dataCount !== null">{{ formatDataCount() }}</span>
        <span v-if="executionTime !== null">执行时间: {{ executionTime }}ms</span>
        <span v-if="memoryUsage">内存: {{ formatBytes(memoryUsage) }}</span>
      </div>
      <div class="theme-indicator" v-if="uiConfig && uiConfig.theme">
        <div 
          class="theme-color"
          :style="{ backgroundColor: uiConfig.theme.primaryColor }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import Icon from '@/components/common/Icon.vue'
import RelationalTableRenderer from './RelationalTableRenderer.vue'
import RedisRenderer from './RedisRenderer.vue'
import MongoDBRenderer from './MongoDBRenderer.vue'
import JsonRenderer from './JsonRenderer.vue'

export default {
  name: 'AdaptiveQueryViewer',
  components: {
    Icon,
    RelationalTableRenderer,
    RedisRenderer,
    MongoDBRenderer,
    JsonRenderer
  },
  props: {
    // 查询结果数据
    queryResult: {
      type: Object,
      default: null
    },
    // 数据库类型
    dbType: {
      type: String,
      required: true
    },
    // 连接ID
    connectionId: {
      type: String,
      required: true
    },
    // UI选项
    hideHeader: {
      type: Boolean,
      default: false
    },
    showStatusbar: {
      type: Boolean,
      default: true
    },
    allowEditing: {
      type: Boolean,
      default: false
    },
    showEmptyActions: {
      type: Boolean,
      default: true
    },
    // 自定义样式
    height: {
      type: String,
      default: '100%'
    }
  },
  emits: [
    'query-refresh',
    'query-retry', 
    'error-explain',
    'data-export',
    'data-update',
    'operation-execute'
  ],
  setup(props, { emit }) {
    // 响应式数据
    const isLoading = ref(false)
    const loadingText = ref('正在执行查询...')
    const error = ref(null)
    const currentViewMode = ref('default')
    const uiConfig = ref(null)
    const enhancedQueryResult = ref(null)

    // 计算属性
    const currentDbType = computed(() => props.dbType)
    
    const isSuccessful = computed(() => {
      return !props.queryResult?.error && !error.value
    })

    const hasData = computed(() => {
      if (!props.queryResult) return false
      const data = enhancedQueryResult.value?.data || props.queryResult
      
      if (data.columns && data.rows) {
        return data.rows.length > 0
      } else if (data.entries) {
        return data.entries.length > 0
      } else if (data.documents) {
        return data.documents.length > 0
      }
      
      return false
    })

    const dataCount = computed(() => {
      if (!hasData.value) return null
      const data = enhancedQueryResult.value?.data || props.queryResult
      
      if (data.rows) return data.rows.length
      if (data.entries) return data.entries.length
      if (data.documents) return data.documents.length
      
      return null
    })

    const executionTime = computed(() => {
      return enhancedQueryResult.value?.executionTime || props.queryResult?.executionTime
    })

    const memoryUsage = computed(() => {
      return enhancedQueryResult.value?.memoryUsage
    })

    const isRelationalDB = computed(() => {
      return ['MySQL', 'PostgreSQL', 'SQLite'].includes(currentDbType.value)
    })

    const availableViewModes = computed(() => {
      if (!uiConfig.value) return ['default']
      
      const modes = ['default']
      if (currentDbType.value === 'MongoDB') {
        modes.push('json', 'table')
      } else if (currentDbType.value === 'Redis') {
        modes.push('tree', 'raw')
      }
      
      return modes
    })

    const visibleOperations = computed(() => {
      if (!uiConfig.value?.supportedOperations) return []
      return uiConfig.value.supportedOperations.slice(0, 4) // 显示前4个操作
    })

    const viewerStyles = computed(() => ({
      height: props.height,
      '--primary-color': uiConfig.value?.theme?.primaryColor || '#3b82f6',
      '--accent-color': uiConfig.value?.theme?.accentColor || '#ffffff'
    }))

    // 方法
    const getDbIcon = (dbType) => {
      const icons = {
        MySQL: 'database',
        PostgreSQL: 'database',
        Redis: 'server',
        MongoDB: 'layers',
        SQLite: 'database'
      }
      return icons[dbType] || 'database'
    }

    const getDisplayModeIcon = (mode) => {
      const icons = {
        Table: 'table',
        KeyValue: 'key',
        Document: 'file-text',
        Graph: 'share-2',
        TimeSeries: 'trending-up'
      }
      return icons[mode] || 'grid'
    }

    const getDisplayModeText = (mode) => {
      const texts = {
        Table: '表格视图',
        KeyValue: '键值对',
        Document: '文档视图',
        Graph: '图形视图',
        TimeSeries: '时序图'
      }
      return texts[mode] || mode
    }

    const getResultSummary = () => {
      if (!hasData.value) return '无结果'
      
      const count = dataCount.value
      if (currentDbType.value === 'Redis') {
        return `${count} 个键`
      } else if (currentDbType.value === 'MongoDB') {
        return `${count} 个文档`
      } else {
        return `${count} 行数据`
      }
    }

    const getEmptyStateIcon = () => {
      const icons = {
        MySQL: 'database',
        PostgreSQL: 'database', 
        Redis: 'key',
        MongoDB: 'file-text',
        SQLite: 'database'
      }
      return icons[currentDbType.value] || 'search'
    }

    const getEmptyStateTitle = () => {
      if (currentDbType.value === 'Redis') return '未找到匹配的键'
      if (currentDbType.value === 'MongoDB') return '集合为空'
      return '查询无结果'
    }

    const getEmptyStateMessage = () => {
      if (currentDbType.value === 'Redis') {
        return '数据库中没有匹配的键，或键已过期'
      } else if (currentDbType.value === 'MongoDB') {
        return '集合中没有文档，或查询条件没有匹配项'
      } else {
        return '表中没有数据，或WHERE条件没有匹配项'
      }
    }

    const getViewModeIcon = (mode) => {
      const icons = {
        default: 'eye',
        json: 'code',
        table: 'table',
        tree: 'git-branch',
        raw: 'file-text'
      }
      return icons[mode] || 'eye'
    }

    const getViewModeTitle = (mode) => {
      const titles = {
        default: '默认视图',
        json: 'JSON视图',
        table: '表格视图',
        tree: '树形视图',
        raw: '原始视图'
      }
      return titles[mode] || mode
    }

    const getOperationIcon = (operation) => {
      const icons = {
        Select: 'search',
        Insert: 'plus',
        Update: 'edit',
        Delete: 'trash',
        Get: 'download',
        Set: 'upload',
        Keys: 'list',
        Monitor: 'activity',
        Find: 'search',
        InsertOne: 'plus-square',
        UpdateOne: 'edit-3',
        DeleteOne: 'minus-square'
      }
      return icons[operation] || 'zap'
    }

    const getOperationTitle = (operation) => {
      const titles = {
        Select: '查询数据',
        Insert: '插入数据',
        Update: '更新数据',
        Delete: '删除数据',
        Get: '获取键值',
        Set: '设置键值',
        Keys: '列出键名',
        Monitor: '监控命令',
        Find: '查找文档',
        InsertOne: '插入文档',
        UpdateOne: '更新文档',
        DeleteOne: '删除文档'
      }
      return titles[operation] || operation
    }

    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    const formatDataCount = () => {
      const count = dataCount.value
      if (currentDbType.value === 'Redis') {
        return `${count} 键`
      } else if (currentDbType.value === 'MongoDB') {
        return `${count} 文档`
      } else {
        return `${count} 行`
      }
    }

    // 加载UI配置
    const loadUIConfig = async () => {
      try {
        // 检查是否在Tauri环境中
        const isTauriEnvironment = typeof window !== 'undefined' &&
          window.__TAURI__ &&
          typeof window.__TAURI__.core?.invoke === 'function'

        if (isTauriEnvironment) {
          const config = await window.__TAURI__.core.invoke('get_ui_config', {
            connectionId: props.connectionId,
            dbType: currentDbType.value
          })
          uiConfig.value = config
        }
      } catch (err) {
        console.warn('Failed to load UI config:', err)
      }
    }

    // 获取增强查询结果
    const getEnhancedResult = async () => {
      if (!props.queryResult) return

      try {
        // 如果已经是增强结果，直接使用
        if (props.queryResult.dbType && props.queryResult.uiConfig) {
          enhancedQueryResult.value = props.queryResult
          return
        }

        // 检查是否在Tauri环境中
        const isTauriEnvironment = typeof window !== 'undefined' &&
          window.__TAURI__ &&
          typeof window.__TAURI__.core?.invoke === 'function'

        if (isTauriEnvironment) {
          // 尝试获取增强结果
          const enhanced = await window.__TAURI__.core.invoke('execute_query_enhanced', {
            connectionId: props.connectionId,
            query: props.queryResult.query || 'SELECT 1' // 使用实际查询或默认查询
          })
          enhancedQueryResult.value = enhanced
        } else {
          enhancedQueryResult.value = null
        }
      } catch (err) {
        console.warn('Failed to get enhanced result, using legacy:', err)
        enhancedQueryResult.value = null
      }
    }

    // 事件处理方法
    const switchViewMode = (mode) => {
      currentViewMode.value = mode
    }

    const refreshQuery = () => {
      emit('query-refresh')
    }

    const retryQuery = () => {
      error.value = null
      emit('query-retry')
    }

    const explainError = () => {
      emit('error-explain', error.value)
    }

    const exportResults = () => {
      emit('data-export', {
        data: enhancedQueryResult.value || props.queryResult,
        format: 'json' // 默认格式
      })
    }

    const createSampleData = () => {
      // 创建示例数据的逻辑
      console.log('Create sample data for', currentDbType.value)
    }

    const executeOperation = (operation) => {
      emit('operation-execute', {
        operation,
        connectionId: props.connectionId,
        dbType: currentDbType.value
      })
    }

    // 数据更新事件处理
    const handleSortChange = (sortInfo) => {
      console.log('Sort change:', sortInfo)
    }

    const handleCellUpdate = (updateInfo) => {
      emit('data-update', {
        type: 'cell-update',
        ...updateInfo
      })
    }

    const handleRowSelect = (selectedRows) => {
      console.log('Row select:', selectedRows)
    }

    const handleLoadMore = () => {
      console.log('Load more data')
    }

    const handleValueUpdate = (updateInfo) => {
      emit('data-update', {
        type: 'redis-value-update',
        ...updateInfo
      })
    }

    const handleKeyDelete = (keys) => {
      emit('data-update', {
        type: 'redis-key-delete',
        keys
      })
    }

    const handleTTLUpdate = (ttlInfo) => {
      emit('data-update', {
        type: 'redis-ttl-update',
        ...ttlInfo
      })
    }

    const handleMonitorToggle = (enabled) => {
      console.log('Redis monitoring:', enabled)
    }

    const handleDocumentUpdate = (docInfo) => {
      emit('data-update', {
        type: 'mongodb-document-update',
        ...docInfo
      })
    }

    const handleDocumentDelete = (indices) => {
      emit('data-update', {
        type: 'mongodb-document-delete',
        indices
      })
    }

    const handleFieldUpdate = (fieldInfo) => {
      emit('data-update', {
        type: 'mongodb-field-update',
        ...fieldInfo
      })
    }

    const handlePipelineExecute = (pipeline) => {
      emit('operation-execute', {
        operation: 'aggregate',
        pipeline,
        connectionId: props.connectionId,
        dbType: 'MongoDB'
      })
    }

    const handleDataUpdate = (data) => {
      emit('data-update', {
        type: 'generic-update',
        data
      })
    }

    // 监听props变化
    watch(() => props.queryResult, async () => {
      await getEnhancedResult()
    }, { immediate: true })

    watch(() => props.connectionId, async () => {
      await loadUIConfig()
    }, { immediate: true })

    onMounted(async () => {
      await loadUIConfig()
      await getEnhancedResult()
    })

    return {
      // reactive data
      isLoading,
      loadingText,
      error,
      currentViewMode,
      uiConfig,
      enhancedQueryResult,
      // computed
      currentDbType,
      isSuccessful,
      hasData,
      dataCount,
      executionTime,
      memoryUsage,
      isRelationalDB,
      availableViewModes,
      visibleOperations,
      viewerStyles,
      // methods
      getDbIcon,
      getDisplayModeIcon,
      getDisplayModeText,
      getResultSummary,
      getEmptyStateIcon,
      getEmptyStateTitle,
      getEmptyStateMessage,
      getViewModeIcon,
      getViewModeTitle,
      getOperationIcon,
      getOperationTitle,
      formatBytes,
      formatDataCount,
      switchViewMode,
      refreshQuery,
      retryQuery,
      explainError,
      exportResults,
      createSampleData,
      executeOperation,
      // event handlers
      handleSortChange,
      handleCellUpdate,
      handleRowSelect,
      handleLoadMore,
      handleValueUpdate,
      handleKeyDelete,
      handleTTLUpdate,
      handleMonitorToggle,
      handleDocumentUpdate,
      handleDocumentDelete,
      handleFieldUpdate,
      handlePipelineExecute,
      handleDataUpdate
    }
  }
}
</script>

<style lang="scss" scoped>
.adaptive-query-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  background: #ffffff;
  overflow: hidden;
  
  // 数据库特定主题
  &.db-mysql {
    --db-primary: #00758f;
    --db-accent: #f29111;
    border-color: rgba(0, 117, 143, 0.2);
  }
  
  &.db-postgresql {
    --db-primary: #336791;
    --db-accent: #ffffff;
    border-color: rgba(51, 103, 145, 0.2);
  }
  
  &.db-redis {
    --db-primary: #dc2626;
    --db-accent: #ffffff;
    border-color: rgba(220, 38, 38, 0.2);
  }
  
  &.db-mongodb {
    --db-primary: #47a248;
    --db-accent: #ffffff;
    border-color: rgba(71, 162, 72, 0.2);
  }
  
  &.db-sqlite {
    --db-primary: #003b57;
    --db-accent: #ffffff;
    border-color: rgba(0, 59, 87, 0.2);
  }
}

.viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  
  .query-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    
    .db-indicator {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      font-weight: 600;
      
      &.db-mysql { background: rgba(0, 117, 143, 0.1); color: #00758f; }
      &.db-postgresql { background: rgba(51, 103, 145, 0.1); color: #336791; }
      &.db-redis { background: rgba(220, 38, 38, 0.1); color: #dc2626; }
      &.db-mongodb { background: rgba(71, 162, 72, 0.1); color: #47a248; }
      &.db-sqlite { background: rgba(0, 59, 87, 0.1); color: #003b57; }
    }
    
    .display-mode {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.875rem;
      color: #64748b;
    }
    
    .execution-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      
      .success-indicator {
        &.success { color: #10b981; }
        &.error { color: #ef4444; }
      }
    }
  }
  
  .viewer-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    
    .view-modes {
      display: flex;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      overflow: hidden;
      
      .view-mode-btn {
        padding: 0.375rem 0.5rem;
        border: none;
        background: #ffffff;
        color: #6b7280;
        cursor: pointer;
        transition: all 0.2s;
        border-right: 1px solid #d1d5db;
        
        &:last-child {
          border-right: none;
        }
        
        &:hover {
          background: #f3f4f6;
          color: #374151;
        }
        
        &.active {
          background: var(--db-primary);
          color: white;
        }
      }
    }
    
    .action-btn, .operation-btn {
      padding: 0.375rem 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      background: #ffffff;
      color: #6b7280;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover:not(:disabled) {
        background: #f3f4f6;
        border-color: #9ca3af;
        color: #374151;
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .spinning {
        animation: spin 1s linear infinite;
      }
    }
    
    .operation-btn {
      &.op-select { &:hover { color: #3b82f6; border-color: #3b82f6; } }
      &.op-insert { &:hover { color: #10b981; border-color: #10b981; } }
      &.op-update { &:hover { color: #f59e0b; border-color: #f59e0b; } }
      &.op-delete { &:hover { color: #ef4444; border-color: #ef4444; } }
    }
  }
}

.viewer-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.loading-state, .error-state, .empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 2rem;
  text-align: center;
}

.loading-state {
  .loading-spinner {
    font-size: 2rem;
    margin-bottom: 1rem;
    color: var(--db-primary);
    
    .spinning {
      animation: spin 1s linear infinite;
    }
  }
  
  .loading-text {
    color: #6b7280;
    font-size: 0.875rem;
  }
}

.error-state {
  .error-icon {
    font-size: 3rem;
    color: #ef4444;
    margin-bottom: 1rem;
  }
  
  .error-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }
  
  .error-message {
    color: #6b7280;
    margin-bottom: 1.5rem;
    max-width: 500px;
    word-wrap: break-word;
  }
  
  .error-actions {
    display: flex;
    gap: 0.5rem;
  }
}

.empty-state {
  .empty-icon {
    font-size: 3rem;
    color: #9ca3af;
    margin-bottom: 1rem;
  }
  
  .empty-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }
  
  .empty-message {
    color: #6b7280;
    margin-bottom: 1.5rem;
    max-width: 400px;
  }
}

.data-renderer {
  height: 100%;
  overflow: hidden;
}

.viewer-statusbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  font-size: 0.75rem;
  color: #64748b;
  
  .status-info {
    display: flex;
    gap: 1rem;
  }
  
  .theme-indicator {
    display: flex;
    align-items: center;
    
    .theme-color {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 1px solid #d1d5db;
    }
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>