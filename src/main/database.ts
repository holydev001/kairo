import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import type { Database } from 'sql.js'
import initSqlJs from 'sql.js'
import { createEmptyEntry, dailyEntrySchema, type DailyEntry } from '../shared/journal'

const require = createRequire(import.meta.url)

export class JournalDatabase {
  private constructor(
    private readonly database: Database,
    private readonly path: string
  ) {}

  static async open(path: string): Promise<JournalDatabase> {
    const SQL = await initSqlJs({
      locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm')
    })
    const database = existsSync(path)
      ? new SQL.Database(new Uint8Array(readFileSync(path)))
      : new SQL.Database()

    database.run(`
      CREATE TABLE IF NOT EXISTS daily_entries (
        date TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)

    const journal = new JournalDatabase(database, path)
    journal.persist()
    return journal
  }

  get(date: string): DailyEntry {
    const statement = this.database.prepare(
      'SELECT payload FROM daily_entries WHERE date = :date LIMIT 1'
    )
    statement.bind({ ':date': date })
    const entry = statement.step()
      ? dailyEntrySchema.parse(JSON.parse(String(statement.getAsObject().payload)))
      : createEmptyEntry(date)
    statement.free()
    return entry
  }

  save(value: unknown): DailyEntry {
    const entry = dailyEntrySchema.parse({
      ...(typeof value === 'object' && value !== null ? value : {}),
      updatedAt: new Date().toISOString()
    })

    this.database.run(
      `INSERT INTO daily_entries (date, payload, updated_at)
       VALUES (:date, :payload, :updatedAt)
       ON CONFLICT(date) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
      {
        ':date': entry.date,
        ':payload': JSON.stringify(entry),
        ':updatedAt': entry.updatedAt
      }
    )
    this.persist()
    return entry
  }

  private persist(): void {
    writeFileSync(this.path, Buffer.from(this.database.export()))
  }
}
