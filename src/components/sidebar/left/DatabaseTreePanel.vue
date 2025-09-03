<template>
  <div class="database-tree-panel">
    <PanelHeader 
      title="数据库结构" 
      icon="🌳"
      :collapsible="true"
      v-model:collapsed="isCollapsed"
    >
      <template #actions>
        <!-- 连接选择器 -->
        <div class="connection-selector">
          <select 
            v-model="selectedConnectionId" 
            @change="handleConnectionChange"
            class="connection-select"
            :disabled="!hasConnections"
          >
            <option value="" disabled>选择连接</option>
            <option 
              v-for="conn in availableConnections" 
              :key="conn.id" 
              :value="conn.id"
            >
              {{ conn.name }}
            </option>
          </select>
        </div>
        
        <!-- 工具栏按钮组 -->
        <div class="toolbar-actions">
          <!-- 搜索按钮 -->
          <button 
            class="btn btn-icon" 
            @click="toggleSearch"
            :class="{ 'active': showSearch }"
            title="搜索过滤"
          >
            🔍
          </button>
          
          <!-- 统计信息开关 -->
          <button 
            class="btn btn-icon" 
            @click="toggleStats"
            :class="{ 'active': showStats }"
            title="显示统计信息"
          >
            📊
          </button>
          
          <!-- 展开收起所有 -->
          <button 
            class="btn btn-icon" 
            @click="toggleAllDatabases"
            title="展开/收起所有数据库"
          >
            {{ allExpanded ? '📁' : '📂' }}
          </button>
          
          <!-- 刷新按钮 -->
          <button 
            class="btn btn-icon" 
            @click="refreshDatabases"
            :disabled="!currentConnection || isLoadingDatabases"
            title="刷新数据库结构"
          >
            <span :class="{ 'spinning': isLoadingDatabases }">🔄</span>
          </button>
        </div>
      </template>
    </PanelHeader>
    
    <div v-if="!isCollapsed" class="panel-content">
      <!-- 搜索过滤栏 -->
      <div v-if="showSearch" class="search-bar">
        <div class="search-input-wrapper">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索数据库或表名..."
            class="search-input"
            @input="onSearchInput"
          />
          <button 
            v-if="searchQuery"
            @click="clearSearch"
            class="search-clear"
            title="清空搜索"
          >
            ❌
          </button>
        </div>
        
        <div class="search-filters">
          <label class="filter-option">
            <input v-model="searchFilters.databases" type="checkbox" />
            <span>数据库</span>
          </label>
          <label class="filter-option">
            <input v-model="searchFilters.tables" type="checkbox" />
            <span>表</span>
          </label>
        </div>
      </div>
      
      <!-- 无连接状态 -->
      <EmptyState 
        v-if="!currentConnection"
        icon="🔌"
        title="未选择连接"
        description="请从上方选择一个数据库连接"
      />
      
      <!-- 加载状态 -->
      <div v-else-if="isLoadingDatabases" class="loading-state">
        <div class="loading-spinner spinning">⚡</div>
        <div class="loading-text">正在加载数据库列表...</div>
      </div>
      
      <!-- 数据库树结构 -->
      <div v-else-if="filteredDatabases.length > 0" class="database-tree">
        <div 
          v-for="database in filteredDatabases" 
          :key="database.name" 
          class="database-node"
        >
          <div 
            class="database-header"
            @click="toggleDatabase(database.name)"
            @contextmenu.prevent="showDatabaseContextMenu($event, database)"
            @mouseenter="showDatabaseTooltip($event, database)"
            @mouseleave="hideTooltip"
            :class="{ 'expanded': isDatabaseExpanded(database.name) }"
          >
            <!-- 展开/收起图标 -->
            <span class="expand-icon">
              <span v-if="isDatabaseLoading(database.name)" class="loading-dot spinning">●</span>
              <span v-else class="expand-arrow" :class="{ 'rotated': isDatabaseExpanded(database.name) }">▶</span>
            </span>
            
            <!-- 数据库图标和名称 -->
            <span class="database-icon">🗄️</span>
            <span class="database-name">{{ database.name }}</span>
            
            <!-- 表数量徽章 -->
            <span v-if="database.tablesLoaded && showStats" class="table-badge">
              {{ database.tables.length }}
            </span>
          </div>
          
          <!-- 表列表 -->
          <transition name="slide-fade">
            <div v-if="isDatabaseExpanded(database.name)" class="tables-container">
              <div v-if="getFilteredTables(database).length === 0" class="empty-tables">
                <span class="empty-icon">📭</span>
                <span class="empty-text">{{ searchQuery ? '未找到匹配的表' : '暂无数据表' }}</span>
              </div>
              
              <div 
                v-for="table in getFilteredTables(database)" 
                :key="table.name" 
                class="table-node"
                @click="selectTable(database.name, table)"
                @contextmenu.prevent="showTableContextMenu($event, database, table)"
                @mouseenter="showTableTooltip($event, database, table)"
                @mouseleave="hideTooltip"
                :class="{ 'selected': isTableSelected(database.name, table.name) }"
              >
                <span class="table-icon">{{ getTableIcon(table.name) }}</span>
                <span class="table-name">{{ table.name }}</span>
                
                <!-- 表信息提示 -->
                <div v-if="table.columns && showStats" class="table-info" :title="`${table.columns.length} 列`">
                  <span class="column-count">{{ table.columns.length }}</span>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
      
      <!-- 无数据库状态 -->
      <EmptyState 
        v-else
        icon="🗃️"
        title="暂无数据库"
        description="当前连接未发现任何数据库"
      />
    </div>
    
    <!-- 右键上下文菜单 -->
    <ContextMenu
      :visible="contextMenu.visible"
      :position="contextMenu.position"
      :title="contextMenu.title"
      :icon="contextMenu.icon"
      :items="contextMenu.items"
      @item-click="handleContextMenuAction"
      @close="closeContextMenu"
    />
    
    <!-- 表结构查看对话框 -->
    <TableStructureDialog
      :visible="structureDialog.visible"
      :database-name="structureDialog.databaseName"
      :table-name="structureDialog.tableName"
      :table-info="structureDialog.tableInfo"
      @close="closeStructureDialog"
      @refresh="refreshTableStructure"
      @generate-query="handleGeneratedQuery"
    />
    
    <!-- 悬停工具提示 -->
    <Tooltip
      :visible="tooltip.visible"
      :position="tooltip.position"
      :title="tooltip.title"
      :icon="tooltip.icon"
      :content="tooltip.content"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick, onUnmounted } from 'vue'
