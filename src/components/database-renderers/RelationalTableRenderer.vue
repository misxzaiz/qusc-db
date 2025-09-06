<template>
  <div class="relational-table-renderer">
    <!-- 表格工具栏 -->
    <div class="table-toolbar" v-if="!hideToolbar">
      <div class="toolbar-left">
        <div class="result-info">
          <Icon name="table" />
          <span>{{ totalRows }} 行数据</span>
        </div>
      </div>
      
      <div class="toolbar-right">
        <button 
          class="btn btn-secondary btn-sm"
          @click="exportData"
          title="导出数据"
        >
          <Icon name="download" />
        </button>
      </div>
    </div>

    <!-- 表格容器 -->
    <div class="table-container">
      <div class="table-wrapper">
        <table class="data-table">
          <!-- 表头 -->
          <thead>
            <tr>
              <th 
                v-for="column in columns"
                :key="column.name"
                class="column-header"
              >
                <div class="header-content">
                  <Icon :name="getColumnIcon(column.type)" class="column-icon" />
                  <span class="column-name">{{ column.name }}</span>
                  <span class="column-type">{{ column.type }}</span>
                </div>
              </th>
            </tr>
          </thead>
          
          <!-- 表体 -->
          <tbody>
            <tr 
              v-for="(row, rowIndex) in rows"
              :key="rowIndex"
              class="data-row"
            >
              <td 
                v-for="column in columns"
                :key="column.name"
                class="data-cell"
                :class="getCellClass(column, row[column.name])"
              >
                <div class="cell-content">
                  {{ formatCellValue(row[column.name], column) }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import Icon from '@/components/common/Icon.vue'

export default {
  name: 'RelationalTableRenderer',
  components: {
    Icon
  },
  props: {
    queryData: {
      type: Object,
      required: true
    },
    dbType: {
      type: String,
      default: 'MySQL'
    },
    hideToolbar: {
      type: Boolean,
      default: false
    }
  },
  emits: ['export-data'],
  setup(props, { emit }) {
    // 计算属性
    const columns = computed(() => {
      return props.queryData?.columns || []
    })
    
    const rows = computed(() => {
      return props.queryData?.rows || []
    })
    
    const totalRows = computed(() => {
      return rows.value.length
    })
    
    // 方法
    const getColumnIcon = (type) => {
      const typeIcons = {
        'varchar': 'text',
        'text': 'text',
        'int': 'hash',
        'integer': 'hash',
        'bigint': 'hash',
        'decimal': 'hash',
        'float': 'hash',
        'double': 'hash',
        'boolean': 'check-square',
        'date': 'clock',
        'datetime': 'clock',
        'timestamp': 'clock',
        'json': 'code',
        'blob': 'file-text'
      }
      return typeIcons[type?.toLowerCase()] || 'columns'
    }
    
    const getCellClass = (column, value) => {
      const classes = [`cell-type-${column.type?.toLowerCase() || 'text'}`]
      
      if (value === null || value === undefined) {
        classes.push('cell-null')
      } else if (value === '') {
        classes.push('cell-empty')
      }
      
      return classes.join(' ')
    }
    
    const formatCellValue = (value, column) => {
      if (value === null || value === undefined) {
        return 'NULL'
      }
      
      if (value === '') {
        return '(empty)'
      }
      
      // JSON格式化
      if (column.type?.toLowerCase() === 'json') {
        try {
          const obj = typeof value === 'string' ? JSON.parse(value) : value
          return JSON.stringify(obj, null, 2)
        } catch {
          return String(value)
        }
      }
      
      // 布尔值
      if (column.type?.toLowerCase() === 'boolean') {
        return value ? '✅ true' : '❌ false'
      }
      
      return String(value)
    }
    
    const exportData = () => {
      emit('export-data', {
        columns: columns.value,
        rows: rows.value
      })
    }
    
    return {
      columns,
      rows,
      totalRows,
      getColumnIcon,
      getCellClass,
      formatCellValue,
      exportData
    }
  }
}
</script>

<style lang="scss" scoped>
.relational-table-renderer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  overflow: hidden;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  
  .result-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #64748b;
  }
}

.table-container {
  flex: 1;
  overflow: hidden;
}

.table-wrapper {
  height: 100%;
  overflow: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  
  th {
    position: sticky;
    top: 0;
    background: #f8fafc;
    border-bottom: 2px solid #e2e8f0;
    z-index: 10;
  }
  
  th, td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #f1f5f9;
  }
  
  .column-header {
    font-weight: 600;
    color: #374151;
    
    .header-content {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      
      .column-icon {
        color: #6b7280;
        font-size: 0.875rem;
      }
      
      .column-name {
        flex: 1;
      }
      
      .column-type {
        font-size: 0.75rem;
        color: #9ca3af;
        text-transform: uppercase;
      }
    }
  }
  
  .data-row {
    transition: background-color 0.2s;
    
    &:hover {
      background: #f8fafc;
    }
  }
  
  .data-cell {
    &.cell-null {
      color: #9ca3af;
      font-style: italic;
    }
    
    &.cell-empty {
      color: #d1d5db;
    }
    
    &.cell-type-int,
    &.cell-type-integer,
    &.cell-type-bigint,
    &.cell-type-decimal,
    &.cell-type-float,
    &.cell-type-double {
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
    }
    
    &.cell-type-boolean {
      text-align: center;
    }
    
    &.cell-type-json {
      font-family: 'JetBrains Mono', monospace;
      max-width: 300px;
      
      .cell-content {
        white-space: pre;
        overflow: auto;
        max-height: 100px;
      }
    }
  }
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &.btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }
  
  &.btn-secondary {
    background: #f3f4f6;
    color: #374151;
    border-color: #d1d5db;
    
    &:hover {
      background: #e5e7eb;
      border-color: #9ca3af;
    }
  }
}
</style>