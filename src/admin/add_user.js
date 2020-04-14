export default {
    template: document.querySelector('#add_user'),
    data() {
        return {
            form: {
                name: '',
                email: ''
            }
        }
    },
    methods: {
        save() {
            this.$store.dispatch('add_user', {...this.form })
        }
    }
}