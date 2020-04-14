require('dotenv').config({
    silent: true
})
const io = require('socket.io-client');
const axios = require('axios').default;
var host = process.env.TUNELCITO_CLIENT_SERVER_HOST || "http://localhost:3000"
console.log(`Targeting host ${host}`)
var socket = io(host)
var sites = {
    foo: {
        host: 'http://localhost',
        port: 3334
    }
}
socket.on('connect', function () {
    console.log('connect')
    socket.emit('reportSites', sites)
});
socket.on('event', function (data) { });
socket.on('disconnect', function () { });
socket.on('req', async data => {
    let site = sites[data.site]
    try {
        let res = await req({
            hostname: site.host,
            port: site.port,
            path: data.path,
            method: data.method
        })
        socket.emit(data.id, {
            r: res.data
        })
    } catch (err) {
        console.log(err)
        socket.emit(data.id, {
            site,
            err: err.stack
        })
    }
})
function req(params) {
    var axiosParams = {
        method: params.method,
        url: params.hostname + ":" + params.port + params.path,
        responseType: 'arraybuffer'
    }
    console.log(axiosParams)
    return axios(axiosParams)
}