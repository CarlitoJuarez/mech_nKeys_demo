import './style.css'
import { createApp, h } from 'vue'
import Settings from './components/Settings.vue'
import About from './components/About.vue'
import Help from './components/Help.vue'
import Imprint from './components/Imprint.vue'
import Terms from './components/Terms.vue'
import Copyright from './components/Copyright.vue'
import Guidelines from './components/Guidelines.vue'
import Privacy from './components/Privacy.vue'

import { create as createNaive, NButton, NCard, NForm, NFormItem, NInput } from "naive-ui";

const naive = createNaive({
    components: [NButton, NCard, NForm, NFormItem, NInput]
});


// Mount Vue apps where needed
const apps = [
  {
    id: '#settings-app', 
    component: Settings,
  },
  {
    id: '#about-app', 
    component: About,
  },
  {
    id: '#help-app', 
    component: Help,
  },
  {
    id: '#imprint-app', 
    component: Imprint,
  },
  {
    id: '#terms-app', 
    component: Terms,
  },
  {
    id: '#copyright-app', 
    component: Copyright,
  },
  {
    id: '#guidelines-app', 
    component: Guidelines,
  },
  {
    id: '#privacy-app', 
    component: Privacy,
  },
]

apps.forEach(({ id, component }) => {
  const el = document.querySelector(id)
  if (el) {
    createApp(component).use(naive).mount(el)
  }
})

// Hot Module Replacement for development
if (import.meta.hot) {
  import.meta.hot.accept()
}
