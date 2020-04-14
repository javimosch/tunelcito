const express = require('express')
var path = require('path')
const low = require('lowdb')
const FileAsync = require('lowdb/adapters/FileAsync')
const sander = require('sander')
const shortid = require('shortid')

module.exports = async(app, { PORT, domain }) => {

    const db = await low(new FileAsync(path.join(process.cwd(), 'data', 'database.json'), {
        defaultValue: { users: [] }
    }))


    app.get('/', (req, res) => {

        res.redirect(`${domain}/admin`)
    })
    app.get('/admin/config.js', (req, res) => {
        res.setHeader("Content-Type", 'text/javascript');
        res.send(`
        const config = {
            SERVER_URL: '${domain}'
        }
        export default config;
        `)
    })
    app.get('/admin/', async(req, res) => {
        res.setHeader("Content-Type", 'text/html');
        let html = (await sander.readFile(path.join(process.cwd(), 'src/admin/index.html'))).toString('utf-8')
        let tpls = await sander.readdir(path.join(process.cwd(), 'src/admin/templates'))
        let tplsHtml = ""
        await Promise.all(tpls.map(tplName => {
            return (async() => {
                let html = (await sander.readFile(path.join(process.cwd(), 'src/admin/templates', tplName))).toString('utf-8')
                tplsHtml += html
            })()
        }))
        html = html.split('<!-- templates -->').join(tplsHtml)
        res.send(html)
    })
    app.use('/admin', express.static(path.join(process.cwd(), 'src/admin')))

    const funql = require('funql-api')
    await funql.middleware(app, {
        getMiddlewares: [],
        postMiddlewares: [],
        allowGet: false,
        allowOverwrite: false,
        attachToExpress: true,
        allowCORS: true,
        api: {
            async add_user(user) {
                let match = await db.get('users')
                    .find({ _id: user._id });
                if (match.value()) {
                    console.log("UPDATE", match.value())
                    return {
                        result: match.assign({...user }).write()
                    }
                } else {
                    console.log("ADD")
                    return {
                        result: await db
                            .get('users')
                            .push({ _id: shortid.generate(), ...user })
                            .write()
                    }
                }
            }
        }
    })
}