const fs = require("fs")
const dbFile = "./chat.db"
const exists = fs.existsSync(dbFile)
const sqlite3 = require("sqlite3").verbose()
const dbWrapper = require("sqlite")
const crypto = require("crypto")
const cookie = require("cookie")

let db

dbWrapper.open({
    filename: dbFile,
    driver: sqlite3.Database
}).then(async dBase => {
    db = dBase
    try {
        if (!exists) {
            await db.run(
                `CREATE TABLE user (
                user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                login TEXT NOT NULL,
                password TEXT NOT NULL
                );`
            )
            await db.run(
                `INSERT INTO user (login, password)
                VALUES
                    ('Durov', 'durov123'),
                    ('admin', 'qwerty');`
            )
            await db.run(
                `CREATE TABLE message (
                msg_id INTEGER PRIMARY KEY AUTOINCREMENT,
                author INTEGER,
                text TEXT NOT NULL,
                FOREIGN KEY(author) REFERENCES user(id)
                );`
            )
        } else {
            console.log(await db.all(`SELECT * FROM user`))
        }

    } catch (dbError) {
        console.error(dbError)
    }
})


module.exports = {
    getMessages: async () => {
        try {
            return await db.all(
                `SELECT msg_id, text, login, user_id from message
                JOIN user ON message.author = user.user_id`
            )

        } catch (dbError) {
            console.error(dbError)
        }
    },
    addMessage: async (msg, userId) => {
        try {
            await db.run(
                `INSERT INTO message (text, author) VALUES (?, ?)`,
                [msg, userId]
            )
        } catch (dbError) {
            console.error(dbError)
        }
    },

    isUserExist: async (login) => {
        const candidate = await db.all(`SELECT * FROM user WHERE login = ?`, [login])
        return !!candidate.length
    },

    addUser: async (user) => {
        await db.run(
            `INSERT INTO user (login, password) VALUES (?, ?)`,
            [user.login, user.password]
        )
    },

    // isUserExist: async (login) => {
    //     const candidate = await db.all(`SELECT * FROM user WHERE login = ?`, [login])
    //     return !!candidate.length
    // },

    // addUser: async (user) => {
    //     await db.run(
    //         `INSERT INTO user (login, password) VALUES (?, ?)`,
    //         [user.login, user.password]
    //     )
    // }

    getAuthToken: async (user) => {
        const candidate = await db.all(`SELECT * FROM user WHERE login = ?`, [user.login])
        if (!candidate.length) {
            throw "Wrong longin!"
        }
        if (candidate[0].password !== user.password) {
            throw "Wrong password!"
        }

        return candidate[0].user_id + '.' + candidate[0].login + '.' + crypto.randomBytes(20).toString('hex')
    }

}