<template>
  <div class="redis-commands-helper">
    <div class="commands-header">
      <h3>Redis 命令助手</h3>
      <button class="btn btn-ghost" @click="collapsed = !collapsed">
        {{ collapsed ? '展开' : '收起' }}
      </button>
    </div>
    
    <div v-if="!collapsed" class="commands-content">
      <!-- 命令分类 -->
      <div class="command-categories">
        <button
          v-for="category in categories"
          :key="category.key"
          class="category-btn"
          :class="{ active: activeCategory === category.key }"
          @click="activeCategory = category.key"
        >
          <span class="category-icon">{{ category.icon }}</span>
          <span class="category-name">{{ category.name }}</span>
        </button>
      </div>
      
      <!-- 命令列表 -->
      <div class="commands-list">
        <div
          v-for="command in currentCommands"
          :key="command.name"
          class="command-item"
          @click="handleCommandClick(command)"
        >
          <div class="command-header">
            <span class="command-name">{{ command.name }}</span>
            <span class="command-syntax">{{ command.syntax }}</span>
          </div>
          <div class="command-description">{{ command.description }}</div>
          <div v-if="command.example" class="command-example">
            <span class="example-label">示例：</span>
            <code class="example-code">{{ command.example }}</code>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Props
const props = defineProps({
  onCommandSelect: {
    type: Function,
    default: null
  }
})

// Emits
const emit = defineEmits(['command-select'])

// 响应式状态
const collapsed = ref(false)
const activeCategory = ref('string')

// 命令分类
const categories = [
  {
    key: 'string',
    name: '字符串',
    icon: '📝'
  },
  {
    key: 'hash',
    name: '哈希',
    icon: '🏷️'
  },
  {
    key: 'list',
    name: '列表',
    icon: '📋'
  },
  {
    key: 'set',
    name: '集合',
    icon: '🎯'
  },
  {
    key: 'sortedset',
    name: '有序集合',
    icon: '📊'
  },
  {
    key: 'utility',
    name: '工具',
    icon: '🔧'
  },
  {
    key: 'server',
    name: '服务器',
    icon: '⚙️'
  }
]

