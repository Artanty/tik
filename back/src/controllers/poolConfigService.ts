import { eventProgress } from "../core/constants"
import { dd } from "../utils/dd"

export interface PoolConfigItemBody {
	cur: number
	len: number
	// prc: number
	stt: number
}

export interface PoolConfigItem {
	string: PoolConfigItemBody
}

export class PoolConfigService {
  
	static incrementPlayingEvents(config: PoolConfigItem | string) {
		
		if (typeof config === 'string') {
			return config	
		}
		
		const updated = Object.entries(config).reduce((acc: any, curr: [string, PoolConfigItemBody]) => {
			// dd(curr)
			const [eventId, eventConfig] = curr;

			if (eventConfig.len && eventConfig.stt === eventProgress.PLAYING) {
				if (eventConfig.cur < eventConfig.len) {
					eventConfig.cur++;

					// eventConfig.prc = Math.round((eventConfig.cur / eventConfig.len) * 100);
				}
			}
			acc[eventId] = {};
			acc[eventId] = eventConfig;

			return acc;
		}, {})
		
		return updated
	}
}