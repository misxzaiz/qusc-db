// 简单的语法高亮器，专注于SQL和常见编程语言
export class SyntaxHighlighter {
  constructor() {
    // SQL关键字
    this.sqlKeywords = [
      'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER',
      'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE', 'INDEX',
      'ORDER BY', 'GROUP BY', 'HAVING', 'UNION', 'DISTINCT', 'COUNT', 'SUM', 'AVG',
      'MAX', 'MIN', 'AS', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL',
      'PRIMARY KEY', 'FOREIGN KEY', 'REFERENCES', 'CONSTRAINT', 'UNIQUE', 'DEFAULT',
      'AUTO_INCREMENT', 'NOT NULL', 'VARCHAR', 'INT', 'INTEGER', 'DECIMAL', 'FLOAT',
      'DOUBLE', 'DATE', 'DATETIME', 'TIMESTAMP', 'TEXT', 'LONGTEXT', 'BLOB'
    ]

    // JavaScript关键字
    this.jsKeywords = [
      'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
      'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally',
      'throw', 'new', 'class', 'extends', 'import', 'export', 'default', 'async',
      'await', 'Promise', 'true', 'false', 'null', 'undefined', 'this', 'super'
    ]

    // Python关键字
    this.pythonKeywords = [
      'def', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except',
      'finally', 'with', 'as', 'import', 'from', 'return', 'yield', 'lambda',
      'and', 'or', 'not', 'in', 'is', 'True', 'False', 'None', 'pass', 'break',
      'continue', 'global', 'nonlocal', 'assert', 'del', 'raise'
    ]

    // 通用模式
    this.patterns = {
      // 字符串
      string: [
        /'([^'\\]|\\.)*'/g,  // 单引号字符串
        /"([^"\\]|\\.)*"/g,  // 双引号字符串
        /`([^`\\]|\\.)*`/g   // 反引号字符串
      ],
      // 数字
      number: /\b\d+\.?\d*\b/g,
      // 注释
      comment: [
        /--.*$/gm,           // SQL注释
        /#.*$/gm,            // Python注释
        /\/\/.*$/gm,         // JS单行注释
        /\/\*[\s\S]*?\*\//g  // JS多行注释
      ],
      // 操作符
      operator: /[+\-*/%=<>!&|^~]/g,
      // 括号
      bracket: /[(){}\[\]]/g,
      // 标点
      punctuation: /[.,;:]/g
    }
  }

  highlight(code, language = 'text') {
    // 处理各种输入类型
    if (!code) return ''
    
    let codeStr = ''
    if (typeof code === 'string') {
      codeStr = code
    } else if (typeof code === 'object') {
      // 如果是对象，尝试获取其文本内容
      if (code.text) codeStr = String(code.text)
      else if (code.content) codeStr = String(code.content)
      else if (code.textContent) codeStr = code.textContent
      else if (code.innerHTML) codeStr = code.innerHTML
      else if (code.raw) {
        // 清理raw内容中的```标记
        codeStr = String(code.raw)
          .replace(/^```\w*\n?/, '')     // 移除开头的```xxx
          .replace(/\n?```$/, '')        // 移除结尾的```
          .replace(/```\w*$/, '')        // 移除单独的```xxx
          .replace(/^```/, '')           // 移除开头单独的```
          .trim()
      } else codeStr = String(code)
    } else {
      codeStr = String(code)
    }
    
    if (!codeStr || codeStr === '[object Object]') return ''

    let highlighted = codeStr

    // 根据语言选择关键字
    let keywords = []
    switch (language.toLowerCase()) {
      case 'sql':
        keywords = this.sqlKeywords
        break
      case 'javascript':
      case 'js':
        keywords = this.jsKeywords
        break
      case 'python':
      case 'py':
        keywords = this.pythonKeywords
        break
      default:
        keywords = [...this.sqlKeywords, ...this.jsKeywords] // 默认混合
        break
    }

    // 注意：输入已经是转义后的HTML，我们不需要再次转义
    // highlighted 已经包含了像 &#39; 这样的转义字符

    // 高亮注释 (必须在字符串之前处理)
    this.patterns.comment.forEach(pattern => {
      highlighted = highlighted.replace(pattern, match => 
        `<span class="syntax-comment">${match}</span>`
      )
    })

    // 高亮字符串 - 需要处理转义后的引号
    const stringPatterns = [
      /&#39;([^&#39;\\]|\\.)*&#39;/g,  // 转义后的单引号字符串
      /&quot;([^&quot;\\]|\\.)*&quot;/g,  // 转义后的双引号字符串
      /'([^'\\]|\\.)*'/g,  // 普通单引号字符串
      /"([^"\\]|\\.)*"/g,  // 普通双引号字符串
      /`([^`\\]|\\.)*`/g   // 反引号字符串
    ]
    
    stringPatterns.forEach(pattern => {
      highlighted = highlighted.replace(pattern, match => 
        `<span class="syntax-string">${match}</span>`
      )
    })

    // 高亮关键字 (避免在已高亮的内容中替换)
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'gi')
      highlighted = highlighted.replace(regex, match => {
        // 检查是否已经在span标签内
        const beforeMatch = highlighted.substring(0, highlighted.lastIndexOf(match))
        const openSpans = (beforeMatch.match(/<span[^>]*>/g) || []).length
        const closeSpans = (beforeMatch.match(/<\/span>/g) || []).length
        
        if (openSpans > closeSpans) {
          return match // 已经在高亮范围内，不再处理
        }
        
        return `<span class="syntax-keyword">${match}</span>`
      })
    })

    // 高亮数字
    highlighted = highlighted.replace(/\b\d+\.?\d*\b/g, match => 
      `<span class="syntax-number">${match}</span>`
    )

    // 高亮操作符
    highlighted = highlighted.replace(/[+\-*/%=<>!&|^~]/g, match => 
      `<span class="syntax-operator">${match}</span>`
    )

    // 高亮括号
    highlighted = highlighted.replace(/[(){}\[\]]/g, match => 
      `<span class="syntax-bracket">${match}</span>`
    )

    return highlighted
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  // 检测可能的语言
  detectLanguage(code) {
    // 确保code是字符串类型，处理各种输入类型
    if (!code) return 'text'
    
    let codeStr = ''
    if (typeof code === 'string') {
      codeStr = code
    } else if (typeof code === 'object') {
      // 如果是对象，尝试获取其文本内容
      if (code.text) codeStr = String(code.text)
      else if (code.content) codeStr = String(code.content)
      else if (code.textContent) codeStr = code.textContent
      else if (code.innerHTML) codeStr = code.innerHTML
      else if (code.raw) {
        // 清理raw内容中的```标记
        codeStr = String(code.raw)
          .replace(/^```\w*\n?/, '')     // 移除开头的```xxx
          .replace(/\n?```$/, '')        // 移除结尾的```
          .replace(/```\w*$/, '')        // 移除单独的```xxx
          .replace(/^```/, '')           // 移除开头单独的```
          .trim()
      } else codeStr = String(code)
    } else {
      codeStr = String(code)
    }
    
    if (!codeStr || codeStr === '[object Object]') return 'text'
    
    // 清理代码内容：移除```标记和多余空白
    codeStr = codeStr
      .replace(/^```\w*\n?/, '')     // 移除开头的```xxx
      .replace(/\n?```$/, '')        // 移除结尾的```
      .replace(/```\w*$/, '')        // 移除单独的```xxx（没有换行）
      .replace(/^```/, '')           // 移除开头单独的```
      .trim()
    
    if (!codeStr) return 'text'
    
    const codeUpper = codeStr.toUpperCase()
    
    // 检测SQL
    const sqlIndicators = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE']
    if (sqlIndicators.some(indicator => codeUpper.includes(indicator))) {
      return 'sql'
    }

    // 检测Java
    const javaIndicators = ['public class', 'private class', 'public static void main', 'import java', 'package ', 'extends ', 'implements ']
    if (javaIndicators.some(indicator => codeStr.includes(indicator))) {
      return 'java'
    }

    // 检测JavaScript
    const jsIndicators = ['function ', 'const ', 'let ', 'var ', '=>', 'console.log', 'document.', 'window.', 'export ', 'import ']
    if (jsIndicators.some(indicator => codeStr.includes(indicator))) {
      return 'javascript'
    }

    // 检测Python
    const pyIndicators = ['def ', 'import ', 'from ', 'print(', '__name__', 'class ', 'if __name__']
    if (pyIndicators.some(indicator => codeStr.includes(indicator))) {
      return 'python'
    }

    // 检测CSS
    const cssIndicators = ['{', '}', ':', ';', '.', '#', '@media', 'color:', 'background:']
    if (cssIndicators.filter(indicator => codeStr.includes(indicator)).length >= 3) {
      return 'css'
    }

    // 检测HTML
    const htmlIndicators = ['<html', '<div', '<span', '<p>', '</div>', '<!DOCTYPE']
    if (htmlIndicators.some(indicator => codeStr.includes(indicator))) {
      return 'html'
    }

    return 'text'
  }
}