require("dotenv").config()
const http = require("http")
const path = require("path")
const fs = require("fs")
const db = require("./database")
const cookie = require("cookie")

const validAuthTokens = []
const PORT = process.env.PORT || 3000

const indexHtmlFile = fs.readFileSync(path.join(__dirname, "static", "index.html"))
const authScript = fs.readFileSync(path.join(__dirname, "static", "auth.js"))
const scriptFile = fs.readFileSync(path.join(__dirname, "static", "script.js"))
const styleFile = fs.readFileSync(path.join(__dirname, "static", "style.css"))
const registerstyleFile = fs.readFileSync(path.join(__dirname, "static", "register.css"))
const registerHtmlFile = fs.readFileSync(path.join(__dirname, "static", "register.html"))
const loginstyleFile = fs.readFileSync(path.join(__dirname, "static", "login.css"))
const loginHtmlFile = fs.readFileSync(path.join(__dirname, "static", "login.html"))

const server = http.createServer((req, res) => {
    if (req.method === "GET") {

        switch (req.url) {
            case "/style.css": return res.end(styleFile)
                res.writeHead(200, {"Content-Type": "text/css"})
            case "/auth.js": return res.end(authScript)
            case "/register.css": return res.end(registerstyleFile)
            case "/register": return res.end(registerHtmlFile)
            case "/login.css": return res.end(loginstyleFile)
            case "/login": return res.end(loginHtmlFile)
            case "/logout": return logoutUser(req, res)
            default: return guarded(req, res)
        }
    }

    if (req.method === "POST") {
        switch (req.url) {
            case "/api/register": return reqisterUser(req, res)
            case "/api/login": return loginUser(req, res)
            default: return guarded(req, res)
        }
    }
})

server.listen(PORT, "0.0.0.0", () => {
    console.log("Server is running on port:", PORT);
})

const { Server } = require("socket.io");

const io = new Server(server);

io.use((socket, next) => {
    const cookie = socket.handshake.auth.cookie
    const credetionals = getCredentionals(cookie)
    if (!credetionals) {
        next(new Error("no auth"))
    }

    socket.credetionals = credetionals
    next()
})

io.on("connection", async (socket) => {
    console.log("User connected. id =", socket.id);
    let userNickName = socket.credetionals?.login
    let userId = socket.credetionals?.user_id

    let messages = await db.getMessages()
    socket.emit("all_messages", messages)

    socket.on("new_message", (message) => {
        console.log(`${userNickName}: ${message}`)
        db.addMessage(message, userId)
        io.emit("message", userNickName + ":" + message)
    });

});



function guarded(req, res) {
    console.log(req.headers?.cookie)
    const Credentionals = getCredentionals(req.headers?.cookie)
    if (!Credentionals) {
        res.writeHead(302, {"Location": "/login"})
        return res.end()
    }

    if (req.method === "GET") {

        switch (req.url) {
            case "/": return res.end(indexHtmlFile)
            case "/script.js": return res.end(scriptFile)
        }
    }

    res.statusCode = 404
    return res.end("Error 404")
}

function getCredentionals(c = "") {
    const cookies = cookie.parse(c)
    const token = cookies?.token
    console.log(cookies)

    if(!token || !validAuthTokens.includes(token)) return null
    const [user_id, login] = token.split(".")
    console.log(user_id, login)
    if (!user_id || !login) return null
    return {user_id, login}
}



function reqisterUser(req, res) {
    let data = ""
    req.on("data", function (chunk) {
        data += chunk
    })

    req.on("end", async function () {
        try {
            const user = JSON.parse(data)
            console.log(user)

            if (!user.login || !user.password) {
                return res.end("Empty login or password")
            }

            if (await db.isUserExist(user.login)) {
                return res.end("User already exist")
            }

            await db.addUser(user)
            return res.end("Registration is successfull!")

        } catch (error) {
            return res.end(error)
        }

    })
}

function loginUser(req, res) {
    let data = ''
    req.on('data', function(chunk) {
        data += chunk
    })
    req.on('end', async function(){
        try {
            const user = JSON.parse(data)
            const token = await db.getAuthToken(user)
            validAuthTokens.push(token)
            res.writeHead(200)
            res.end(token)
        }
        catch(e) {
            res.writeHead(500)
            console.log(e)
            return res.end("Error: " + e)
        }
    })
}

function logoutUser(req, res) {
    const cookies = cookie.parse(req.headers?.cookie || "")
    const token = cookies?.token
    
    if (token) {
        const index = validAuthTokens.indexOf(token)
        if (index > -1) {
            validAuthTokens.splice(index, 1)
        }
    }
    
    res.writeHead(302, {
        "Location": "/login",
        "Set-Cookie": "token=; Path=/; Max-Age=0"
    })
    res.end()
}