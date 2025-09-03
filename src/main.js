import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/main.scss'

// 导入Tauri API - 使用Tauri 2.0的正确路径
import { invoke } from '@tauri-apps/api/core'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// 在Tauri环境中，确保API可用
if (typeof window !== 'undefined') {
  // 将invoke函数挂载到全局，方便调试
  window.__TAURI_INVOKE__ = invoke
  
  // 检查Tauri环境
  console.log('Tauri环境初始化检查:')
  console.log('- window.__TAURI__:', typeof window.__TAURI__)
  console.log('- invoke函数:', typeof invoke)
  
  // 等待Tauri完全初始化后再挂载应用
  if (window.__TAURI__) {
    console.log('Tauri环境已就绪，挂载Vue应用')
    app.mount('#app')
  } else {
    // 如果Tauri还没准备好，等待一下
    setTimeout(() => {
      console.log('延迟挂载Vue应用，Tauri状态:', typeof window.__TAURI__)
      app.mount('#app')
    }, 100)
  }
} else {
  // 非浏览器环境直接挂载
  app.mount('#app')
}

// 全局错误处理
app.config.errorHandler = (err, vm, info) => {
  console.error('Vue Error:', err, info)
}

// 全局警告处理
app.config.warnHandler = (msg, vm, trace) => {
  console.warn('Vue Warning:', msg, trace)
}
