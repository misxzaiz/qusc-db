<template>
  <div class="markdown-renderer" :class="{ compact: isCompact }">
    <div 
      v-html="renderedContent" 
      class="markdown-content"
      @click="handleContentClick"
    ></div>
  </div>
</template>

<script setup>
import { computed, nextTick } from 'vue'
import { marked } from 'marked'
import { SyntaxHighlighter } from '@/utils/syntaxHighlighter.js'
import { useConnectionStore } from '@/stores/connection.js'
import { useQueryExecution } from '@/components/workspace/composables/useQueryExecution.js'
import { useNotificationStore } from '@/stores/notification.js'

// Stores
const connectionStore = useConnectionStore()
const notificationStore = useNotificationStore()

// Query execution composable
const { executeQuery, isExecuting } = useQueryExecution()

// Props
const props = defineProps({
  content: {
    type: String,
    required: true
  },
  isCompact: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['copy-code', 'sql-executed'])

// 创建语法高亮器实例
const highlighter = new SyntaxHighlighter()

// 配置marked选项
const markedOptions = {
  breaks: true,
  gfm: true,
  tables: true,
  sanitize: false,
  silent: false, // 显示错误而不是默默失败
  async: false,  // 确保同步处理
  walkTokens: null // 禁用token遍历，避免意外修改
}

// 自定义渲染器
const renderer = new marked.Renderer()

// 自定义代码块渲染（简化版，避免HTML转义问题）
renderer.code = (code, language) => {
  // 使用安全的字符串转换
  let codeContent = safeToString(code)
  const langValue = safeToString(language)
  
  // 清理代码内容：移除可能残留的```标记
  codeContent = codeContent
    .replace(/^```\w*\n?/, '')     // 移除开头的```xxx
    .replace(/\n?```$/, '')        // 移除结尾的```
    .replace(/```\w*$/, '')        // 移除单独的```xxx（没有换行）
    .replace(/^```/, '')           // 移除开头单独的```
    .trim()
  
  // 自动检测语言（优先使用明确指定的语言）
  let detectedLang = 'text'
  if (langValue && langValue !== 'text') {
    detectedLang = langValue.toLowerCase()
  } else {
    detectedLang = highlighter.detectLanguage(codeContent)
  }
  
  const langClass = `language-${detectedLang}`
  
  // 简单转义，不进行语法高亮以避免嵌套HTML问题
  const escapedCode = escapeHtml(codeContent)
  
  // 基础复制按钮
  const copyBtn = `<button class="copy-code-btn" data-code="${codeContent}" title="复制代码">📋</button>`
  
  // 检测是否为SQL代码
  const isSqlCode = detectedLang === 'sql' || 
                   /^\s*(select|insert|update|delete|create|alter|drop|show|describe|explain)/i.test(codeContent)
  
  // 为SQL代码块添加执行按钮
  const executeBtn = isSqlCode ? 
    `<button class="execute-sql-btn" data-sql="${codeContent}" title="执行SQL">▶️</button>` : ''
  
  return `
    <div class="code-block-wrapper" ${isSqlCode ? 'data-sql-block="true"' : ''}>
      <div class="code-block-header">
        <span class="code-language">${detectedLang.toUpperCase()}</span>
        <div class="code-block-actions">
          ${executeBtn}
          ${copyBtn}
        </div>
      </div>
      <pre class="code-block ${langClass}"><code>${escapedCode}</code></pre>
      <div class="sql-result-container" style="display: none;">
        <div class="result-header">
          <span class="result-title">执行结果</span>
          <button class="close-result-btn" title="关闭结果">✕</button>
        </div>
        <div class="result-content"></div>
      </div>
    </div>
  `
}

// 自定义行内代码渲染（简化版）
renderer.codespan = (code) => {
  // 使用安全的字符串转换并简单转义
  const codeContent = safeToString(code)
  const escapedCode = escapeHtml(codeContent)
  
  return `<code class="inline-code">${escapedCode}</code>`
}

// 自定义表格渲染（增强功能）
renderer.table = (header, body) => {
  // 处理新版marked.js的表格token结构
  if (header && typeof header === 'object' && header.header && header.rows) {
    // 新的token结构：header包含了完整的表格数据
    const tableData = header
    const headerRow = tableData.header || []
    const bodyRows = tableData.rows || []
    const aligns = tableData.align || []
    
    // 生成表头HTML
    const headerHtml = headerRow.length > 0 ? 
      `<thead><tr>${headerRow.map((cell, index) => {
        const align = aligns[index]
        const alignAttr = align ? ` style="text-align: ${align}"` : ''
        const cellText = cell && cell.text ? cell.text : safeToString(cell)
        return `<th${alignAttr}>${cellText}</th>`
      }).join('')}</tr></thead>` : ''
    
    // 生成表体HTML
    const bodyHtml = bodyRows.length > 0 ?
      `<tbody>${bodyRows.map(row => 
        `<tr>${row.map((cell, index) => {
          const align = aligns[index]
          const alignAttr = align ? ` style="text-align: ${align}"` : ''
          const cellText = cell && cell.text ? cell.text : safeToString(cell)
          return `<td${alignAttr}>${cellText}</td>`
        }).join('')}</tr>`
      ).join('')}</tbody>` : ''
    
    return `
      <div class="table-wrapper">
        <div class="table-controls">
          <button class="table-control-btn" onclick="this.closest('.table-wrapper').classList.toggle('compact-table')" title="切换紧凑模式">📐</button>
          <button class="table-control-btn" onclick="copyTableData(this)" title="复制表格数据">📋</button>
        </div>
        <div class="table-container">
          <table class="enhanced-table">
            ${headerHtml}
            ${bodyHtml}
          </table>
        </div>
      </div>
    `
  }
  
  // 降级处理：传统的HTML字符串方式（兼容旧版本）
  const headerContent = safeToString(header).trim()
  const bodyContent = safeToString(body).trim()
  
  // 确保表格内容不为空
  if (!headerContent && !bodyContent) {
    return '<div class="table-wrapper"><p>表格内容为空</p></div>'
  }
  
  return `
    <div class="table-wrapper">
      <div class="table-controls">
        <button class="table-control-btn" onclick="this.closest('.table-wrapper').classList.toggle('compact-table')" title="切换紧凑模式">📐</button>
        <button class="table-control-btn" onclick="copyTableData(this)" title="复制表格数据">📋</button>
      </div>
      <div class="table-container">
        <table class="enhanced-table">
          ${headerContent ? `<thead>${headerContent}</thead>` : ''}
          ${bodyContent ? `<tbody>${bodyContent}</tbody>` : ''}
        </table>
      </div>
    </div>
  `
}

// 自定义列表渲染
renderer.list = (body, ordered, start) => {
  // 使用安全的字符串转换
  const bodyContent = safeToString(body)
  const tag = ordered ? 'ol' : 'ul'
  const className = ordered ? 'ordered-list' : 'unordered-list'
  const startAttr = (ordered && start !== 1) ? ` start="${start}"` : ''
  
  return `<${tag}${startAttr} class="${className}">${bodyContent}</${tag}>`
}

// 自定义引用块渲染
renderer.blockquote = (quote) => {
  // 使用安全的字符串转换
  const quoteContent = safeToString(quote)
  return `<blockquote class="enhanced-blockquote">💡 ${quoteContent}</blockquote>`
}

// 自定义标题渲染（带锚点）
renderer.heading = (text, level) => {
  // 使用安全的字符串转换
  const textContent = safeToString(text).trim()
  
  if (!textContent) {
    return `<h${level} class="heading-${level}">未命名标题</h${level}>`
  }
  
  // 清理HTML标签和特殊字符生成锚点ID
  const cleanText = textContent.replace(/<[^>]*>/g, '') // 移除HTML标签
  const anchor = cleanText
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '') // 只保留字母、数字、中文、空格和连字符
    .replace(/\s+/g, '-') // 空格转连字符
    .replace(/-+/g, '-') // 多个连字符合并
    .replace(/^-+|-+$/g, '') // 删除首尾连字符
  
  // 如果锚点为空，使用默认值
  const finalAnchor = anchor || `heading-${level}-${Date.now()}`
  
  return `<h${level} id="${finalAnchor}" class="heading-${level}">
    <a href="#${finalAnchor}" class="heading-anchor" title="复制链接">#</a>
    ${textContent}
  </h${level}>`
}

// 设置自定义渲染器
marked.setOptions({
  ...markedOptions,
  renderer
})

// 调试函数：分析问题内容
const analyzeContent = (content) => {
  const info = {
    type: typeof content,
    isString: typeof content === 'string',
    length: content ? String(content).length : 0,
    hasType: !!(content && content.type),
    hasRaw: !!(content && content.raw),
    hasText: !!(content && content.text),
    preview: String(content).substring(0, 100)
  }
  
  if (content && typeof content === 'object') {
    info.keys = Object.keys(content)
    if (content.type) info.tokenType = content.type
  }
  
  return info
}

// 计算渲染后的内容
const renderedContent = computed(() => {
  try {
    // 使用安全的字符串转换
    const content = safeToString(props.content)
    
    if (!content) {
      return '<p class="render-error">思考中...</p>'
    }
    
    // 确保marked.parse返回字符串而不是token
    const result = marked.parse(content)
    
    // 如果结果不是字符串，说明可能是token对象，需要进一步处理
    if (typeof result !== 'string') {
      console.warn('marked.parse返回了非字符串结果:', result)
      
      // 尝试使用marked的lexer和parser分别处理
      const tokens = marked.lexer(content)
      const htmlResult = marked.parser(tokens)
      
      if (typeof htmlResult === 'string') {
        return htmlResult
      }
      
      // 如果还是不行，使用备用方案
      return `<div class="render-fallback">
        <p>内容渲染遇到问题，使用简化显示：</p>
        <pre>${escapeHtml(content)}</pre>
      </div>`
    }
    
    return result
  } catch (error) {
    console.error('Markdown渲染错误:', error)
    console.error('原始内容:', props.content)
    
    // 提供更详细的错误信息，但对用户友好
    const errorMessage = error.message || '未知错误'
    return `<div class="render-error">
      <p>内容渲染出错: ${errorMessage}</p>
      <details style="margin-top: 8px; font-size: 11px; color: #6b7280;">
        <summary>原始内容（调试用）</summary>
        <pre style="white-space: pre-wrap; margin-top: 4px;">${escapeHtml(props.content)}</pre>
      </details>
    </div>`
  }
})

// 处理SQL执行
const handleSQLExecution = async (button, sql) => {
  try {
    // 检查连接状态
    const currentConnection = connectionStore.currentConnection
    if (!currentConnection) {
      notificationStore.warning('请先连接数据库')
      return
    }
    
    // 获取代码块容器和结果容器
    const codeBlockWrapper = button.closest('.code-block-wrapper')
    const resultContainer = codeBlockWrapper.querySelector('.sql-result-container')
    const resultContent = resultContainer.querySelector('.result-content')
    
    // 显示执行状态
    const originalText = button.textContent
    button.textContent = '⏳'
    button.disabled = true
    
    // 显示结果容器
    resultContainer.style.display = 'block'
    resultContent.innerHTML = '<div class="loading-spinner">执行中...</div>'
    
    // 执行SQL查询
    const result = await executeQuery(
      currentConnection.id,
      sql.trim(),
      1,
      50,
      true
    )
    
    if (result && result.success !== false) {
      // 渲染查询结果
      let resultHtml = ''
      
      // 处理不同的结果格式
      if (result.columns && result.rows && result.rows.length > 0) {
        // 新格式：{columns: [], rows: []}
        const columns = result.columns
        const rows = result.rows
        
        resultHtml = `
          <div class="query-result-table">
            <div class="result-stats">
              查询成功，返回 ${rows.length} 行数据
              ${result.execution_time ? ` (${result.execution_time}ms)` : ''}
            </div>
            <div class="table-container">
              <table class="result-table">
                <thead>
                  <tr>
                    ${columns.map(col => `<th>${col}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${rows.slice(0, 10).map(row => `
                    <tr>
                      ${row.map(cell => `<td>${cell !== null && cell !== undefined ? String(cell) : '<span class="null-value">NULL</span>'}</td>`).join('')}
                    </tr>
                  `).join('')}
                  ${rows.length > 10 ? `<tr><td colspan="${columns.length}" class="more-rows">... 还有 ${rows.length - 10} 行数据</td></tr>` : ''}
                </tbody>
              </table>
            </div>
          </div>
        `
      } else if (result.data && result.data.length > 0) {
        // 旧格式：{data: [{}]}  
        const columns = Object.keys(result.data[0])
        resultHtml = `
          <div class="query-result-table">
            <div class="result-stats">
              查询成功，返回 ${result.data.length} 行数据
              ${result.executionTime ? ` (${result.executionTime}ms)` : ''}
            </div>
            <div class="table-container">
              <table class="result-table">
                <thead>
                  <tr>
                    ${columns.map(col => `<th>${col}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${result.data.slice(0, 10).map(row => `
                    <tr>
                      ${columns.map(col => `<td>${row[col] !== null ? String(row[col]) : '<span class="null-value">NULL</span>'}</td>`).join('')}
                    </tr>
                  `).join('')}
                  ${result.data.length > 10 ? `<tr><td colspan="${columns.length}" class="more-rows">... 还有 ${result.data.length - 10} 行数据</td></tr>` : ''}
                </tbody>
              </table>
            </div>
          </div>
        `
      } else if (result.affected_rows !== undefined || result.affectedRows !== undefined) {
        // DDL/DML操作结果
        const affectedRows = result.affected_rows || result.affectedRows || 0
        const executionTime = result.execution_time || result.executionTime
        
        resultHtml = `
          <div class="query-result-message">
            <div class="success-message">
              ✅ 执行成功
              ${affectedRows > 0 ? `，影响 ${affectedRows} 行` : ''}
              ${executionTime ? ` (${executionTime}ms)` : ''}
            </div>
          </div>
        `
      } else {
        // 其他成功情况
        const executionTime = result.execution_time || result.executionTime
        resultHtml = `
          <div class="query-result-message">
            <div class="success-message">
              ✅ 执行成功
              ${executionTime ? ` (${executionTime}ms)` : ''}
            </div>
          </div>
        `
      }
      
      resultContent.innerHTML = resultHtml
      
      // 通知父组件
      emit('sql-executed', { sql, result })
      
    } else {
      // 显示错误信息
      const errorMessage = result?.error || '执行失败'
      resultContent.innerHTML = `
        <div class="query-result-error">
          <div class="error-message">❌ ${errorMessage}</div>
        </div>
      `
    }
    
  } catch (error) {
    console.error('SQL执行失败:', error)
    
    const codeBlockWrapper = button.closest('.code-block-wrapper')
    const resultContainer = codeBlockWrapper.querySelector('.sql-result-container')
    const resultContent = resultContainer.querySelector('.result-content')
    
    resultContainer.style.display = 'block'
    resultContent.innerHTML = `
      <div class="query-result-error">
        <div class="error-message">❌ ${error.message || '执行失败'}</div>
      </div>
    `
    
    notificationStore.error(`SQL执行失败: ${error.message}`)
  } finally {
    // 恢复按钮状态
    const originalText = '▶️'
    button.textContent = originalText
    button.disabled = false
  }
}

// 处理内容点击事件
const handleContentClick = async (event) => {
  const target = event.target
  
  // 处理复制按钮点击
  if (target.classList.contains('copy-code-btn')) {
    event.preventDefault()
    const code = target.getAttribute('data-code')
    if (code) {
      try {
        await navigator.clipboard.writeText(code)
        
        // 视觉反馈
        const originalText = target.textContent
        target.textContent = '✅'
        target.style.background = '#10b981'
        
        setTimeout(() => {
          target.textContent = originalText
          target.style.background = ''
        }, 2000)
        
        emit('copy-code', code)
      } catch (error) {
        console.error('复制失败:', error)
        target.textContent = '❌'
        setTimeout(() => {
          target.textContent = '📋'
        }, 1000)
      }
    }
  }
  
  // 处理SQL执行按钮点击
  if (target.classList.contains('execute-sql-btn')) {
    event.preventDefault()
    const sql = target.getAttribute('data-sql')
    if (sql) {
      await handleSQLExecution(target, sql)
    }
  }
  
  // 处理关闭结果按钮
  if (target.classList.contains('close-result-btn')) {
    event.preventDefault()
    const resultContainer = target.closest('.sql-result-container')
    if (resultContainer) {
      resultContainer.style.display = 'none'
    }
  }
  
  // 处理标题锚点点击
  if (target.classList.contains('heading-anchor')) {
    event.preventDefault()
    const href = target.getAttribute('href')
    if (href) {
      try {
        const fullUrl = window.location.href.split('#')[0] + href
        await navigator.clipboard.writeText(fullUrl)
        
        // 视觉反馈
        target.style.color = '#10b981'
        setTimeout(() => {
          target.style.color = ''
        }, 1000)
      } catch (error) {
        console.error('复制链接失败:', error)
      }
    }
  }
  
  // 处理表格行点击
  if (target.closest('tr')) {
    const row = target.closest('tr')
    row.classList.toggle('row-selected')
  }
}

// 安全的字符串转换函数
const safeToString = (value) => {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  
  // 对于对象，尝试获取其有意义的内容
  if (typeof value === 'object') {
    // 特殊处理：表格cell对象
    if (value.text !== undefined) {
      return String(value.text)
    }
    
    // 特殊处理：marked.js的token对象
    if (value.type && value.raw) {
      // 这是marked的token，清理raw内容中的```标记
      let cleanContent = String(value.raw)
      cleanContent = cleanContent
        .replace(/^```\w*\n?/, '')  // 移除开头的```xxx
        .replace(/\n?```$/, '')     // 移除结尾的```
        .trim()
      return cleanContent
    }
    
    // 如果是数组，连接元素
    if (Array.isArray(value)) {
      return value.map(item => safeToString(item)).join('')
    }
    
    // 如果对象有content属性，使用它
    if (value.content) return safeToString(value.content)
    
    // 如果对象有innerHTML，使用它
    if (value.innerHTML) return value.innerHTML
    
    // 如果对象有textContent，使用它
    if (value.textContent) return value.textContent
    
    // 如果对象有raw属性（marked tokens）
    if (value.raw) {
      let cleanRaw = String(value.raw)
      cleanRaw = cleanRaw
        .replace(/^```\w*\n?/, '')     // 移除开头的```xxx
        .replace(/\n?```$/, '')        // 移除结尾的```
        .replace(/```\w*$/, '')        // 移除单独的```xxx（没有换行）
        .replace(/^```/, '')           // 移除开头单独的```
        .trim()
      return cleanRaw
    }
    
    // 最后尝试JSON.stringify，但移除双引号
    try {
      const jsonStr = JSON.stringify(value)
      if (jsonStr !== '{}' && jsonStr !== '[]' && jsonStr !== 'null') {
        // 对于复杂对象，尝试提取有用信息
        if (jsonStr.length > 100) {
          // 如果太长，可能是marked token，尝试提取text内容
          const textMatch = jsonStr.match(/"text":"([^"]*?)"/g)
          if (textMatch) {
            return textMatch.map(match => 
              match.replace(/"text":"([^"]*?)"/, '$1')
            ).join(' ')
          }
        }
        return jsonStr.replace(/^"|"$/g, '').replace(/\\"/g, '"')
      }
    } catch (e) {
      // JSON.stringify失败时的处理
    }
  }
  
  return String(value).replace('[object Object]', '')
}

// 转义HTML（安全版本）
const escapeHtml = (text) => {
  if (!text) return ''
  
  // 使用安全的字符串转换
  const textContent = safeToString(text)
  
  const div = document.createElement('div')
  div.textContent = textContent
  return div.innerHTML
}

// 全局函数：复制表格数据
if (typeof window !== 'undefined') {
  window.copyTableData = async function(button) {
    const table = button.closest('.table-wrapper').querySelector('table')
    if (!table) return
    
    const rows = Array.from(table.querySelectorAll('tr'))
    const csvData = rows.map(row => {
      const cells = Array.from(row.querySelectorAll('th, td'))
      return cells.map(cell => `"${cell.textContent.trim()}"`).join(',')
    }).join('\n')
    
    try {
      await navigator.clipboard.writeText(csvData)
      button.textContent = '✅'
      button.style.background = '#10b981'
      
      setTimeout(() => {
        button.textContent = '📋'
        button.style.background = ''
      }, 2000)
    } catch (error) {
      console.error('复制表格数据失败:', error)
      button.textContent = '❌'
      setTimeout(() => {
        button.textContent = '📋'
      }, 1000)
    }
  }
}
</script>

<style scoped>
.markdown-renderer {
  font-size: 13px;
  line-height: 1.6;
  color: #374151;
}

.markdown-renderer.compact {
  font-size: 12px;
  line-height: 1.5;
}

.markdown-content {
  word-wrap: break-word;
  overflow-wrap: break-word;
}

/* 标题样式 */
.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin: 20px 0 12px 0;
  font-weight: 600;
  line-height: 1.3;
  color: #1f2937;
  border-bottom: none;
  position: relative;
}

.markdown-content :deep(h1) { 
  font-size: 24px; 
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e7eb;
  margin-bottom: 16px;
}

.markdown-content :deep(h2) { 
  font-size: 20px; 
  padding-bottom: 4px;
  border-bottom: 1px solid #e5e7eb;
}

.markdown-content :deep(h3) { font-size: 18px; }
.markdown-content :deep(h4) { font-size: 16px; }
.markdown-content :deep(h5) { font-size: 14px; }
.markdown-content :deep(h6) { 
  font-size: 13px; 
  color: #6b7280;
}

.compact .markdown-content :deep(h1) { 
  font-size: 20px; 
  margin: 16px 0 10px 0;
}
.compact .markdown-content :deep(h2) { font-size: 18px; }
.compact .markdown-content :deep(h3) { font-size: 16px; }

/* 段落样式 */
.markdown-content :deep(p) {
  margin: 8px 0;
  text-align: left;
}

.markdown-content :deep(p:first-child) {
  margin-top: 0;
}

.markdown-content :deep(p:last-child) {
  margin-bottom: 0;
}

/* 代码块样式 */
.markdown-content :deep(.code-block-wrapper) {
  margin: 16px 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.markdown-content :deep(.code-block-header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
  font-size: 11px;
}

.markdown-content :deep(.code-language) {
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: 'Consolas', 'Monaco', monospace;
}

.markdown-content :deep(.copy-code-btn) {
  padding: 4px 8px;
  background: #e2e8f0;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s ease;
  font-family: system-ui, -apple-system, sans-serif;
}

.markdown-content :deep(.copy-code-btn:hover) {
  background: #cbd5e1;
  transform: translateY(-1px);
}

.markdown-content :deep(.code-block) {
  margin: 0;
  padding: 16px;
  background: #1e293b;
  color: #e2e8f0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
  border-radius: 0;
  white-space: pre;
  
  /* SQL和JavaScript代码的特殊样式 */
  &.language-sql,
  &.language-javascript {
    color: #f1f5f9;
    background: #0f172a;
  }
}

.compact .markdown-content :deep(.code-block) {
  padding: 12px;
  font-size: 11px;
  line-height: 1.5;
}

/* 代码块动作按钮组 */
.markdown-content :deep(.code-block-actions) {
  display: flex;
  gap: 6px;
  align-items: center;
}

/* SQL执行按钮样式 */
.markdown-content :deep(.execute-sql-btn) {
  padding: 4px 8px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: 1px solid #059669;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s ease;
  font-family: system-ui, -apple-system, sans-serif;
}

.markdown-content :deep(.execute-sql-btn:hover:not(:disabled)) {
  background: linear-gradient(135deg, #059669, #047857);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
}

.markdown-content :deep(.execute-sql-btn:disabled) {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
}

/* SQL结果容器样式 */
.markdown-content :deep(.sql-result-container) {
  border-top: 1px solid #e5e7eb;
  background: #f8fafc;
}

.markdown-content :deep(.result-header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
}

.markdown-content :deep(.result-title) {
  font-size: 11px;
  font-weight: 600;
  color: #475569;
}

.markdown-content :deep(.close-result-btn) {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 3px;
  transition: all 0.2s ease;
}

.markdown-content :deep(.close-result-btn:hover) {
  background: #e2e8f0;
  color: #374151;
}

.markdown-content :deep(.result-content) {
  padding: 12px;
  max-height: 400px;
  overflow-y: auto;
}

/* 查询结果表格样式 */
.markdown-content :deep(.query-result-table) {
  font-size: 11px;
}

.markdown-content :deep(.result-stats) {
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #ecfdf5;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
  color: #166534;
  font-size: 11px;
  font-weight: 500;
}

.markdown-content :deep(.result-table) {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.markdown-content :deep(.result-table th) {
  background: #f8fafc;
  padding: 8px 10px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
  font-size: 10px;
}

.markdown-content :deep(.result-table td) {
  padding: 6px 10px;
  border-bottom: 1px solid #f3f4f6;
  color: #374151;
  font-size: 10px;
  max-width: 200px;
  word-wrap: break-word;
}

.markdown-content :deep(.result-table tr:nth-child(even)) {
  background: #fafafa;
}

.markdown-content :deep(.result-table tr:hover) {
  background: #f3f4f6;
}

.markdown-content :deep(.null-value) {
  color: #9ca3af;
  font-style: italic;
}

.markdown-content :deep(.more-rows) {
  text-align: center;
  color: #6b7280;
  font-style: italic;
  background: #f9fafb;
}

/* 成功消息样式 */
.markdown-content :deep(.query-result-message) {
  text-align: center;
  padding: 20px;
}

.markdown-content :deep(.success-message) {
  color: #166534;
  font-weight: 500;
  font-size: 12px;
  padding: 12px 16px;
  background: #ecfdf5;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  display: inline-block;
}

/* 错误消息样式 */
.markdown-content :deep(.query-result-error) {
  text-align: center;
  padding: 20px;
}

.markdown-content :deep(.error-message) {
  color: #dc2626;
  font-weight: 500;
  font-size: 12px;
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  display: inline-block;
}

/* 加载状态样式 */
.markdown-content :deep(.loading-spinner) {
  text-align: center;
  padding: 20px;
  color: #6b7280;
  font-size: 12px;
}

/* SQL代码块特殊样式 */
.markdown-content :deep(.code-block-wrapper[data-sql-block="true"]) {
  border-left: 3px solid #10b981;
}

.markdown-content :deep(.code-block-wrapper[data-sql-block="true"] .code-block-header) {
  background: #f0fdf4;
}

/* 暂时禁用复杂的语法高亮样式，避免HTML嵌套问题 */
/*
.markdown-content :deep(.syntax-keyword) {
  color: #3b82f6;
  font-weight: 600;
}

.markdown-content :deep(.syntax-string) {
  color: #10b981;
}

.markdown-content :deep(.syntax-comment) {
  color: #6b7280;
  font-style: italic;
}

.markdown-content :deep(.syntax-number) {
  color: #f59e0b;
}

.markdown-content :deep(.syntax-operator) {
  color: #ef4444;
  font-weight: 600;
}

.markdown-content :deep(.syntax-bracket) {
  color: #8b5cf6;
  font-weight: 600;
}
*/

/* 行内代码样式 */
.markdown-content :deep(code:not(.code-block code)) {
  background: #f1f5f9;
  color: #0f172a;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', Consolas, monospace;
  font-size: 11px;
  border: 1px solid #e2e8f0;
}

/* 表格样式 */
.markdown-content :deep(.table-wrapper) {
  margin: 16px 0;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: white;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

/* 表格容器 */
.markdown-content :deep(.table-container) {
  overflow-x: auto;
  max-width: 100%;
}

/* 表格控制按钮 */
.markdown-content :deep(.table-controls) {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  padding: 8px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.markdown-content :deep(.table-control-btn) {
  padding: 4px 8px;
  background: #e2e8f0;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  cursor: pointer;
  font-size: 10px;
  transition: all 0.2s ease;
}

.markdown-content :deep(.table-control-btn:hover) {
  background: #cbd5e1;
  transform: translateY(-1px);
}

/* 紧凑表格模式 */
.markdown-content :deep(.table-wrapper.compact-table .enhanced-table th),
.markdown-content :deep(.table-wrapper.compact-table .enhanced-table td) {
  padding: 4px 8px;
  font-size: 10px;
}

.markdown-content :deep(.enhanced-table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  background: white;
  margin: 0;
}

.markdown-content :deep(.enhanced-table th),
.markdown-content :deep(.enhanced-table td) {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  vertical-align: top;
  word-wrap: break-word;
}

.markdown-content :deep(.enhanced-table th) {
  background: #f8fafc;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #d1d5db;
  position: sticky;
  top: 0;
  z-index: 1;
}

.markdown-content :deep(.enhanced-table tr:nth-child(even)) {
  background: #fafafa;
}

.markdown-content :deep(.enhanced-table tr:hover) {
  background: #f3f4f6;
}

.markdown-content :deep(.enhanced-table tr.row-selected) {
  background: #eff6ff;
  border-left: 3px solid #3b82f6;
}

.compact .markdown-content :deep(.enhanced-table th),
.compact .markdown-content :deep(.enhanced-table td) {
  padding: 6px 8px;
  font-size: 10px;
}

/* 列表样式 */
.markdown-content :deep(.ordered-list),
.markdown-content :deep(.unordered-list) {
  margin: 8px 0;
  padding-left: 20px;
}

.markdown-content :deep(.unordered-list li) {
  list-style-type: disc;
  margin: 4px 0;
}

.markdown-content :deep(.ordered-list li) {
  list-style-type: decimal;
  margin: 4px 0;
}

.markdown-content :deep(li p) {
  margin: 2px 0;
}

/* 引用块样式 */
.markdown-content :deep(.enhanced-blockquote) {
  margin: 16px 0;
  padding: 16px 20px;
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
  border-radius: 0 8px 8px 0;
  color: #92400e;
  font-style: normal;
  position: relative;
  box-shadow: 0 1px 3px rgba(245, 158, 11, 0.1);
}

.markdown-content :deep(.enhanced-blockquote::before) {
  content: '';
  position: absolute;
  left: -4px;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(to bottom, #f59e0b, #d97706);
}

.compact .markdown-content :deep(.enhanced-blockquote) {
  padding: 12px 16px;
  font-size: 12px;
}

/* 链接样式 */
.markdown-content :deep(a) {
  color: #3b82f6;
  text-decoration: none;
  border-bottom: 1px dotted #3b82f6;
  transition: all 0.2s ease;
}

.markdown-content :deep(a:hover) {
  color: #1d4ed8;
  border-bottom-color: #1d4ed8;
  background: #eff6ff;
  padding: 1px 2px;
  border-radius: 2px;
}

/* 标题锚点样式 */
.markdown-content :deep(.heading-anchor) {
  opacity: 0;
  margin-left: 8px;
  color: #9ca3af;
  font-weight: normal;
  transition: opacity 0.2s ease;
  text-decoration: none;
  border: none;
}

.markdown-content :deep(h1:hover .heading-anchor),
.markdown-content :deep(h2:hover .heading-anchor),
.markdown-content :deep(h3:hover .heading-anchor),
.markdown-content :deep(h4:hover .heading-anchor),
.markdown-content :deep(h5:hover .heading-anchor),
.markdown-content :deep(h6:hover .heading-anchor) {
  opacity: 1;
}

.markdown-content :deep(.heading-anchor:hover) {
  color: #3b82f6;
  background: transparent;
}

/* 分隔线样式 */
.markdown-content :deep(hr) {
  margin: 20px 0;
  border: none;
  height: 2px;
  background: linear-gradient(to right, transparent, #e5e7eb, transparent);
}

/* 错误信息样式 */
.markdown-content :deep(.render-error) {
  color: #dc2626;
  background: #fef2f2;
  padding: 8px 12px;
  border: 1px solid #fecaca;
  border-radius: 6px;
  font-family: monospace;
  font-size: 11px;
}

/* 备用显示样式 */
.markdown-content :deep(.render-fallback) {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 6px;
  padding: 12px;
}

.markdown-content :deep(.render-fallback p) {
  color: #0369a1;
  font-size: 12px;
  margin-bottom: 8px;
  font-weight: 500;
}

.markdown-content :deep(.render-fallback pre) {
  background: white;
  border: 1px solid #e0e7ff;
  border-radius: 4px;
  padding: 8px;
  font-size: 11px;
  line-height: 1.4;
  color: #374151;
  max-height: 200px;
  overflow-y: auto;
}

/* 强调文本样式 */
.markdown-content :deep(strong) {
  font-weight: 600;
  color: #1f2937;
}

.markdown-content :deep(em) {
  font-style: italic;
  color: #4b5563;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .markdown-renderer {
    font-size: 12px;
  }
  
  .markdown-content :deep(.code-block) {
    font-size: 10px;
    padding: 8px;
  }
  
  .markdown-content :deep(.enhanced-table th),
  .markdown-content :deep(.enhanced-table td) {
    padding: 6px 8px;
    font-size: 10px;
  }
}
</style>