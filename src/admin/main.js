import add_user from './add_user.js'
import store from './store.js'

const routes = [{
    path: '/',
    name: 'home',
    component: add_user
}, {
    path: '/add-user',
    name: 'add_user',
    component: add_user
}, ]

const router = new VueRouter({
    routes
})

new Vue({
    store,
    router
}).$mount('#app')