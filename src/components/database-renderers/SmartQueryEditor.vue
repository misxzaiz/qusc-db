<template>
  <div class="smart-query-editor" :class="`db-${currentDbType.toLowerCase()}`">
    <!-- 编辑器工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <!-- 数据库类型指示器 -->
        <div class="db-indicator" :class="`db-${currentDbType.toLowerCase()}`">
          <Icon :name="getDbIcon(currentDbType)" />
          <span>{{ currentDbType }}</span>
        </div>
        
        <!-- 查询模式切换 -->
        <div class="query-mode-selector" v-if="availableQueryModes.length > 1">
          <select 
            v-model="currentQueryMode"
            class="mode-select"
            @change="handleQueryModeChange"
          >
            <option 
              v-for="mode in availableQueryModes" 
              :key="mode.value"
              :value="mode.value"
            >
              {{ mode.label }}
            </option>
          </select>
        </div>
      </div>

      <div class="toolbar-right">
        <!-- 编辑器操作 -->
        <button 
          class="toolbar-btn"
          @click="formatQuery"
          :disabled="isFormatting || !canFormat"
          title="格式化查询"
        >
          <Icon :name="isFormatting ? 'loading' : 'code'" :class="{ spinning: isFormatting }" />
        </button>
        
        <button 
          class="toolbar-btn"
          @click="explainQuery"
          :disabled="!hasContent || isExplaining"
          title="解释查询"
        >
          <Icon :name="isExplaining ? 'loading' : 'help-circle'" :class="{ spinning: isExplaining }" />
        </button>
        
        <button 
          class="toolbar-btn"
          @click="optimizeQuery"
          :disabled="!hasContent || isOptimizing"
          title="AI优化查询"
        >
          <Icon :name="isOptimizing ? 'loading' : 'zap'" :class="{ spinning: isOptimizing }" />
        </button>
        
        <div class="separator"></div>
        
        <!-- 执行按钮 -->
        <button 
          class="execute-btn"
          :class="{ executing: isExecuting }"
          @click="executeQuery"
          :disabled="!canExecute || isExecuting"
          :title="executeTooltip"
        >
          <Icon :name="isExecuting ? 'loading' : 'play'" :class="{ spinning: isExecuting }" />
          {{ executeButtonText }}
        </button>
      </div>
    </div>

    <!-- 主编辑器区域 -->
    <div class="editor-main" ref="editorContainer">
      <!-- CodeMirror编辑器 -->
      <div 
        ref="editorElement" 
        class="codemirror-container"
        :style="editorStyles"
      ></div>
      
      <!-- 智能提示面板 -->
      <div 
        v-if="showCompletions && completions.length > 0"
        class="completions-panel"
        :style="completionsPanelStyle"
        ref="completionsPanel"
      >
        <div class="completions-header">
          <Icon name="lightbulb" />
          <span>智能提示</span>
          <button class="close-btn" @click="hideCompletions">
            <Icon name="x" />
          </button>
        </div>
        <div class="completions-list">
          <div 
            v-for="(completion, index) in visibleCompletions"
            :key="index"
            class="completion-item"
            :class="{ 
              active: index === selectedCompletionIndex,
              [`category-${completion.category.toLowerCase()}`]: true
            }"
            @click="selectCompletion(completion)"
            @mouseenter="selectedCompletionIndex = index"
          >
            <div class="completion-icon">
              <Icon :name="getCompletionIcon(completion.category)" />
            </div>
            <div class="completion-content">
              <div class="completion-text">{{ completion.text }}</div>
              <div class="completion-description">{{ completion.description }}</div>
            </div>
            <div class="completion-score">{{ completion.score }}</div>
          </div>
        </div>
      </div>

      <!-- 查询历史面板 -->
      <div 
        v-if="showHistory"
        class="history-panel"
        ref="historyPanel"
      >
        <div class="history-header">
          <Icon name="history" />
          <span>查询历史</span>
          <button class="close-btn" @click="showHistory = false">
            <Icon name="x" />
          </button>
        </div>
        <div class="history-list">
          <div 
            v-for="(query, index) in queryHistory"
            :key="index"
            class="history-item"
            :class="{ recent: index < 3 }"
            @click="useHistoryQuery(query)"
          >
            <div class="history-query">
              {{ truncateQuery(query.query) }}
            </div>
            <div class="history-meta">
              <span class="history-time">{{ formatTime(query.timestamp) }}</span>
              <span class="history-status" :class="{ success: query.success, error: !query.success }">
                {{ query.success ? '✓' : '✗' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 模板面板 -->
      <div 
        v-if="showTemplates"
        class="templates-panel"
        ref="templatesPanel"
      >
        <div class="templates-header">
          <Icon name="file-text" />
          <span>查询模板</span>
          <button class="close-btn" @click="showTemplates = false">
            <Icon name="x" />
          </button>
        </div>
        <div class="templates-categories">
          <div 
            v-for="category in templateCategories"
            :key="category"
            class="template-category"
          >
            <div class="category-header" @click="toggleTemplateCategory(category)">
              <Icon name="folder" />
              <span>{{ category }}</span>
              <Icon 
                name="chevron-right" 
                :class="{ rotated: expandedCategories.has(category) }"
              />
            </div>
            <div 
              v-if="expandedCategories.has(category)"
              class="category-templates"
            >
              <div 
                v-for="template in getTemplatesByCategory(category)"
                :key="template.name"
                class="template-item"
                @click="useTemplate(template)"
              >
                <div class="template-name">{{ template.name }}</div>
                <div class="template-description">{{ template.description }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑器状态栏 -->
    <div class="editor-statusbar">
      <div class="status-left">
        <span class="cursor-position" v-if="cursorPosition">
          行 {{ cursorPosition.line }}, 列 {{ cursorPosition.col }}
        </span>
        <span class="query-length">{{ queryLength }} 字符</span>
        <span v-if="selectedText" class="selected-text">已选择 {{ selectedText }} 字符</span>
      </div>
      
      <div class="status-right">
        <button 
          class="status-btn"
          @click="toggleHistory"
          :class="{ active: showHistory }"
          title="查询历史"
        >
          <Icon name="history" />
        </button>
        
        <button 
          class="status-btn"
          @click="toggleTemplates"
          :class="{ active: showTemplates }"
          title="查询模板"
        >
          <Icon name="file-text" />
        </button>
        
        <button 
          class="status-btn"
          @click="toggleSettings"
          title="编辑器设置"
        >
          <Icon name="settings" />
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { sql } from '@codemirror/lang-sql'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { autocompletion, completionKeymap } from '@codemirror/autocomplete'
import { keymap } from '@codemirror/view'
import { indentWithTab } from '@codemirror/commands'
import Icon from '@/components/common/Icon.vue'

export default {
  name: 'SmartQueryEditor',
  components: {
    Icon
  },
  props: {
    // 数据库类型
    dbType: {
      type: String,
      required: true,
      validator: (type) => ['MySQL', 'PostgreSQL', 'Redis', 'MongoDB', 'SQLite'].includes(type)
    },
    // 连接ID
    connectionId: {
      type: String,
      required: true
    },
    // 初始查询内容
    initialQuery: {
      type: String,
      default: ''
    },
    // 编辑器选项
    theme: {
      type: String,
      default: 'light', // 'light' | 'dark'
    },
    fontSize: {
      type: Number,
      default: 14
    },
    height: {
      type: String,
      default: '300px'
    },
    // 功能开关
    enableAutocompletion: {
      type: Boolean,
      default: true
    },
    enableFormatting: {
      type: Boolean,
      default: true
    },
    enableAI: {
      type: Boolean,
      default: true
    },
    readOnly: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    'query-execute',
    'query-change',
    'query-format',
    'query-explain',
    'query-optimize'
  ],
  setup(props, { emit }) {
    // 响应式数据
    const editorElement = ref(null)
    const editorContainer = ref(null)
    const completionsPanel = ref(null)
    const historyPanel = ref(null)
    const templatesPanel = ref(null)
    
    const editorView = ref(null)
    const currentQuery = ref(props.initialQuery)
    const currentQueryMode = ref('sql')
    const cursorPosition = ref({ line: 1, col: 1 })
    const selectedText = ref(0)
    
    const isExecuting = ref(false)
    const isFormatting = ref(false)
    const isExplaining = ref(false)
    const isOptimizing = ref(false)
    
    const showCompletions = ref(false)
    const showHistory = ref(false)
    const showTemplates = ref(false)
    const completions = ref([])
    const selectedCompletionIndex = ref(0)
    const completionsPanelStyle = ref({})
    
    const queryHistory = ref([])
    const expandedCategories = ref(new Set(['基础查询']))

    // 计算属性
    const currentDbType = computed(() => props.dbType)
    
    const availableQueryModes = computed(() => {
      const modes = {
        MySQL: [
          { value: 'sql', label: 'SQL查询' },
          { value: 'procedure', label: '存储过程' }
        ],
        PostgreSQL: [
          { value: 'sql', label: 'SQL查询' },
          { value: 'plpgsql', label: 'PL/pgSQL' }
        ],
        Redis: [
          { value: 'redis', label: 'Redis命令' },
          { value: 'lua', label: 'Lua脚本' }
        ],
        MongoDB: [
          { value: 'mongo', label: 'MongoDB查询' },
          { value: 'aggregation', label: '聚合管道' },
          { value: 'javascript', label: 'JavaScript' }
        ],
        SQLite: [
          { value: 'sql', label: 'SQL查询' }
        ]
      }
      return modes[currentDbType.value] || [{ value: 'sql', label: 'SQL' }]
    })

    const hasContent = computed(() => currentQuery.value.trim().length > 0)
    
    const queryLength = computed(() => currentQuery.value.length)
    
    const canExecute = computed(() => {
      return hasContent.value && props.connectionId && !props.readOnly
    })
    
    const canFormat = computed(() => {
      return hasContent.value && props.enableFormatting && 
        ['sql', 'mongo', 'javascript'].includes(currentQueryMode.value)
    })
    
    const executeButtonText = computed(() => {
      if (isExecuting.value) return '执行中...'
      if (currentDbType.value === 'Redis') return '发送命令'
      if (currentDbType.value === 'MongoDB') return '执行查询'
      return '执行查询'
    })
    
    const executeTooltip = computed(() => {
      if (!canExecute.value) return '请输入查询内容'
      return `${executeButtonText.value} (Ctrl+Enter)`
    })

    const visibleCompletions = computed(() => {
      return completions.value.slice(0, 10) // 限制显示数量
    })

    const templateCategories = computed(() => {
      const categories = {
        MySQL: ['基础查询', 'JOIN查询', 'DDL操作', '存储过程'],
        PostgreSQL: ['基础查询', 'JSON操作', '窗口函数', 'CTE查询'],
        Redis: ['字符串操作', '哈希操作', '列表操作', '集合操作'],
        MongoDB: ['文档查询', '聚合管道', '索引操作', '数据建模'],
        SQLite: ['基础查询', 'FTS搜索', 'JSON扩展']
      }
      return categories[currentDbType.value] || ['基础查询']
    })

    const editorStyles = computed(() => ({
      height: props.height,
      fontSize: `${props.fontSize}px`,
      '--db-primary': getDbThemeColor(currentDbType.value).primary,
      '--db-accent': getDbThemeColor(currentDbType.value).accent
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

    const getDbThemeColor = (dbType) => {
      const themes = {
        MySQL: { primary: '#00758f', accent: '#f29111' },
        PostgreSQL: { primary: '#336791', accent: '#ffffff' },
        Redis: { primary: '#dc2626', accent: '#ffffff' },
        MongoDB: { primary: '#47a248', accent: '#ffffff' },
        SQLite: { primary: '#003b57', accent: '#ffffff' }
      }
      return themes[dbType] || themes.MySQL
    }

    const getCompletionIcon = (category) => {
      const icons = {
        Keyword: 'code',
        Table: 'table',
        Column: 'columns',
        Function: 'function',
        Command: 'terminal',
        Template: 'file-text'
      }
      return icons[category] || 'lightbulb'
    }

    const createEditor = () => {
      if (!editorElement.value) return

      // 根据数据库类型选择语言支持
      let languageSupport
      switch (currentDbType.value) {
        case 'MongoDB':
          if (currentQueryMode.value === 'javascript') {
            languageSupport = javascript()
          } else {
            languageSupport = sql() // MongoDB查询语法类似SQL
          }
          break
        case 'Redis':
          languageSupport = sql() // Redis命令的基础支持
          break
        default:
          languageSupport = sql()
      }

      // 创建自动补全功能
      const customCompletions = (context) => {
        return getCompletionsForContext(context)
      }

      const extensions = [
        basicSetup,
        languageSupport,
        keymap.of([
          ...completionKeymap,
          indentWithTab,
          {
            key: 'Ctrl-Enter',
            run: () => {
              executeQuery()
              return true
            }
          },
          {
            key: 'Ctrl-Space', 
            run: () => {
              triggerAutocompletion()
              return true
            }
          },
          {
            key: 'F1',
            run: () => {
              explainQuery()
              return true
            }
          }
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newQuery = update.state.doc.toString()
            currentQuery.value = newQuery
            emit('query-change', newQuery)
            
            // 触发智能提示
            if (props.enableAutocompletion) {
              debounceAutocompletion()
            }
          }
          
          if (update.selectionSet) {
            updateCursorPosition(update.state)
          }
        }),
        EditorView.theme({
          '&': {
            fontSize: `${props.fontSize}px`,
          },
          '.cm-focused': {
            outline: `2px solid ${getDbThemeColor(currentDbType.value).primary}20`
          },
          '.cm-editor.cm-focused .cm-cursor': {
            borderLeftColor: getDbThemeColor(currentDbType.value).primary
          },
          '.cm-selectionBackground': {
            backgroundColor: `${getDbThemeColor(currentDbType.value).primary}20`
          }
        })
      ]

      // 添加主题
      if (props.theme === 'dark') {
        extensions.push(oneDark)
      }

      // 添加自动补全
      if (props.enableAutocompletion) {
        extensions.push(autocompletion({
          override: [customCompletions]
        }))
      }

      const state = EditorState.create({
        doc: props.initialQuery,
        extensions
      })

      editorView.value = new EditorView({
        state,
        parent: editorElement.value
      })
    }

    const getCompletionsForContext = async (context) => {
      try {
        // 检查是否在Tauri环境中
        const isTauriEnvironment = typeof window !== 'undefined' &&
          window.__TAURI__ &&
          typeof window.__TAURI__.core?.invoke === 'function'

        if (isTauriEnvironment) {
          const suggestions = await window.__TAURI__.core.invoke('get_query_suggestions', {
            connectionId: props.connectionId,
            context: context.state.doc.toString(),
            dbType: currentDbType.value
          })
          
          return {
            from: context.pos,
            options: suggestions.map(suggestion => ({
              label: suggestion.text,
              detail: suggestion.description,
              type: suggestion.category.toLowerCase()
            }))
          }
        } else {
          return null
        }
      } catch (err) {
        console.warn('Failed to get completions:', err)
        return null
      }
    }

    const updateCursorPosition = (state) => {
      const pos = state.selection.main.head
      const line = state.doc.lineAt(pos)
      cursorPosition.value = {
        line: line.number,
        col: pos - line.from + 1
      }
      
      const selection = state.selection.main
      selectedText.value = selection.to - selection.from
    }

    const debounceAutocompletion = (() => {
      let timer = null
      return () => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          triggerAutocompletion()
        }, 300)
      }
    })()

    const triggerAutocompletion = async () => {
      if (!props.enableAutocompletion || !editorView.value) return

      try {
        // 检查是否在Tauri环境中
        const isTauriEnvironment = typeof window !== 'undefined' &&
          window.__TAURI__ &&
          typeof window.__TAURI__.core?.invoke === 'function'

        if (isTauriEnvironment) {
          const query = currentQuery.value
          const suggestions = await window.__TAURI__.core.invoke('get_query_suggestions', {
            connectionId: props.connectionId,
            context: query
          })
          
          completions.value = suggestions
          selectedCompletionIndex.value = 0
          
          if (suggestions.length > 0) {
            showCompletions.value = true
            await nextTick()
            updateCompletionsPanelPosition()
          }
        }
      } catch (err) {
        console.warn('Failed to get suggestions:', err)
      }
    }

    const updateCompletionsPanelPosition = () => {
      if (!editorView.value || !completionsPanel.value) return
      
      const cursor = editorView.value.state.selection.main.head
      const coords = editorView.value.coordsAtPos(cursor)
      
      if (coords) {
        completionsPanelStyle.value = {
          position: 'absolute',
          left: `${coords.left}px`,
          top: `${coords.bottom + 5}px`,
          zIndex: 1000
        }
      }
    }

    const selectCompletion = (completion) => {
      if (!editorView.value) return
      
      const view = editorView.value
      const transaction = view.state.update({
        changes: {
          from: view.state.selection.main.head,
          insert: completion.text
        }
      })
      
      view.dispatch(transaction)
      hideCompletions()
      view.focus()
    }

    const hideCompletions = () => {
      showCompletions.value = false
      completions.value = []
    }

    const handleQueryModeChange = () => {
      // 重新创建编辑器以应用新的语言支持
      if (editorView.value) {
        editorView.value.destroy()
        createEditor()
      }
    }

    const executeQuery = () => {
      if (!canExecute.value) return
      
      isExecuting.value = true
      
      // 保存到历史记录
      addToHistory(currentQuery.value)
      
      emit('query-execute', {
        query: currentQuery.value,
        mode: currentQueryMode.value,
        dbType: currentDbType.value
      })
      
      // 模拟执行完成（实际应该在父组件中处理）
      setTimeout(() => {
        isExecuting.value = false
      }, 1000)
    }

    const formatQuery = async () => {
      if (!canFormat.value) return
      
      isFormatting.value = true
      try {
        // 检查是否在Tauri环境中
        const isTauriEnvironment = typeof window !== 'undefined' &&
          window.__TAURI__ &&
          typeof window.__TAURI__.core?.invoke === 'function'

        if (isTauriEnvironment) {
          const formatted = await window.__TAURI__.core.invoke('format_query', {
            query: currentQuery.value,
            dbType: currentDbType.value,
            mode: currentQueryMode.value
          })
          
          if (editorView.value) {
            const transaction = editorView.value.state.update({
              changes: {
                from: 0,
                to: editorView.value.state.doc.length,
                insert: formatted
              }
            })
            editorView.value.dispatch(transaction)
          }
          
          emit('query-format', formatted)
        }
      } catch (err) {
        console.error('Format failed:', err)
      } finally {
        isFormatting.value = false
      }
    }

    const explainQuery = async () => {
      if (!hasContent.value) return
      
      isExplaining.value = true
      try {
        // 检查是否在Tauri环境中
        const isTauriEnvironment = typeof window !== 'undefined' &&
          window.__TAURI__ &&
          typeof window.__TAURI__.core?.invoke === 'function'

        if (isTauriEnvironment) {
          const explanation = await window.__TAURI__.core.invoke('explain_query', {
            query: currentQuery.value,
            dbType: currentDbType.value
          })
          
          emit('query-explain', explanation)
        }
      } catch (err) {
        console.error('Explain failed:', err)
      } finally {
        isExplaining.value = false
      }
    }

    const optimizeQuery = async () => {
      if (!hasContent.value || !props.enableAI) return
      
      isOptimizing.value = true
      try {
        // 检查是否在Tauri环境中
        const isTauriEnvironment = typeof window !== 'undefined' &&
          window.__TAURI__ &&
          typeof window.__TAURI__.core?.invoke === 'function'

        if (isTauriEnvironment) {
          const optimized = await window.__TAURI__.core.invoke('ai_optimize_sql', {
            sql: currentQuery.value,
            connectionId: props.connectionId
          })
          
          emit('query-optimize', optimized)
        }
      } catch (err) {
        console.error('Optimize failed:', err)
      } finally {
        isOptimizing.value = false
      }
    }

    const addToHistory = (query) => {
      const historyItem = {
        query,
        timestamp: Date.now(),
        success: true, // 这个应该从执行结果中获取
        dbType: currentDbType.value
      }
      
      queryHistory.value.unshift(historyItem)
      if (queryHistory.value.length > 50) {
        queryHistory.value = queryHistory.value.slice(0, 50)
      }
    }

    const useHistoryQuery = (historyItem) => {
      if (editorView.value) {
        const transaction = editorView.value.state.update({
          changes: {
            from: 0,
            to: editorView.value.state.doc.length,
            insert: historyItem.query
          }
        })
        editorView.value.dispatch(transaction)
      }
      showHistory.value = false
    }

    const truncateQuery = (query) => {
      const maxLength = 100
      if (query.length <= maxLength) return query
      return query.substring(0, maxLength) + '...'
    }

    const formatTime = (timestamp) => {
      const date = new Date(timestamp)
      const now = new Date()
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / 60000)
      
      if (diffMins < 1) return '刚刚'
      if (diffMins < 60) return `${diffMins}分钟前`
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小时前`
      return date.toLocaleDateString()
    }

    const toggleHistory = () => {
      showHistory.value = !showHistory.value
      if (showHistory.value) {
        showTemplates.value = false
      }
    }

    const toggleTemplates = () => {
      showTemplates.value = !showTemplates.value
      if (showTemplates.value) {
        showHistory.value = false
      }
    }

    const toggleSettings = () => {
      // 打开编辑器设置对话框
      console.log('Toggle editor settings')
    }

    const toggleTemplateCategory = (category) => {
      if (expandedCategories.value.has(category)) {
        expandedCategories.value.delete(category)
      } else {
        expandedCategories.value.add(category)
      }
    }

    const getTemplatesByCategory = (category) => {
      // 这里应该从配置或API获取模板
      const templates = {
        '基础查询': [
          {
            name: 'SELECT查询',
            description: '基础的SELECT语句',
            template: 'SELECT * FROM table_name WHERE condition;'
          },
          {
            name: 'INSERT插入',
            description: '插入新记录',
            template: 'INSERT INTO table_name (column1, column2) VALUES (value1, value2);'
          }
        ]
        // ... 更多模板
      }
      return templates[category] || []
    }

    const useTemplate = (template) => {
      if (editorView.value) {
        const transaction = editorView.value.state.update({
          changes: {
            from: 0,
            to: editorView.value.state.doc.length,
            insert: template.template
          }
        })
        editorView.value.dispatch(transaction)
      }
      showTemplates.value = false
    }

    // 监听props变化
    watch(() => props.initialQuery, (newQuery) => {
      if (editorView.value && newQuery !== currentQuery.value) {
        const transaction = editorView.value.state.update({
          changes: {
            from: 0,
            to: editorView.value.state.doc.length,
            insert: newQuery
          }
        })
        editorView.value.dispatch(transaction)
      }
    })

    watch(() => props.theme, () => {
      // 重新创建编辑器以应用新主题
      if (editorView.value) {
        editorView.value.destroy()
        createEditor()
      }
    })

    onMounted(() => {
      nextTick(() => {
        createEditor()
      })
    })

    onUnmounted(() => {
      if (editorView.value) {
        editorView.value.destroy()
      }
    })

    return {
      // refs
      editorElement,
      editorContainer,
      completionsPanel,
      historyPanel,
      templatesPanel,
      // reactive data
      currentQuery,
      currentQueryMode,
      cursorPosition,
      selectedText,
      isExecuting,
      isFormatting,
      isExplaining,
      isOptimizing,
      showCompletions,
      showHistory,
      showTemplates,
      completions,
      selectedCompletionIndex,
      completionsPanelStyle,
      queryHistory,
      expandedCategories,
      // computed
      currentDbType,
      availableQueryModes,
      hasContent,
      queryLength,
      canExecute,
      canFormat,
      executeButtonText,
      executeTooltip,
      visibleCompletions,
      templateCategories,
      editorStyles,
      // methods
      getDbIcon,
      getCompletionIcon,
      handleQueryModeChange,
      executeQuery,
      formatQuery,
      explainQuery,
      optimizeQuery,
      triggerAutocompletion,
      selectCompletion,
      hideCompletions,
      useHistoryQuery,
      truncateQuery,
      formatTime,
      toggleHistory,
      toggleTemplates,
      toggleSettings,
      toggleTemplateCategory,
      getTemplatesByCategory,
      useTemplate
    }
  }
}
</script>

<style lang="scss" scoped>
.smart-query-editor {
  display: flex;
  flex-direction: column;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  overflow: hidden;
  background: #ffffff;
  
  // 数据库特定样式
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

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  
  .toolbar-left {
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
    
    .mode-select {
      padding: 0.375rem 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      background: white;
      font-size: 0.875rem;
      
      &:focus {
        outline: none;
        border-color: var(--db-primary);
        box-shadow: 0 0 0 2px rgba(var(--db-primary), 0.1);
      }
    }
  }
  
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    
    .toolbar-btn {
      padding: 0.375rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      background: white;
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
    
    .separator {
      width: 1px;
      height: 24px;
      background: #e2e8f0;
      margin: 0 0.25rem;
    }
    
    .execute-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border: 1px solid var(--db-primary);
      border-radius: 0.375rem;
      background: var(--db-primary);
      color: white;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover:not(:disabled) {
        background: color-mix(in srgb, var(--db-primary) 90%, black);
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      &.executing {
        .spinning {
          animation: spin 1s linear infinite;
        }
      }
    }
  }
}

.editor-main {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.codemirror-container {
  height: 100%;
  
  :deep(.cm-editor) {
    height: 100%;
  }
  
  :deep(.cm-focused) {
    outline: none;
  }
  
  :deep(.cm-line) {
    line-height: 1.6;
  }
}

.completions-panel, .history-panel, .templates-panel {
  position: absolute;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-width: 400px;
  max-height: 300px;
  overflow: hidden;
}

.completions-panel {
  .completions-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    font-size: 0.875rem;
    font-weight: 600;
    
    .close-btn {
      margin-left: auto;
      padding: 0.125rem;
      border: none;
      background: transparent;
      color: #6b7280;
      cursor: pointer;
      border-radius: 0.25rem;
      
      &:hover {
        background: #e2e8f0;
      }
    }
  }
  
  .completions-list {
    max-height: 200px;
    overflow-y: auto;
    
    .completion-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      border-bottom: 1px solid #f1f5f9;
      
      &:hover, &.active {
        background: #f8fafc;
      }
      
      &.category-keyword { .completion-icon { color: #8b5cf6; } }
      &.category-table { .completion-icon { color: #3b82f6; } }
      &.category-column { .completion-icon { color: #10b981; } }
      &.category-function { .completion-icon { color: #f59e0b; } }
      
      .completion-content {
        flex: 1;
        min-width: 0;
        
        .completion-text {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.875rem;
          font-weight: 600;
          color: #1f2937;
        }
        
        .completion-description {
          font-size: 0.75rem;
          color: #6b7280;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
      
      .completion-score {
        font-size: 0.75rem;
        color: #9ca3af;
        min-width: 30px;
        text-align: right;
      }
    }
  }
}

.history-panel, .templates-panel {
  right: 1rem;
  bottom: 3rem;
  width: 350px;
  
  .history-header, .templates-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    font-size: 0.875rem;
    font-weight: 600;
    
    .close-btn {
      margin-left: auto;
      padding: 0.125rem;
      border: none;
      background: transparent;
      color: #6b7280;
      cursor: pointer;
      border-radius: 0.25rem;
      
      &:hover {
        background: #e2e8f0;
      }
    }
  }
  
  .history-list {
    max-height: 250px;
    overflow-y: auto;
    
    .history-item {
      padding: 0.75rem;
      cursor: pointer;
      border-bottom: 1px solid #f1f5f9;
      transition: background-color 0.2s;
      
      &:hover {
        background: #f8fafc;
      }
      
      &.recent {
        background: linear-gradient(90deg, rgba(59, 130, 246, 0.05) 0%, transparent 100%);
        border-left: 3px solid #3b82f6;
      }
      
      .history-query {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.875rem;
        color: #1f2937;
        margin-bottom: 0.25rem;
        line-height: 1.4;
      }
      
      .history-meta {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        color: #6b7280;
        
        .history-status {
          &.success { color: #10b981; }
          &.error { color: #ef4444; }
        }
      }
    }
  }
  
  .templates-categories {
    max-height: 250px;
    overflow-y: auto;
    
    .template-category {
      .category-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        background: #f8fafc;
        border-bottom: 1px solid #f1f5f9;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 600;
        
        &:hover {
          background: #f1f5f9;
        }
        
        .icon:last-child {
          margin-left: auto;
          transition: transform 0.2s;
          
          &.rotated {
            transform: rotate(90deg);
          }
        }
      }
      
      .category-templates {
        .template-item {
          padding: 0.75rem;
          cursor: pointer;
          border-bottom: 1px solid #f1f5f9;
          
          &:hover {
            background: #f8fafc;
          }
          
          .template-name {
            font-size: 0.875rem;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 0.25rem;
          }
          
          .template-description {
            font-size: 0.75rem;
            color: #6b7280;
          }
        }
      }
    }
  }
}

.editor-statusbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  font-size: 0.75rem;
  color: #64748b;
  
  .status-left {
    display: flex;
    gap: 1rem;
  }
  
  .status-right {
    display: flex;
    gap: 0.25rem;
    
    .status-btn {
      padding: 0.25rem;
      border: none;
      background: transparent;
      color: #6b7280;
      cursor: pointer;
      border-radius: 0.25rem;
      transition: all 0.2s;
      
      &:hover {
        background: #e2e8f0;
        color: #374151;
      }
      
      &.active {
        background: var(--db-primary);
        color: white;
      }
    }
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>