import { useConnectionStore } from '@/stores/connection.js'
import { useNotificationStore } from '@/stores/notification.js'
import PanelHeader from '../shared/PanelHeader.vue'
import EmptyState from '../shared/EmptyState.vue'
import ContextMenu from './ContextMenu.vue'
import TableStructureDialog from './TableStructureDialog.vue'
import Tooltip from './Tooltip.vue'

// Stores
const connectionStore = useConnectionStore()
const notificationStore = useNotificationStore()

// 响应式状态
const isCollapsed = ref(false)
const databases = ref([])
const expandedDatabases = ref(new Set())
const loadingDatabases = ref(new Set())
const isLoadingDatabases = ref(false)
const selectedTable = ref(null)
const selectedConnectionId = ref('')

// 搜索和过滤相关状态
const showSearch = ref(false)
const showStats = ref(true)
const searchQuery = ref('')
const searchFilters = ref({
  databases: true,
  tables: true
})

// 上下文菜单状态
const contextMenu = ref({
  visible: false,
  position: { x: 0, y: 0 },
  title: '',
  icon: '',
  items: [],
  target: null // 当前右键的目标（数据库或表）
})

// 表结构对话框状态
const structureDialog = ref({
  visible: false,
  databaseName: '',
  tableName: '',
  tableInfo: null
})

// 工具提示状态
const tooltip = ref({
  visible: false,
  position: { x: 0, y: 0 },
  title: '',
  icon: '',
  content: null
})

let tooltipTimer = null

// 计算属性
const currentConnection = computed(() => {
  if (selectedConnectionId.value) {
    return connectionStore.connections.get(selectedConnectionId.value) || null
  }
  return connectionStore.currentConnection
})

const availableConnections = computed(() => {
  return Array.from(connectionStore.connections.values()).map(conn => ({
    id: conn.id,
    name: `${conn.config.host}:${conn.config.port}${conn.config.database ? '/' + conn.config.database : ''}`
  }))
})

const hasConnections = computed(() => availableConnections.value.length > 0)

