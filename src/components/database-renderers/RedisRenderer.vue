<template>
  <div class="redis-renderer">
    <div class="redis-info">
      <Icon name="server" />
      <span>Redis 数据</span>
    </div>
    
    <div class="redis-content">
      <JsonRenderer 
        :data="queryData"
        :editable="editable"
        @data-update="handleDataUpdate"
      />
    </div>
  </div>
</template>

<script>
import Icon from '@/components/common/Icon.vue'
import JsonRenderer from './JsonRenderer.vue'

export default {
  name: 'RedisRenderer',
  components: {
    Icon,
    JsonRenderer
  },
  props: {
    queryData: {
      type: Object,
      required: true
    },
    connectionId: {
      type: String,
      required: true
    },
    editable: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    'value-update',
    'key-delete',
    'ttl-update',
    'refresh-database',
    'monitor-toggle'
  ],
  setup(props, { emit }) {
    const handleDataUpdate = (data) => {
      emit('value-update', data)
    }
    
    return {
      handleDataUpdate
    }
  }
}
</script>

<style lang="scss" scoped>
.redis-renderer {
  display: flex;
  flex-direction: column;
  height: 100%;
  
  .redis-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: #fef2f2;
    border-bottom: 1px solid #fecaca;
    color: #dc2626;
    font-weight: 600;
  }
  
  .redis-content {
    flex: 1;
    overflow: hidden;
  }
}
</style>