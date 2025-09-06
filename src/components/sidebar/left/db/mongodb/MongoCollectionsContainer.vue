<template>
  <div class="mongo-collections-container">
    <div v-if="mongodbCollections && mongodbCollections.collections.length > 0" class="collections-info">
      <!-- 集合列表 -->
      <div class="collections-section">
        <div class="section-header">
          <i class="fas fa-layer-group"></i>
          <span>集合</span>
        </div>
        <div
          v-for="collection in mongodbCollections.collections"
          :key="collection.name"
          class="mongo-collection-item"
          :class="{ 'selected': isCollectionSelected(collection) }"
          @click="handleCollectionClick(collection)"
          @contextmenu.prevent="handleCollectionContextMenu(collection, $event)"
        >
          <div class="collection-info">
            <i class="fas fa-layer-group collection-icon"></i>
            <span class="collection-name">{{ collection.name }}</span>
          </div>
          <div class="collection-meta">
            <span v-if="collection.document_count" class="doc-count">
              {{ formatCount(collection.document_count) }} 文档
            </span>
            <span v-if="collection.size" class="collection-size">
              {{ formatBytes(collection.size) }}
            </span>
          </div>
          
          <!-- 索引信息 -->
          <div v-if="collection.indexes && collection.indexes.length > 0" class="indexes-info">
            <div class="indexes-header">
              <i class="fas fa-sort"></i>
              <span>索引 ({{ collection.indexes.length }})</span>
            </div>
            <div
              v-for="index in collection.indexes"
              :key="index.name"
              class="index-item"
            >
              <i class="fas fa-sort index-icon"></i>
              <span class="index-name">{{ index.name }}</span>
              <span v-if="index.unique" class="index-badge unique">UNIQUE</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- GridFS文件桶 -->
      <div v-if="mongodbCollections.gridfs_buckets && mongodbCollections.gridfs_buckets.length > 0" class="gridfs-section">
        <div class="section-header">
          <i class="fas fa-archive"></i>
          <span>GridFS 文件桶</span>
        </div>
        <div
          v-for="bucket in mongodbCollections.gridfs_buckets"
          :key="bucket.name"
          class="gridfs-bucket-item"
          :class="{ 'selected': isBucketSelected(bucket) }"
          @click="handleBucketClick(bucket)"
          @contextmenu.prevent="handleBucketContextMenu(bucket, $event)"
        >
          <div class="bucket-info">
            <i class="fas fa-archive bucket-icon"></i>
            <span class="bucket-name">{{ bucket.name }}</span>
          </div>
          <div class="bucket-meta">
            <span v-if="bucket.file_count" class="file-count">
              {{ bucket.file_count }} 文件
            </span>
            <span v-if="bucket.total_size" class="bucket-size">
              {{ formatBytes(bucket.total_size) }}
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 空状态 -->
    <div v-else class="empty-state">
      <i class="fas fa-leaf"></i>
      <span>该MongoDB数据库暂无集合</span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  mongodbCollections: {
    type: Object,
    default: null
  },
  database: {
    type: Object,
    required: true
  },
  connectionId: {
    type: String,
    required: true
  },
  dbType: {
    type: String,
    required: true
  },
  selectedNode: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['node-click', 'node-context-menu'])

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
}

function formatCount(count) {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return count.toString()
}

function isCollectionSelected(collection) {
  return props.selectedNode && 
         props.selectedNode.type === 'mongodb-collection' && 
         props.selectedNode.name === collection.name
}

function isBucketSelected(bucket) {
  return props.selectedNode && 
         props.selectedNode.type === 'mongodb-gridfs' && 
         props.selectedNode.name === bucket.name
}

function handleCollectionClick(collection) {
  emit('node-click', {
    type: 'mongodb-collection',
    collection: collection,
    database: props.database.name,
    connectionId: props.connectionId,
    dbType: props.dbType
  })
}

function handleBucketClick(bucket) {
  emit('node-click', {
    type: 'mongodb-gridfs',
    bucket: bucket,
    database: props.database.name,
    connectionId: props.connectionId,
    dbType: props.dbType
  })
}

function handleCollectionContextMenu(collection, event) {
  emit('node-context-menu', {
    type: 'mongodb-collection',
    collection: collection,
    database: props.database.name,
    connectionId: props.connectionId,
    dbType: props.dbType,
    event
  })
}

function handleBucketContextMenu(bucket, event) {
  emit('node-context-menu', {
    type: 'mongodb-gridfs',
    bucket: bucket,
    database: props.database.name,
    connectionId: props.connectionId,
    dbType: props.dbType,
    event
  })
}
</script>

<style scoped>
.mongo-collections-container {
  padding: 4px 0;
}

.collections-section,
.gridfs-section {
  margin-bottom: 8px;
}

.section-header {
  display: flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  color: #333;
  padding: 4px 8px;
  margin-bottom: 4px;
}

.section-header i {
  margin-right: 4px;
  color: #47a248;
}

.mongo-collection-item,
.gridfs-bucket-item {
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 3px;
  transition: background-color 0.2s ease;
  margin-bottom: 2px;
}

.mongo-collection-item:hover,
.gridfs-bucket-item:hover {
  background-color: #f8f8f8;
}

.mongo-collection-item.selected,
.gridfs-bucket-item.selected {
  background-color: #e8f5e8;
  color: #2e7d32;
}

.collection-info,
.bucket-info {
  display: flex;
  align-items: center;
  margin-bottom: 2px;
}

.collection-icon,
.bucket-icon {
  font-size: 10px;
  margin-right: 4px;
  width: 12px;
  color: #47a248;
}

.collection-name,
.bucket-name {
  font-size: 12px;
  font-weight: 500;
}

.collection-meta,
.bucket-meta {
  display: flex;
  gap: 6px;
  margin-left: 16px;
  font-size: 10px;
  color: #666;
}

.doc-count,
.file-count,
.collection-size,
.bucket-size {
  background: #f0f0f0;
  padding: 1px 4px;
  border-radius: 6px;
}

.indexes-info {
  margin-left: 16px;
  margin-top: 4px;
}

.indexes-header {
  display: flex;
  align-items: center;
  font-size: 9px;
  font-weight: 600;
  color: #666;
  margin-bottom: 2px;
}

.indexes-header i {
  margin-right: 2px;
  color: #daa520;
}

.index-item {
  display: flex;
  align-items: center;
  font-size: 9px;
  color: #777;
  margin-bottom: 1px;
  padding-left: 8px;
}

.index-icon {
  margin-right: 2px;
  color: #daa520;
}

.index-name {
  flex: 1;
}

.index-badge {
  font-size: 7px;
  padding: 1px 2px;
  border-radius: 2px;
  font-weight: bold;
}

.index-badge.unique {
  background: #e3f2fd;
  color: #1976d2;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  color: #999;
  font-size: 11px;
  text-align: center;
}

.empty-state i {
  font-size: 20px;
  margin-bottom: 8px;
  opacity: 0.5;
  color: #47a248;
}
</style>