// 过滤后的数据库列表
const filteredDatabases = computed(() => {
  if (!searchQuery.value) {
    return databases.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return databases.value.filter(database => {
    // 如果启用了数据库过滤且数据库名匹配
    if (searchFilters.value.databases && database.name.toLowerCase().includes(query)) {
      return true
    }
    
    // 如果启用了表过滤且有表名匹配
    if (searchFilters.value.tables && database.tablesLoaded) {
      return database.tables.some(table => 
        table.name && table.name.toLowerCase().includes(query)
      )
    }
    
    return false
  })
})

// 检查是否所有数据库都已展开
const allExpanded = computed(() => {
  if (databases.value.length === 0) return false
  return databases.value.every(database => {
    const expandKey = `${currentConnection.value?.id}:${database.name}`
    return expandedDatabases.value.has(expandKey)
  })
})

// 监听当前连接变化
watch(currentConnection, async (newConnection, oldConnection) => {
  if (newConnection && newConnection.id !== oldConnection?.id) {
    await loadDatabases()
  } else if (!newConnection) {
    // 清空数据
    databases.value = []
    expandedDatabases.value.clear()
    loadingDatabases.value.clear()
    selectedTable.value = null
  }
}, { immediate: true })

// 方法
const handleConnectionChange = () => {
  loadDatabases()
}

const loadDatabases = async () => {
  if (!currentConnection.value) return
  
  isLoadingDatabases.value = true
  try {
    const databaseList = await connectionStore.getDatabases(currentConnection.value.id)
    
    // 初始化数据库结构
    databases.value = databaseList.map(dbName => ({
      name: String(dbName), // 确保数据库名是字符串
      type: 'database',
      tables: [],
      tablesLoaded: false,
      expanded: false
    }))
    
    // 清空之前的展开状态
    expandedDatabases.value.clear()
    loadingDatabases.value.clear()
    selectedTable.value = null
    
  } catch (error) {
    console.error('加载数据库列表失败:', error)
    notificationStore.error(`加载数据库列表失败: ${error.message}`)
    databases.value = []
  } finally {
    isLoadingDatabases.value = false
  }
}

const toggleDatabase = async (databaseName) => {
  const expandKey = `${currentConnection.value.id}:${databaseName}`
  
  if (expandedDatabases.value.has(expandKey)) {
    // 已展开，直接收起
    expandedDatabases.value.delete(expandKey)
    return
  }
  
  // 未展开，需要加载表数据
  const database = databases.value.find(db => db.name === databaseName)
  if (!database) return
  
  // 如果表数据已加载，直接展开
  if (database.tablesLoaded) {
    expandedDatabases.value.add(expandKey)
    return
  }
  
  // 加载表数据
  loadingDatabases.value.add(expandKey)
  
  try {
    const tablesData = await connectionStore.getDatabaseTables(currentConnection.value.id, databaseName)
    
    // 更新数据库节点，处理后端返回的表对象数组
    database.tables = tablesData.map(tableInfo => {
      // 处理各种可能的数据格式
      let tableName
      if (!tableInfo) {
        tableName = 'unknown_table'
      } else if (typeof tableInfo === 'string') {
        tableName = tableInfo
      } else if (typeof tableInfo === 'object' && tableInfo.name) {
        tableName = tableInfo.name
      } else {
        // 如果是对象但没有name字段，尝试其他可能的字段
        tableName = tableInfo.table_name || tableInfo.TABLE_NAME || 'unknown_table'
      }
      
      return {
        name: String(tableName), // 确保表名是字符串
        type: 'table',
        // 保存完整的表信息，供后续使用
        columns: (typeof tableInfo === 'object' && tableInfo.columns) ? tableInfo.columns : null
      }
    })
    database.tablesLoaded = true
    
    // 展开数据库
    expandedDatabases.value.add(expandKey)
    
  } catch (error) {
    console.error('加载表列表失败:', error)
    notificationStore.error(`加载表列表失败: ${error.message}`)
  } finally {
    loadingDatabases.value.delete(expandKey)
  }
}

const isDatabaseExpanded = (databaseName) => {
  if (!currentConnection.value) return false
  const expandKey = `${currentConnection.value.id}:${databaseName}`
  return expandedDatabases.value.has(expandKey)
}

const isDatabaseLoading = (databaseName) => {
  if (!currentConnection.value) return false
  const expandKey = `${currentConnection.value.id}:${databaseName}`
  return loadingDatabases.value.has(expandKey)
}

const selectTable = (databaseName, table) => {
  selectedTable.value = {
    database: databaseName,
    table: table.name
  }
  
  // 触发事件，可以被父组件监听，传递完整的表信息
  emit('table-selected', {
    database: databaseName,
    table: table.name,
    connectionId: currentConnection.value.id,
    tableInfo: table // 包含列信息等详细数据
  })
}

const isTableSelected = (databaseName, tableName) => {
  return selectedTable.value && 
         selectedTable.value.database === databaseName && 
         selectedTable.value.table === tableName
}

const getTableIcon = (tableName) => {
  // 确保 tableName 是字符串
  if (!tableName || typeof tableName !== 'string') {
    return '📋' // 默认图标
  }
  
  // 根据表名返回合适的图标
  const name = tableName.toLowerCase()
  
  if (name.includes('user')) return '👥'
  if (name.includes('post') || name.includes('article')) return '📄'
  if (name.includes('comment') || name.includes('message')) return '💬'
  if (name.includes('product') || name.includes('item')) return '🛍️'
  if (name.includes('order')) return '📦'
  if (name.includes('tag')) return '🏷️'
  if (name.includes('category')) return '📂'
  if (name.includes('log')) return '📝'
  if (name.includes('setting') || name.includes('config')) return '⚙️'
  if (name.includes('file') || name.includes('image')) return '🗂️'
  if (name.includes('permission') || name.includes('role')) return '🔒'
  if (name.includes('stat') || name.includes('analytic')) return '📊'
  
  return '📋' // 默认图标
}

// 获取过滤后的表列表
const getFilteredTables = (database) => {
  if (!searchQuery.value || !searchFilters.value.tables) {
    return database.tables || []
  }
  
  const query = searchQuery.value.toLowerCase()
  return (database.tables || []).filter(table => 
    table.name && table.name.toLowerCase().includes(query)
  )
}

// 搜索和工具栏方法
const toggleSearch = () => {
  showSearch.value = !showSearch.value
  if (!showSearch.value) {
    searchQuery.value = ''
  }
}

const toggleStats = () => {
  showStats.value = !showStats.value
}

const toggleAllDatabases = async () => {
  if (!currentConnection.value) return
  
  if (allExpanded.value) {
    // 收起所有数据库
    expandedDatabases.value.clear()
  } else {
    // 展开所有数据库
    for (const database of databases.value) {
      const expandKey = `${currentConnection.value.id}:${database.name}`
      if (!expandedDatabases.value.has(expandKey)) {
        await toggleDatabase(database.name)
      }
    }
  }
}

const onSearchInput = () => {
  // 搜索时自动展开有匹配结果的数据库
  if (searchQuery.value && searchFilters.value.tables) {
    filteredDatabases.value.forEach(async database => {
      if (database.tables.some(table => 
        table.name && table.name.toLowerCase().includes(searchQuery.value.toLowerCase())
      )) {
        const expandKey = `${currentConnection.value.id}:${database.name}`
        if (!expandedDatabases.value.has(expandKey)) {
          expandedDatabases.value.add(expandKey)
        }
      }
    })
  }
}

const clearSearch = () => {
  searchQuery.value = ''
}

// 上下文菜单方法
const showDatabaseContextMenu = (event, database) => {
  contextMenu.value = {
    visible: true,
    position: { x: event.clientX, y: event.clientY },
    title: database.name,
    icon: '🗄️',
    target: { type: 'database', data: database },
    items: [
      { id: 'db-info', icon: '📊', text: '数据库信息' },
      { id: 'db-refresh', icon: '🔄', text: '刷新表列表', shortcut: 'F5' },
      { separator: true },
      { id: 'db-create-table', icon: '📝', text: '新建表' },
      { id: 'db-export', icon: '📤', text: '导出结构' },
      { separator: true },
      { id: 'db-copy-name', icon: '📋', text: '复制名称', shortcut: 'Ctrl+C' },
      { separator: true },
      { id: 'db-drop', icon: '🗑️', text: '删除数据库', danger: true }
    ]
  }
}

const showTableContextMenu = (event, database, table) => {
  contextMenu.value = {
    visible: true,
    position: { x: event.clientX, y: event.clientY },
    title: table.name,
    icon: getTableIcon(table.name),
    target: { type: 'table', database, data: table },
    items: [
      { id: 'table-structure', icon: '🔍', text: '查看结构' },
      { id: 'table-data', icon: '📊', text: '表统计信息' },
      { separator: true },
      { id: 'table-select', icon: '⚡', text: 'SELECT查询', shortcut: 'Ctrl+1' },
      { id: 'table-count', icon: '🔢', text: '行数统计' },
      { separator: true },
      { id: 'table-insert', icon: '📝', text: '生成INSERT' },
      { id: 'table-update', icon: '✏️', text: '生成UPDATE' },
      { id: 'table-delete', icon: '❌', text: '生成DELETE' },
      { separator: true },
      { id: 'table-export', icon: '📤', text: '导出数据' },
      { id: 'table-copy-name', icon: '📋', text: '复制表名' },
      { separator: true },
      { id: 'table-truncate', icon: '🧹', text: '清空表数据', danger: true },
      { id: 'table-drop', icon: '🗑️', text: '删除表', danger: true }
    ]
  }
}

const closeContextMenu = () => {
  contextMenu.value.visible = false
  contextMenu.value.target = null
}

const handleContextMenuAction = (item) => {
  const target = contextMenu.value.target
  if (!target) return

  switch (item.id) {
    // 数据库操作
    case 'db-info':
      showDatabaseInfo(target.data)
      break
    case 'db-refresh':
      refreshSingleDatabase(target.data.name)
      break
    case 'db-copy-name':
      copyToClipboard(target.data.name)
      break
    case 'db-drop':
      confirmDropDatabase(target.data.name)
      break
    
    // 表操作
    case 'table-structure':
      showTableStructure(target.database, target.data)
      break
    case 'table-select':
      generateQuery('SELECT', target.database.name, target.data.name)
      break
    case 'table-count':
      generateQuery('COUNT', target.database.name, target.data.name)
      break
    case 'table-insert':
      generateQuery('INSERT', target.database.name, target.data.name)
      break
    case 'table-update':
      generateQuery('UPDATE', target.database.name, target.data.name)
      break
    case 'table-delete':
      generateQuery('DELETE', target.database.name, target.data.name)
      break
    case 'table-copy-name':
      copyToClipboard(target.data.name)
      break
    case 'table-truncate':
      confirmTruncateTable(target.database.name, target.data.name)
      break
    case 'table-drop':
      confirmDropTable(target.database.name, target.data.name)
      break
  }
}

// 上下文菜单功能实现
const showDatabaseInfo = (database) => {
  // TODO: 实现数据库信息显示
  notificationStore.info(`显示数据库 "${database.name}" 的详细信息`)
}

const refreshSingleDatabase = async (databaseName) => {
  if (!currentConnection.value) return
  
  const expandKey = `${currentConnection.value.id}:${databaseName}`
  loadingDatabases.value.add(expandKey)
  
  try {
    const database = databases.value.find(db => db.name === databaseName)
    if (database) {
      const tablesData = await connectionStore.getDatabaseTables(currentConnection.value.id, databaseName)
      
      database.tables = tablesData.map(tableInfo => {
        let tableName
        if (!tableInfo) {
          tableName = 'unknown_table'
        } else if (typeof tableInfo === 'string') {
          tableName = tableInfo
        } else if (typeof tableInfo === 'object' && tableInfo.name) {
          tableName = tableInfo.name
        } else {
          tableName = tableInfo.table_name || tableInfo.TABLE_NAME || 'unknown_table'
        }
        
        return {
          name: String(tableName),
          type: 'table',
          columns: (typeof tableInfo === 'object' && tableInfo.columns) ? tableInfo.columns : null
        }
      })
      database.tablesLoaded = true
      
      notificationStore.success(`已刷新数据库 "${databaseName}" 的表列表`)
    }
  } catch (error) {
    console.error('刷新表列表失败:', error)
    notificationStore.error(`刷新表列表失败: ${error.message}`)
  } finally {
    loadingDatabases.value.delete(expandKey)
  }
}

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    notificationStore.success(`已复制到剪贴板: ${text}`)
  } catch (error) {
    notificationStore.error('复制失败，请手动复制')
  }
}

