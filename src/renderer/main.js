import Vue from 'vue'

import configureSentry from './configure-sentry'
configureSentry({ Vue })

import App from './App'
import router from './router'
import store from './store'

Vue.config.productionTip = false

const vue = new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')

if (import.meta.env.DEV) {
  window.Vue = Vue
  window.vue = vue
}
