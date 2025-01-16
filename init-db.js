import client from './db.js'
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function initDb() {
    const schema = await fs.readFile(path.join(__dirname, "schema.sql"), "utf-8")
    const statements = schema
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0)

    try {
        for (const statement of statements) {
            await client.execute(statement + ';')
        }
        console.log("Database initialized successfully!")
    } catch (err) {
        console.error("Error initializing database:", err)
        throw err
    }
}

initDb().catch(console.error)