const generateQuery = (type, databaseName, tableName) => {
  let query = ''
  
  switch (type) {
    case 'SELECT':
      query = `SELECT * FROM \`${tableName}\` LIMIT 100;`
      break
    case 'COUNT':
      query = `SELECT COUNT(*) as total_rows FROM \`${tableName}\`;`
      break
    case 'INSERT':
      query = `INSERT INTO \`${tableName}\` (column1, column2) VALUES (value1, value2);`
      break
    case 'UPDATE':
      query = `UPDATE \`${tableName}\` SET column1 = value1 WHERE condition;`
      break
    case 'DELETE':
      query = `DELETE FROM \`${tableName}\` WHERE condition;`
      break
  }
  
  // TODO: 将生成的SQL发送到查询编辑器
  copyToClipboard(query)
  notificationStore.success(`已生成 ${type} 查询语句`)
}

const showTableStructure = (database, table) => {
  structureDialog.value = {
    visible: true,
    databaseName: database.name,
    tableName: table.name,
    tableInfo: table
  }
}

const closeStructureDialog = () => {
  structureDialog.value.visible = false
  structureDialog.value.tableInfo = null
}

const refreshTableStructure = async ({ database, table }) => {
  // TODO: 重新获取表结构信息
  notificationStore.info(`刷新表 "${database}.${table}" 的结构信息`)
}

