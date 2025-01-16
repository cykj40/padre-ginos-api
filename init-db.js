import client from './db.js'
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function initDb() {
    const schema = await fs.readFile(path.join(__dirname, "schema.sql"), "utf-8")
    const statements = schema
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0)

    try {
        // Execute each statement individually
        for (const statement of statements) {
            if (statement) {
                try {
                    await client.execute(statement + ';')
                    console.log('Executed:', statement.substring(0, 50) + '...')
                } catch (err) {
                    // Log the error but continue with other statements
                    console.error('Error executing:', statement.substring(0, 50) + '...')
                    console.error('Error:', err.message)
                }
            }
        }
        console.log("Database initialization completed!")
    } catch (err) {
        console.error("Error initializing database:", err)
        throw err
    }
}

initDb().catch(console.error)

