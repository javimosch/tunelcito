import funql from 'https://cdn.jsdelivr.net/npm/funql-api@1.2.9/client.js'
import config from './config.js'
const fql = funql(config.SERVER_URL)
export default fql