const handleGeneratedQuery = (query) => {
  // TODO: 将生成的SQL发送到查询编辑器
  copyToClipboard(query)
  notificationStore.success('SQL已复制到剪贴板')
}

// 工具提示方法
const showDatabaseTooltip = (event, database) => {
  clearTimeout(tooltipTimer)
  
  tooltipTimer = setTimeout(() => {
    const rect = event.target.getBoundingClientRect()
    
    tooltip.value = {
      visible: true,
      position: { 
        x: rect.right + 8, 
        y: rect.top 
      },
      title: database.name,
      icon: '🗄️',
      content: [
        { label: '数据库', value: database.name },
        { label: '表数量', value: database.tablesLoaded ? `${database.tables.length} 个` : '未加载' },
        { label: '状态', value: database.tablesLoaded ? '已加载' : '未展开' },
        { label: '类型', value: 'MySQL 数据库' }
      ]
    }
  }, 500) // 500ms延迟显示
}

const showTableTooltip = (event, database, table) => {
  clearTimeout(tooltipTimer)
  
  tooltipTimer = setTimeout(() => {
    const rect = event.target.getBoundingClientRect()
    
    const content = [
      { label: '表名', value: table.name },
      { label: '数据库', value: database.name },
      { label: '列数', value: table.columns ? `${table.columns.length} 列` : '未知' },
      { label: '类型', value: '数据表' }
    ]
    
    // 如果有列信息，显示前几个列名
    if (table.columns && table.columns.length > 0) {
      const columnNames = table.columns.slice(0, 3).map(col => col.name).join(', ')
      const moreColumns = table.columns.length > 3 ? ` +${table.columns.length - 3}...` : ''
      content.push({ label: '主要列', value: columnNames + moreColumns })
    }
    
    tooltip.value = {
      visible: true,
      position: { 
        x: rect.right + 8, 
        y: rect.top 
      },
      title: table.name,
      icon: getTableIcon(table.name),
      content
    }
  }, 500) // 500ms延迟显示
}

