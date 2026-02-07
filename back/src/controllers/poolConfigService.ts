import { eventProgress } from "../core/constants"
import { dd } from "../utils/dd"
import { OuterEventsStateController } from "./outerEventsStateController"
/**
 *  "doro__e_329": {
	 "cur": 0,
	 "len": 10,
	 "stt": 3
    },
 * */
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
			const [eventId, entryConfig] = curr;

			if (entryConfig.len && entryConfig.stt === eventProgress.PLAYING) {
				// не достиг конца
				if (entryConfig.cur < entryConfig.len) {
					entryConfig.cur++;

					// eventConfig.prc = Math.round((eventConfig.cur / eventConfig.len) * 100);
				} else {
					// достиг конца
					OuterEventsStateController.finishEntry(eventId, entryConfig);
				}
			}
			acc[eventId] = {};
			acc[eventId] = entryConfig;

			return acc;
		}, {})
		
		return updated
	}
}