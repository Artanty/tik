import { Inject, Injectable } from '@angular/core';
import {
  Observable,
  filter,
  delay,
  from,
  of,
  take,
  startWith,
  BehaviorSubject
} from "rxjs";
import { dd } from '../utilites/dd';
import { BusEvent, EVENT_BUS_PUSHER } from 'typlib';
import { isEmptyConfig } from '../utilites/isEmptyConfig';

export interface EventStateResItem {
  id: string,
  cur: number,
  len: number,
  prc: number,
  stt: number
}


@Injectable({
  providedIn: 'root'
})
export class SseService {
  public isReady$ = new BehaviorSubject<boolean>(false)

  private _eventSource!: EventSource

  constructor(
    // @Inject(StoreService) private StoreServ: StoreService,
    // @Inject(CounterService) private CounterServ: CounterService,
    // @Inject(ScheduleEventService) private ScheduleEventServ: ScheduleEventService,
    // @Inject(ScheduleService) private ScheduleServ: ScheduleService,
    // @Inject(UserService) private UserServ: UserService,
    @Inject(EVENT_BUS_PUSHER)
    private eventBusPusher: (busEvent: BusEvent) => void,
  ) {}
  // todo: remoteids storage service
  public createEventSource(): void {
    // let tries = Number(process.env['RECONNECT_TRIES'] || 1) - 1
    
    // const poolId = 'user_handler'
    
    // const eventSource = new EventSource(`${process.env['TIK_BACK_URL']}/sse/${poolId}`);
    // this._eventSource.onerror = event => {
    //   if (tries) {
    //     tries--
    //   } else {
    //     this.closeSseConnection()
    //   }
    // }
    // // this.StoreServ.setConnectionState('LOADING')
    // new Observable(observer => {
    //   this._eventSource.onmessage = event => {
    //     const messageData: any = JSON.parse(event.data);
    //     observer.next(messageData);
    //   }
    // }).subscribe({
    //   next: (res: any) => {
    //     // this.StoreServ.setConnectionState('READY')

    //     //   if (this.readHashOf(res, 'config') !== this.config?.hash) {
    //     //     this.CounterServ.getScheduleConfig()
    //     //   }
    //     //   if (this.readHashOf(res, 'schedule') !== this.config?.scheduleHash) {
    //     //     this.waitConfig().subscribe(() => {
    //     //       this.config?.schedule_id && this.ScheduleServ.getSchedule(this.config?.schedule_id)
    //     //     })
    //     //   }
    //     //   if (this.readHashOf(res, 'events') !== this.config?.scheduleEventsHash) {
    //     //     this.waitConfig().subscribe(() => {
    //     //       this.config?.schedule_id && this.ScheduleEventServ.getScheduleEvents(this.config?.schedule_id)
    //     //     })
    //     //   }
    //     //   if (res.action === 'tick') {
    //     //     this.StoreServ.setTick(res)
    //     //   }
    //     dd('tick res:')
    //     dd(res)
    //   }
    // })
    this._connectToTikPool('current_user_id')
  }

  /**
   * Забираем через 1 стрим события для всех ремоутов текущего хоста.
   * */
  private _connectToTikPool(poolId: string): void {
 
    const eventSource = new EventSource(`${process.env['TIK_BACK_URL']}/sse/${poolId}`);
  
    eventSource.onmessage = (e: MessageEvent) => {
      this.isReady$.next(true)
      try {
        const data: { config: Record<string, EventStateResItem> } = JSON.parse(e.data);
        // const mins = Math.floor(data.value / 60);
        // const secs = data.value % 60;
        // const formattedTime = `${mins}:${secs.toString().padStart(2, '0')}`;
        // dd(formattedTime)
        // const eventValue: EventData = {
        //   raw: data,
        //   formattedTime: formattedTime,
        //   minutes: mins,
        //   seconds: secs,
        //   totalSeconds: data.value,
        //   state: 'isRunning' // replace to tik back?
        // }

        // const streams = this.eventStreams$.getValue()
        // streams.set(poolId, eventValue)
        // this.eventStreams$.next(streams)

        // if (data.type && data.type === 'init') {
        //   this.setConnectionState(connId, data.type);
        // }
        // dd(data)
        if (!isEmptyConfig(data)) {
          // dd('CONFIG IS NOT EMPTY:')
          
          const allRemotes = data.config
          // dd(allRemotes)
          const getProjectIdAndEventIdFromKey = (key: string): [string, string] => {
            return [key.split('__')[0] + '@web', key.split('__')[1]]
          }
          const eventsByProjectId = Object.entries(allRemotes)
            .reduce((acc: Record<string, EventStateResItem[]>, [eventKey, eventData]: [string, EventStateResItem]) => {
              const [projectId, eventId] = getProjectIdAndEventIdFromKey(eventKey)
              if (!acc[projectId]) {
                acc[projectId] = [];
              }
              const eventObject = { ...eventData, id: eventId }
              acc[projectId].push(eventObject)
              return acc;
            }, {})
          // dd(eventsByProjectId)
          
          Object.entries(eventsByProjectId).forEach(([remoteId, remotePayload]) => {

            const busEvent: BusEvent = {
              from: 'tik@web',
              to: remoteId,
              event: 'SSE_DATA',
              payload: remotePayload
            }
            // dd(busEvent)
            this.eventBusPusher(busEvent)  
          })
        } else {
          // dd('CONFIG IS EMPTY:')
          // dd(data.config)
        }
        
        
      } catch (error) {
        console.error(error);
      }
    };
  
    eventSource.onerror = (error) => {
      this.isReady$.next(false)
      console.error(error);

      // const streams = this.eventStreams$.getValue()
      // streams.delete(poolId);
      // this.eventStreams$.next(streams)

      
      eventSource.close();
    };
  
    
  }


  /**
   * wait for first load of config
   */
  // waitConfig() {
  //   return this.StoreServ.listenScheduleConfig().pipe(
  //     startWith(this.config),
  //     filter(Boolean),
  //     take(1)
  //   )
  // }

  // get config () {
  //   return this.StoreServ.getScheduleConfig()
  // }

  // private readHashOf (res: any, entity: string): string {
  //   // hash: scheduleConfig.hash + '__' + scheduleConfig.scheduleHash + '__' + scheduleConfig.scheduleEventsHash
  //   const hashes = res.hash.split('__')
  //   let index
  //   switch (entity) {
  //     case 'config':
  //       index = 0
  //       break;
  //     case 'schedule':
  //       index = 1
  //       break;
  //     case 'events':
  //       index = 2
  //       break;
  //     default:
  //       throw new Error('function readHashOf failed. wrong entity name')
  //   }
  //   return hashes[index]
  // }

  // public listenTick (): Observable<ITick> {
  //   return this.StoreServ.listenTick().pipe(filter(Boolean))
  // }

  public closeSseConnection() {
    // this.StoreServ.setConnectionState('DISCONNECTED')
    this._eventSource.close()
  }

}