const hideTooltip = () => {
  clearTimeout(tooltipTimer)
  tooltip.value.visible = false
}

const confirmDropDatabase = (databaseName) => {
  notificationStore.confirm(
    `确定要删除数据库 "${databaseName}" 吗？此操作无法撤销！`,
    () => {
      // TODO: 实现删除数据库功能
      notificationStore.warning(`删除数据库功能待实现: ${databaseName}`)
    }
  )
}

const confirmTruncateTable = (databaseName, tableName) => {
  notificationStore.confirm(
    `确定要清空表 "${databaseName}.${tableName}" 的所有数据吗？此操作无法撤销！`,
    () => {
      // TODO: 实现清空表功能
      notificationStore.warning(`清空表功能待实现: ${tableName}`)
    }
  )
}

const confirmDropTable = (databaseName, tableName) => {
  notificationStore.confirm(
    `确定要删除表 "${databaseName}.${tableName}" 吗？此操作无法撤销！`,
    () => {
      // TODO: 实现删除表功能
      notificationStore.warning(`删除表功能待实现: ${tableName}`)
    }
  )
}

// 暴露给父组件的方法
const refreshDatabases = () => {
  loadDatabases()
}

// 生命周期钩子
onMounted(() => {
  // 添加全局点击监听，用于关闭上下文菜单
  document.addEventListener('click', closeContextMenu)
})

