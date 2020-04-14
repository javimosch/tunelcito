require('dotenv').config({
    silent: true
})
const express = require('express')
var app = express();
var http = require('http').createServer(app);
var uniqid = require('uniqid');
var io = require('socket.io')(http);
var mime = require('mime-types')
var path = require('path')
const low = require('lowdb')
const FileAsync = require('lowdb/adapters/FileAsync')
const moment = require('moment-timezone')
const shortid = require('shortid')
const sander = require('sander')
const PORT = process.env.TUNELCITO_SERVER_PORT || process.env.PORT || 3000
var domain = process.env.TUNELCITO_SERVER_DOMAIN || `http://localhost:${PORT}`

init().catch(saveError)

async function init() {
    var sockets = {};



    await require('./server/admin')(app, {
        PORT,
        domain
    })



    app.get('/tunelcito/:name/*', async function(req, res) {
        req.params = {
            name: "foo"
        }

        let site = getSite(req.params.name);
        if (!site) {
            return res.status(404).send()
        }
        try {
            let response = await socketPromise(site.socket, 'req', {
                method: req.method,
                path: req.url.split(`/sites/${req.params.name}`).join(''),
                site: site.name
            })
            var contentType = req.url.indexOf('.') === -1 ? 'text/html' : mime.lookup(path.basename(req.url))
            console.log('SITE', req.params.name, req.url, contentType)
            res.setHeader("Content-Type", contentType);
            res.send(response.r)
        } catch (err) {
            let errCode = err.message || err
            let errDetail = err.stack || err.detail || err
            if (errCode === 'CLIENT_TIMEOUT') {
                console.log('ERR', req.params.name, req.url, 'CLIENT_TIMEOUT')
                return res.status(404).send()
            }
            console.log('ERR', errDetail)
            saveError(err)
            return res.status(500).send()
        }
    });

    io.on('connection', function(socket) {
        console.log('client connected', socket.id);
        sockets[socket.id] = {
            socket,
            sites: {}
        }
        socket.on('reportSites', function(sites) {
            console.log('client reportSites', sites)
            sockets[socket.id].sites = sites || {}
        })
    });
    io.on('disconnect', (socket) => {
        delete sockets[socket.id]
    });

    http.listen(PORT, function() {
        console.log(`Listening on *:${PORT}`);
    });

}

function getSite(siteKey) {
    let match = null;
    Object.keys(sockets).forEach(socketId => {
        match = Object.keys(sockets[socketId].sites).find(key => key == siteKey)
        if (match != null) {
            match = {
                socket: sockets[socketId].socket,
                config: sockets[socketId].sites[match]
            }
            return false;
        }
    })
    if (match) {
        match.name = siteKey;
    }
    return match
}

function socketPromise(socket, name, data) {
    return new Promise((resolve, reject) => {
        var id = `promise_${uniqid()}`
        var clientTimeout = false
        var onceFn = res => {
            if (clientTimeout) {
                return
            }
            clearTimeout(timeout)
            if (res.err) {
                return reject({
                    message: "GENERIC",
                    detail: {
                        stack: res.err,
                        site: res.site
                    }
                })
            }
            resolve(res)
        }
        socket.once(id, onceFn)
        var timeout = setTimeout(() => {
            socket.off(id, onceFn)
            clientTimeout = true;
            reject("CLIENT_TIMEOUT")
        }, 2000)
        socket.emit(name, {
            id,
            ...data
        })
    })
}



async function getLoggerDb() {
    app._loggers = app._loggers || {}
    let name = `logs-${moment().format("YYYY-MM-DD")}.json`
    if (!app._loggers[name]) {
        var dir = path.join(process.cwd(), 'data', 'logs');
        if (!await sander.exists(dir)) {
            await sander.mkdir(dir);
        }
        app._loggers[name] = await low(new FileAsync(path.join(process.cwd(), 'data/logs', name), {
            defaultValue: { logs: [] }
        }))
    }
    return app._loggers[name];
}
async function saveError(log) {
    console.log("ERR", log)
    return saveLog(log, "errors")
}
async function saveLog(data, name = "logs") {
    data = normalizeError(data)
    await (await getLoggerDb())
    .get('logs')
        .push({ _id: shortid.generate(), ...data })
        .write()
}

function normalizeError(err) {
    if (err instanceof Error) {
        err = {
            err: JSON.stringify(err, Object.getOwnPropertyNames(err), 4)
        }
    } else {
        if (err.err instanceof Error) {
            err.err = JSON.stringify(err, Object.getOwnPropertyNames(err.err), 4)
        }
    }
    return err;
}