import fql from './fql.js'
export default new Vuex.Store({
    state: {
        users: {

        }
    },
    mutations: {
        add_user(state, user) {
            state.users[user.name] = user
        }
    },
    actions: {
        async add_user({ commit }, data) {
            await fql('add_user', data)
            commit('add_user', data)
        }
    }
})