onUnmounted(() => {
  // 清理全局监听器和定时器
  document.removeEventListener('click', closeContextMenu)
  clearTimeout(tooltipTimer)
})

// 定义 emits
const emit = defineEmits(['table-selected'])

// 暴露方法给父组件
defineExpose({
  refreshDatabases
})
</script>

<style scoped>
.database-tree-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
}

.panel-content {
  flex: 1;
  overflow: hidden;
  padding: 4px;
}

/* 搜索栏样式 */
.search-bar {
  padding: 6px 4px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
  border-radius: 4px;
  margin-bottom: 4px;
}

.search-input-wrapper {
  position: relative;
  margin-bottom: 4px;
}

.search-input {
  width: 100%;
  padding: 4px 24px 4px 6px;
  border: 1px solid var(--border-color);
  border-radius: 3px;
  font-size: 10px;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.1);
}

.search-input::placeholder {
  color: var(--text-secondary);
  font-size: 9px;
}

.search-clear {
  position: absolute;
  right: 2px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 8px;
  color: var(--text-secondary);
  padding: 1px;
  border-radius: 2px;
  transition: all 0.2s ease;
}

.search-clear:hover {
  background: var(--gray-100);
  color: var(--text-primary);
}

.search-filters {
  display: flex;
  gap: 8px;
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 9px;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.filter-option input[type="checkbox"] {
  width: 10px;
  height: 10px;
  cursor: pointer;
}

.filter-option:hover {
  color: var(--text-primary);
}

/* 工具栏按钮组样式 */
.toolbar-actions {
  display: flex;
  gap: 2px;
  align-items: center;
}

.btn-icon.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

/* 连接选择器样式 */
.connection-selector {
  margin-right: 4px;
}

.connection-select {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 3px;
  padding: 1px 4px;
  font-size: 9px;
  color: var(--text-primary);
  min-width: 80px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.connection-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.1);
}

.connection-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 按钮样式 */
.btn-icon {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 10px;
}

.btn-icon:hover:not(:disabled) {
  background: var(--gray-100);
  border-color: var(--gray-300);
  transform: translateY(-1px);
}

.btn-icon:active {
  transform: translateY(0);
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 6px;
  color: var(--text-secondary);
}

.loading-spinner, .loading-dot {
  font-size: 12px;
  margin-bottom: 3px;
}

.loading-text {
  font-size: 9px;
  font-weight: 500;
}

/* 动画效果 */
.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 数据库树样式 */
.database-tree {
  height: 100%;
  overflow-y: auto;
  padding: 1px 0;
}

.database-node {
  margin-bottom: 2px;
}

.database-header {
  display: flex;
  align-items: center;
  padding: 2px 4px;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  position: relative;
  overflow: hidden;
  min-height: 20px;
}

.database-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.08), transparent);
  transition: left 0.5s ease;
}

.database-header:hover::before {
  left: 100%;
}

