import * as fs from 'fs'
import * as path from 'path'
import { AxiosResponse } from 'axios'
import { ResponseLogEntry } from '../types.js'

const LOG_FILE = path.resolve(process.cwd(), 'logs/response-log.json')
const MAX_ENTRIES = 10

class ResponseLogService {
  private entries: ResponseLogEntry[] = []

  constructor() {
    this.loadFromDisk()
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(LOG_FILE)) {
        const data = fs.readFileSync(LOG_FILE, 'utf-8')
        this.entries = JSON.parse(data)
      }
    } catch {
      this.entries = []
    }
  }

  private saveToDisk(): void {
    const dir = path.dirname(LOG_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(LOG_FILE, JSON.stringify(this.entries, null, 2))
  }

  add(entry: ResponseLogEntry): void {
    this.entries.push(entry)
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(-MAX_ENTRIES)
    }
    this.saveToDisk()
  }

  getAll(): ResponseLogEntry[] {
    return [...this.entries]
  }

  private isAxiosResponse(val: unknown): val is AxiosResponse {
    if (!val || typeof val !== 'object') return false
    const r = val as Record<string, unknown>
    return 'data' in r && 'status' in r && typeof r.status === 'number' && 'config' in r
  }

  save(res?: AxiosResponse | null, customData?: unknown): void {
    if (!this.isAxiosResponse(res)) {
      this.add({
        timestamp: new Date().toISOString(),
        method: 'UNKNOWN',
        url: 'UNKNOWN',
        status: 'ERROR',
        response: customData !== undefined ? String(customData) : 'No response',
        ...(customData !== undefined ? { customData: JSON.stringify(customData) } : {}),
      })
      return
    }
    const body = res.config.data
    this.add({
      timestamp: new Date().toISOString(),
      method: (res.config.method ?? 'GET').toUpperCase(),
      url: res.config.url ?? 'unknown',
      status: res.status,
      requestBody: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      response: typeof res.data === 'string' ? res.data : JSON.stringify(res.data),
      ...(customData !== undefined ? { customData: JSON.stringify(customData) } : {}),
    })
  }
}

export const responseLogService = new ResponseLogService()