// Redis命令定义
const commands = {
  string: [
    {
      name: 'GET',
      syntax: 'GET key',
      description: '获取字符串值',
      example: 'GET mykey'
    },
    {
      name: 'SET',
      syntax: 'SET key value',
      description: '设置字符串值',
      example: 'SET mykey "hello"'
    },
    {
      name: 'INCR',
      syntax: 'INCR key',
      description: '将数字值增加1',
      example: 'INCR counter'
    },
    {
      name: 'DECR',
      syntax: 'DECR key',
      description: '将数字值减少1',
      example: 'DECR counter'
    },
    {
      name: 'INCRBY',
      syntax: 'INCRBY key increment',
      description: '将数字值增加指定数量',
      example: 'INCRBY counter 5'
    },
    {
      name: 'DECRBY',
      syntax: 'DECRBY key decrement',
      description: '将数字值减少指定数量',
      example: 'DECRBY counter 3'
    }
  ],
  hash: [
    {
      name: 'HGET',
      syntax: 'HGET key field',
      description: '获取哈希表中字段的值',
      example: 'HGET user:1 name'
    },
    {
      name: 'HSET',
      syntax: 'HSET key field value',
      description: '设置哈希表中字段的值',
      example: 'HSET user:1 name "john"'
    },
    {
      name: 'HGETALL',
      syntax: 'HGETALL key',
      description: '获取哈希表中所有字段和值',
      example: 'HGETALL user:1'
    }
  ],
  list: [
    {
      name: 'LPUSH',
      syntax: 'LPUSH key value [value ...]',
      description: '在列表左侧添加元素',
      example: 'LPUSH mylist "world" "hello"'
    },
    {
      name: 'RPUSH',
      syntax: 'RPUSH key value [value ...]',
      description: '在列表右侧添加元素',
      example: 'RPUSH mylist "item1" "item2"'
    },
    {
      name: 'LPOP',
      syntax: 'LPOP key',
      description: '移除并返回列表左侧第一个元素',
      example: 'LPOP mylist'
    },
    {
      name: 'RPOP',
      syntax: 'RPOP key',
      description: '移除并返回列表右侧最后一个元素',
      example: 'RPOP mylist'
    },
    {
      name: 'LRANGE',
      syntax: 'LRANGE key start stop',
      description: '获取列表指定范围内的元素',
      example: 'LRANGE mylist 0 -1'
    },
    {
      name: 'LLEN',
      syntax: 'LLEN key',
      description: '获取列表长度',
      example: 'LLEN mylist'
    }
  ],
  set: [
    {
      name: 'SADD',
      syntax: 'SADD key member [member ...]',
      description: '向集合添加成员',
      example: 'SADD myset "apple" "banana"'
    },
    {
      name: 'SMEMBERS',
      syntax: 'SMEMBERS key',
      description: '获取集合中所有成员',
      example: 'SMEMBERS myset'
    },
    {
      name: 'SREM',
      syntax: 'SREM key member [member ...]',
      description: '从集合中移除成员',
      example: 'SREM myset "apple"'
    }
  ],
  sortedset: [
    {
      name: 'ZADD',
      syntax: 'ZADD key score member',
      description: '向有序集合添加成员',
      example: 'ZADD leaderboard 100 "player1"'
    },
    {
      name: 'ZRANGE',
      syntax: 'ZRANGE key start stop',
      description: '按分数排序获取有序集合成员',
      example: 'ZRANGE leaderboard 0 -1'
    }
  ],
  utility: [
    {
      name: 'KEYS',
      syntax: 'KEYS pattern',
      description: '查找匹配模式的所有键',
      example: 'KEYS user:*'
    },
    {
      name: 'EXISTS',
      syntax: 'EXISTS key [key ...]',
      description: '检查键是否存在',
      example: 'EXISTS mykey'
    },
    {
      name: 'DEL',
      syntax: 'DEL key [key ...]',
      description: '删除键',
      example: 'DEL mykey'
    },
    {
      name: 'TYPE',
      syntax: 'TYPE key',
      description: '获取键的数据类型',
      example: 'TYPE mykey'
    },
    {
      name: 'TTL',
      syntax: 'TTL key',
      description: '获取键的剩余生存时间',
      example: 'TTL mykey'
    },
    {
      name: 'EXPIRE',
      syntax: 'EXPIRE key seconds',
      description: '设置键的过期时间',
      example: 'EXPIRE mykey 60'
    }
  ],
  server: [
    {
      name: 'PING',
      syntax: 'PING',
      description: '测试连接',
      example: 'PING'
    },
    {
      name: 'INFO',
      syntax: 'INFO [section]',
      description: '获取服务器信息',
      example: 'INFO server'
    },
    {
      name: 'SELECT',
      syntax: 'SELECT database',
      description: '切换数据库',
      example: 'SELECT 1'
    },
    {
      name: 'FLUSHDB',
      syntax: 'FLUSHDB',
      description: '清空当前数据库',
      example: 'FLUSHDB'
    },
    {
      name: 'FLUSHALL',
      syntax: 'FLUSHALL',
      description: '清空所有数据库',
      example: 'FLUSHALL'
    }
  ]
}

// 计算属性
const currentCommands = computed(() => {
  return commands[activeCategory.value] || []
})

// 方法
const handleCommandClick = (command) => {
  emit('command-select', command.syntax)
  if (props.onCommandSelect) {
    props.onCommandSelect(command.syntax)
  }
}
</script>

<style scoped>
.redis-commands-helper {
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  background: var(--bg-primary);
}

.commands-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.commands-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.btn {
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  background: white;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:hover {
  background: var(--gray-50);
}

.btn-ghost {
  border: none;
  background: transparent;
}

.commands-content {
  padding: 16px;
}

.command-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.category-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: white;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.category-btn:hover {
  background: var(--gray-50);
  border-color: var(--gray-300);
}

.category-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.category-icon {
  font-size: 14px;
}

.category-name {
  font-weight: 500;
}

.commands-list {
  display: grid;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.command-item {
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.command-item:hover {
  border-color: var(--primary-color);
  background: rgba(99, 102, 241, 0.05);
}

.command-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  gap: 12px;
}

.command-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary-color);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.command-syntax {
  font-size: 11px;
  color: var(--text-tertiary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background: var(--gray-100);
  padding: 2px 6px;
  border-radius: 3px;
}

.command-description {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  line-height: 1.3;
}

.command-example {
  display: flex;
  align-items: center;
  gap: 6px;
}

.example-label {
  font-size: 10px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.example-code {
  font-size: 11px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background: var(--gray-200);
  color: var(--text-primary);
  padding: 2px 4px;
  border-radius: 2px;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .command-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .command-syntax {
    align-self: stretch;
  }
}
</style>