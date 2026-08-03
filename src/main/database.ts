import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import type { Database } from 'sql.js'
import initSqlJs from 'sql.js'
import { createEmptyEntry, dailyEntrySchema, type DailyEntry } from '../shared/journal'
import {
  createEmptyWeeklyReview,
  weeklyReviewSchema,
  type WeeklyReview
} from '../shared/weekly-review'

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
    database.run(`
      CREATE TABLE IF NOT EXISTS weekly_reviews (
        week_start TEXT PRIMARY KEY,
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

  list(limit = 180): DailyEntry[] {
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 365)
    const statement = this.database.prepare(
      'SELECT payload FROM daily_entries ORDER BY date DESC LIMIT :limit'
    )
    statement.bind({ ':limit': safeLimit })
    const entries: DailyEntry[] = []

    while (statement.step()) {
      entries.push(dailyEntrySchema.parse(JSON.parse(String(statement.getAsObject().payload))))
    }

    statement.free()
    return entries
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

  getWeeklyReview(weekStart: string): WeeklyReview {
    const statement = this.database.prepare(
      'SELECT payload FROM weekly_reviews WHERE week_start = :weekStart LIMIT 1'
    )
    statement.bind({ ':weekStart': weekStart })
    const review = statement.step()
      ? weeklyReviewSchema.parse(JSON.parse(String(statement.getAsObject().payload)))
      : createEmptyWeeklyReview(weekStart)
    statement.free()
    return review
  }

  saveWeeklyReview(value: unknown): WeeklyReview {
    const review = weeklyReviewSchema.parse({
      ...(typeof value === 'object' && value !== null ? value : {}),
      updatedAt: new Date().toISOString()
    })

    this.database.run(
      `INSERT INTO weekly_reviews (week_start, payload, updated_at)
       VALUES (:weekStart, :payload, :updatedAt)
       ON CONFLICT(week_start) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
      {
        ':weekStart': review.weekStart,
        ':payload': JSON.stringify(review),
        ':updatedAt': review.updatedAt
      }
    )
    this.persist()
    return review
  }

  private persist(): void {
    writeFileSync(this.path, Buffer.from(this.database.export()))
  }
}
