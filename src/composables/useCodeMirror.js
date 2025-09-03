import { ref, onUnmounted } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import { sql } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'
import { autocompletion, completionKeymap, CompletionContext } from '@codemirror/autocomplete'
import { keymap } from '@codemirror/view'
import { formatSQLForDB } from '@/utils/sqlFormatter.js'
import { useAdvancedSQLCompletion } from '@/composables/useAdvancedSQLCompletion.js'

export function useCodeMirror(options = {}) {
  const editorView = ref(null)
  const editorElement = ref(null)
  const isReady = ref(false)
  const isFormatting = ref(false) // 添加格式化状态锁
  
  // 初始化高级智能补全
  const advancedCompletion = useAdvancedSQLCompletion()

  // 默认配置
  const defaultOptions = {
    dialect: 'mysql',
    theme: 'light',
    lineNumbers: true,
    foldGutter: true,
    autocomplete: true,
    height: '300px',
    fontSize: '14px',
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
  }

  const config = { ...defaultOptions, ...options }

  // 获取主题扩展
  const getThemeExtension = (themeName) => {
    switch (themeName) {
      case 'dark':
      case 'onedark':
        return oneDark
      default:
        return []
    }
  }

  // 创建编辑器扩展
  const createExtensions = () => {
    const extensions = [
      basicSetup,
      sql(),
      EditorView.theme({
        '&': { 
          height: config.height,
          fontSize: config.fontSize,
          fontFamily: config.fontFamily
        },
        '.cm-content': { 
          padding: '12px',
          minHeight: '100%'
        },
        '.cm-editor': { 
          borderRadius: '6px'
        },
        '.cm-focused': { 
          outline: 'none'
        }
      }),
      keymap.of([
        ...completionKeymap,
        // 注释掉 Ctrl+Enter，让全局快捷键系统处理
        // {
        //   key: 'Ctrl-Enter',
        //   run: () => {
        //     // 触发查询执行事件
        //     if (options.onExecute) {
        //       options.onExecute(getValue())
        //     }
        //     return true
        //   }
        // }
      ])
    ]

    // 添加主题
    const themeExtension = getThemeExtension(config.theme)
    if (themeExtension) {
      extensions.push(themeExtension)
    }

    // 添加增强的智能补全
    if (config.autocomplete) {
      extensions.push(autocompletion({
        override: [
          // 智能SQL补全
          async (context) => {
            try {
              const { state } = context
              const sql = state.doc.toString()
              const cursorPos = context.pos
              
              // 检查是否需要补全
              const word = context.matchBefore(/[\w.]*$/)
              if (!word && !context.explicit) return null
              
              // 获取智能补全建议
              const suggestions = await advancedCompletion.getCompletions(sql, cursorPos)
              
              if (suggestions.length === 0) return null
              
              // 转换为CodeMirror格式
              const options = suggestions.map(suggestion => ({
                label: suggestion.label,
                type: suggestion.type,
                info: suggestion.info,
                detail: suggestion.detail,
                boost: suggestion.boost || 0,
                apply: (view, completion, from, to) => {
                  // 智能插入文本
                  const insertText = suggestion.insertText || suggestion.label
                  view.dispatch({
                    changes: { from, to, insert: insertText },
                    selection: { anchor: from + insertText.length }
                  })
                  
                  // 触发补全选择事件
                  if (options.onCompletionSelect) {
                    options.onCompletionSelect(suggestion)
                  }
                }
              }))
              
              return {
                from: word ? word.from : cursorPos,
                to: word ? word.to : cursorPos,
                options: options
              }
            } catch (error) {
              console.error('智能补全失败:', error)
              return null
            }
          }
        ],
        // 补全配置
        activateOnTyping: true,
        maxRenderedOptions: 20,
        defaultKeymap: true,
        tooltipClass: () => 'cm-advanced-completion-tooltip',
        optionClass: (completion) => {
          const baseClass = 'cm-advanced-completion-option'
          const typeClass = `cm-completion-${completion.type}`
          return `${baseClass} ${typeClass}`
        }
      }))
    }

    // 添加文档变化监听器
    if (options.onChange) {
      extensions.push(EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          options.onChange(update.state.doc.toString())
        }
      }))
    }

    return extensions
  }

  // 初始化编辑器
  const initEditor = (element, initialValue = '') => {
    if (!element) return

    editorElement.value = element

    try {
      const extensions = createExtensions()

      editorView.value = new EditorView({
        doc: initialValue,
        extensions,
        parent: element
      })

      isReady.value = true
    } catch (error) {
      console.error('CodeMirror初始化失败:', error)
    }
  }

  // 获取编辑器内容
  const getValue = () => {
    if (!editorView.value) return ''
    return editorView.value.state.doc.toString()
  }

  // 设置编辑器内容（更安全的版本）
  const setValue = (value) => {
    if (!editorView.value) return
    
    try {
      // 获取当前最新的状态
      const currentState = editorView.value.state
      const currentDoc = currentState.doc
      
      // 如果内容相同，不需要更新
      if (currentDoc.toString() === (value || '')) {
        return
      }
      
      // 创建事务，确保从当前状态开始
      const transaction = currentState.update({
        changes: {
          from: 0,
          to: currentDoc.length,
          insert: value || ''
        },
        // 添加用户活动标记，表示这是一个有意的更改
        userEvent: 'input.type'
      })
      
      editorView.value.dispatch(transaction)
    } catch (error) {
      console.error('设置编辑器内容失败:', error)
      
      // 错误恢复：重新创建编辑器
      const currentValue = value || ''
      if (editorElement.value) {
        try {
          // 保存当前的选择和光标位置
          const selection = editorView.value?.state?.selection?.main
          
          // 销毁并重新创建
          editorView.value.destroy()
          initEditor(editorElement.value, currentValue)
          
          // 恢复光标位置（如果可能）
          if (selection && editorView.value) {
            try {
              const newDoc = editorView.value.state.doc
              const newPos = Math.min(selection.head, newDoc.length)
              editorView.value.dispatch({
                selection: { anchor: newPos, head: newPos }
              })
            } catch (selectionError) {
              console.warn('恢复光标位置失败:', selectionError)
            }
          }
        } catch (recreateError) {
          console.error('重新创建编辑器失败:', recreateError)
        }
      }
    }
  }

  // 获取选中内容
  const getSelection = () => {
    if (!editorView.value) return ''
    
    try {
      const state = editorView.value.state
      const selection = state.selection.main
      return state.doc.sliceString(selection.from, selection.to)
    } catch (error) {
      console.error('获取选中内容失败:', error)
      return ''
    }
  }

  // 插入文本（更安全的版本）
  const insertText = (text) => {
    if (!editorView.value) return
    
    try {
      const currentState = editorView.value.state
      const selection = currentState.selection.main
      
      const transaction = currentState.update({
        changes: {
          from: selection.from,
          to: selection.to,
          insert: text
        },
        selection: {
          anchor: selection.from + text.length
        },
        userEvent: 'input.type'
      })
      
      editorView.value.dispatch(transaction)
    } catch (error) {
      console.error('插入文本失败:', error)
      
      // 降级方案：尝试重新获取状态并插入
      try {
        const currentValue = getValue()
        const newValue = currentValue + text
        setValue(newValue)
      } catch (fallbackError) {
        console.error('插入文本降级方案也失败了:', fallbackError)
      }
    }
  }

  // 格式化SQL（使用专业sql-formatter，防止并发）
  const formatSQL = async () => {
    if (!editorView.value || isFormatting.value) {
      console.log('编辑器未准备或正在格式化中，跳过本次格式化')
      return
    }
    
    isFormatting.value = true
    
    try {
      const currentValue = getValue()
      if (!currentValue || !currentValue.trim()) {
        return // 如果没有内容就不格式化
      }
      
      // 异步格式化，避免阻塞UI
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // 再次检查状态（防止在异步等待期间编辑器被销毁）
      if (!editorView.value) {
        console.log('编辑器在格式化期间被销毁')
        return
      }
      
      // 根据配置的数据库类型进行格式化
      const dbType = config.dialect || 'MySQL'
      const formatted = formatSQLForDB(currentValue, dbType)
      
      // 只有当格式化后的内容与原内容不同时才更新
      if (formatted !== currentValue && formatted.trim() !== currentValue.trim()) {
        setValue(formatted)
      }
    } catch (error) {
      console.error('SQL格式化失败:', error)
    } finally {
      isFormatting.value = false
    }
  }

  // 更新主题（重新创建编辑器）
  const updateTheme = (themeName) => {
    if (!editorView.value || !editorElement.value) return
    
    try {
      const currentValue = getValue()
      config.theme = themeName
      
      // 销毁当前编辑器
      editorView.value.destroy()
      
      // 重新初始化
      initEditor(editorElement.value, currentValue)
    } catch (error) {
      console.error('更新主题失败:', error)
    }
  }

  // 更新方言（重新创建编辑器）
  const updateDialect = (dialectName) => {
    if (!editorView.value || !editorElement.value) return
    
    try {
      const currentValue = getValue()
      config.dialect = dialectName
      
      // 销毁当前编辑器
      editorView.value.destroy()
      
      // 重新初始化
      initEditor(editorElement.value, currentValue)
    } catch (error) {
      console.error('更新方言失败:', error)
    }
  }

  // 聚焦编辑器
  const focus = () => {
    if (editorView.value) {
      editorView.value.focus()
    }
  }

  // 获取光标位置信息
  const getCursorInfo = () => {
    if (!editorView.value) return { line: 1, column: 1 }
    
    try {
      const state = editorView.value.state
      const selection = state.selection.main
      const line = state.doc.lineAt(selection.head)
      
      return {
        line: line.number,
        column: selection.head - line.from + 1,
        pos: selection.head
      }
    } catch (error) {
      console.error('获取光标信息失败:', error)
      return { line: 1, column: 1 }
    }
  }

  // 清理资源
  onUnmounted(() => {
    if (editorView.value) {
      try {
        editorView.value.destroy()
      } catch (error) {
        console.error('销毁编辑器失败:', error)
      }
    }
  })

  // 智能补全相关方法
  const triggerCompletion = () => {
    if (editorView.value) {
      const { state, dispatch } = editorView.value
      dispatch({
        effects: []
      })
      // 手动触发补全
      const completionCommand = require('@codemirror/autocomplete').startCompletion
      if (completionCommand) {
        completionCommand(editorView.value)
      }
    }
  }
  
  const getCompletionSuggestions = async (sql, cursorPos) => {
    return await advancedCompletion.getCompletions(sql, cursorPos)
  }
  
  return {
    // 状态
    editorView,
    editorElement,
    isReady,
    isFormatting,
    
    // 原有方法
    initEditor,
    getValue,
    setValue,
    getSelection,
    insertText,
    formatSQL,
    updateTheme,
    updateDialect,
    focus,
    getCursorInfo,
    
    // 智能补全方法
    triggerCompletion,
    getCompletionSuggestions,
    
    // 高级补全状态
    completionSuggestions: advancedCompletion.completionSuggestions,
    showCompletions: advancedCompletion.showCompletions,
    selectedIndex: advancedCompletion.selectedIndex,
    isLoading: advancedCompletion.isLoading,
    
    // 配置
    config
  }
}