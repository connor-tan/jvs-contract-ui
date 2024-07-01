import * as buffer  from "buffer";

if (typeof (window as any).global === "undefined") {
    (window as any).global = window;
}

if (typeof (window as any).Buffer === "undefined") {
    (window as any).Buffer = buffer.Buffer;
}
import '@mdi/font/css/materialdesignicons.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import App from './App.vue'
import router from './router'

const app = createApp(App)

const vuetify = createVuetify({
    components,
    directives,
    theme: {
        defaultTheme: 'dark',
    },
    icons: {
        defaultSet: 'mdi',
        aliases,
        sets: {
            mdi,
        },
    },
})


app.use(createPinia())
app.use(router)
app.use(vuetify)
app.mount('#app')
