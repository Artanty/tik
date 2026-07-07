import { responseLogService } from '../services/responseLog.service.js'

export class ResponseLogController {
  static getLogs(_req: any, res: any): void {
    res.json(responseLogService.getAll())
  }
}