.database-header:hover {
  background: var(--gray-50);
  border-color: var(--gray-300);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.database-header.expanded {
  background: linear-gradient(135deg, var(--primary-color), #5b5bf6);
  color: white;
  border-color: var(--primary-color);
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.2);
}

.database-header.expanded .database-name {
  color: white;
  font-weight: 600;
}

.database-header.expanded .table-badge {
  background: rgba(255, 255, 255, 0.25);
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
}

.expand-icon {
  width: 10px;
  height: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 3px;
  font-size: 7px;
  color: var(--text-secondary);
}

.expand-arrow {
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.expand-arrow.rotated {
  transform: rotate(90deg);
}

.database-icon {
  font-size: 10px;
  margin-right: 3px;
  opacity: 0.8;
}

.database-name {
  flex: 1;
  font-weight: 600;
  font-size: 10px;
  color: var(--text-primary);
  line-height: 1.2;
}

.table-badge {
  background: var(--gray-100);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0px 3px;
  font-size: 8px;
  font-weight: 600;
  min-width: 12px;
  text-align: center;
  transition: all 0.2s ease;
}

/* 表容器 */
.tables-container {
  margin-left: 8px;
  margin-top: 1px;
  position: relative;
}

.tables-container::before {
  content: '';
  position: absolute;
  left: -4px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(180deg, var(--primary-color), var(--primary-color) 85%, transparent);
}

.empty-tables {
  display: flex;
  align-items: center;
  padding: 4px 6px;
  color: var(--text-secondary);
  font-size: 9px;
  background: var(--gray-50);
  border-radius: 3px;
  font-style: italic;
  border: 1px dashed var(--border-color);
}

.empty-icon {
  margin-right: 3px;
  font-size: 10px;
  opacity: 0.6;
}

/* 表节点 */
.table-node {
  display: flex;
  align-items: center;
  padding: 2px 4px;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  margin-bottom: 1px;
  position: relative;
  background: var(--bg-primary);
  border: 1px solid transparent;
  min-height: 16px;
}

.table-node:hover {
  background: var(--gray-50);
  border-color: var(--gray-200);
  transform: translateX(1px);
}

.table-node.selected {
  background: linear-gradient(135deg, var(--primary-color), #5b5bf6);
  color: white;
  border-color: var(--primary-color);
  box-shadow: 0 1px 4px rgba(99, 102, 241, 0.2);
  transform: translateX(2px);
}

.table-node.selected .table-name {
  color: white;
  font-weight: 500;
}

.table-node.selected .table-info {
  background: rgba(255, 255, 255, 0.25);
  color: white;
}

.table-icon {
  font-size: 10px;
  margin-right: 4px;
  min-width: 10px;
  transition: transform 0.15s ease;
}

.table-node:hover .table-icon {
  transform: scale(1.05);
}

.table-name {
  flex: 1;
  font-size: 9px;
  color: var(--text-primary);
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: 0.005em;
}

.table-info {
  display: flex;
  align-items: center;
  margin-left: 3px;
}

.column-count {
  background: var(--gray-100);
  color: var(--text-secondary);
  border-radius: 4px;
  padding: 0px 2px;
  font-size: 7px;
  font-weight: 600;
  min-width: 10px;
  text-align: center;
  line-height: 1.3;
}

/* 过渡动画 */
.slide-fade-enter-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-enter-from {
  transform: translateY(-10px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateY(-5px);
  opacity: 0;
}

/* 滚动条样式 */
.database-tree::-webkit-scrollbar {
  width: 3px;
}

.database-tree::-webkit-scrollbar-track {
  background: transparent;
}

.database-tree::-webkit-scrollbar-thumb {
  background: var(--gray-300);
  border-radius: 2px;
}

.database-tree::-webkit-scrollbar-thumb:hover {
  background: var(--gray-400);
}

/* 深色主题适配 */
[data-theme="dark"] .connection-select {
  background: var(--gray-800);
  border-color: var(--gray-600);
  color: var(--text-primary);
}

[data-theme="dark"] .btn-icon {
  background: var(--gray-800);
  border-color: var(--gray-600);
}

[data-theme="dark"] .btn-icon:hover:not(:disabled) {
  background: var(--gray-700);
  border-color: var(--gray-500);
}

[data-theme="dark"] .database-header {
  background: var(--gray-800);
  border-color: var(--gray-600);
}

[data-theme="dark"] .database-header:hover {
  background: var(--gray-700);
  border-color: var(--gray-500);
}

[data-theme="dark"] .table-badge {
  background: var(--gray-700);
  border-color: var(--gray-600);
  color: var(--text-secondary);
}

[data-theme="dark"] .table-node {
  background: var(--bg-secondary);
}

[data-theme="dark"] .table-node:hover {
  background: var(--gray-700);
  border-color: var(--gray-600);
}

[data-theme="dark"] .empty-tables {
  background: var(--gray-800);
  border-color: var(--gray-600);
}

[data-theme="dark"] .column-count {
  background: var(--gray-700);
  color: var(--text-secondary);
}

[data-theme="dark"] .database-tree::-webkit-scrollbar-thumb {
  background: var(--gray-600);
}

[data-theme="dark"] .database-tree::-webkit-scrollbar-thumb:hover {
  background: var(--gray-500);
}
</style>