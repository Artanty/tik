import { responseLogService } from '../services/responseLog.service'

export class ResponseLogController {
  static getLogs(_req: any, res: any): void {
    res.json(responseLogService.getAll())
  }
}
