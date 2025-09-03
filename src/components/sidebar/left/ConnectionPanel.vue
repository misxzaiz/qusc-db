<template>
  <div class="connections-panel panel">
    <PanelHeader title="数据库连接">
      <template #actions>
        <button 
          class="btn btn-primary" 
          @click="showNewConnectionDialog"
          :disabled="isConnecting"
        >
          + 新建
        </button>
      </template>
    </PanelHeader>
    
    <div class="panel-content">
      <ConnectionList
        :connections="savedConnections"
        :has-connections="hasConnections"
        @connect="connectToDatabase"
        @edit="editConnection"
        @delete="handleDeleteConnection"
        @create="showNewConnectionDialog"
      />
    </div>
    
    <!-- 连接对话框 -->
    <ConnectionDialog 
      v-if="showConnectionDialog"
      :visible="showConnectionDialog"
      :connection="editingConnection"
      @save="saveConnection"
      @cancel="closeConnectionDialog"
      @update:visible="showConnectionDialog = $event"
    />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import PanelHeader from '../shared/PanelHeader.vue'
import ConnectionList from './ConnectionList.vue'
import ConnectionDialog from '../../dialog/ConnectionFormDialog.vue'
import { useConnectionManager } from './composables/useConnectionManager'
import { useNotificationStore } from '@/stores/notification.js'

// Emits
const emit = defineEmits(['connection-select'])

// Stores
const notificationStore = useNotificationStore()

// 使用连接管理器
const {
  // 响应式数据
  showConnectionDialog,
  editingConnection,
  isConnecting,
  
  // 计算属性
  savedConnections,
  hasConnections,
  
  // 方法
  loadSavedConnections,
  showNewConnectionDialog,
  editConnection,
  closeConnectionDialog,
  saveConnection,
  deleteConnection,
  connectToDatabase: connectToDB
} = useConnectionManager()

// 方法
const connectToDatabase = async (connection) => {
  const result = await connectToDB(connection)
  if (result) {
    emit('connection-select', connection)
  }
  return result
}

const handleDeleteConnection = (connectionName) => {
  notificationStore.confirm(`确定要删除连接"${connectionName}"吗？`, () => {
    deleteConnection(connectionName)
  })
}

// 生命周期
onMounted(async () => {
  await loadSavedConnections()
})
</script>

<style scoped>
.connections-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>