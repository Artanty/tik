import { Inject, Injectable } from '@angular/core';
import {
  Observable,
  Subscription,
  BehaviorSubject
} from "rxjs";
import { dd } from '../utilites/dd';
import { BusEvent, EVENT_BUS_PUSHER } from 'typlib';
import { isEmptyConfig } from '../utilites/isEmptyConfig';
import { HttpClient, HttpDownloadProgressEvent, HttpEventType } from '@angular/common/http';

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

  private _sseSubscription?: Subscription
  private _lastProcessedLength = 0

  constructor(
    // @Inject(StoreService) private StoreServ: StoreService,
    // @Inject(CounterService) private CounterServ: CounterService,
    // @Inject(ScheduleEventService) private ScheduleEventServ: ScheduleEventService,
    // @Inject(ScheduleService) private ScheduleServ: ScheduleService,
    // @Inject(UserService) private UserServ: UserService,
    @Inject(EVENT_BUS_PUSHER)
    private eventBusPusher: (busEvent: BusEvent) => void,
    private http: HttpClient,
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
    const url = `${process.env['TIK_BACK_URL']}/sse/${poolId}`;

    this._sseSubscription = this.http.get(url, {
      observe: 'events',
      reportProgress: true,
      responseType: 'text'
    }).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.DownloadProgress) {
          const progressEvent = event as HttpDownloadProgressEvent;
          this.isReady$.next(true);
          const partialText = progressEvent.partialText || '';
          const newText = partialText.slice(this._lastProcessedLength);
          this._lastProcessedLength = partialText.length;

          const chunks = newText.split('\n\n');
          for (let i = 0; i < chunks.length - 1; i++) {
            const chunk = chunks[i].trim();
            if (!chunk.startsWith('data: ')) continue;
            const jsonStr = chunk.slice(6);
            try {
              const data: { config: Record<string, EventStateResItem> } = JSON.parse(jsonStr);
              if (!isEmptyConfig(data)) {
                const allRemotes = data.config;
                const getProjectIdAndEventIdFromKey = (key: string): [string, string] => {
                  return [key.split('__')[0] + '@web', key.split('__')[1]];
                };
                const eventsByProjectId = Object.entries(allRemotes)
                  .reduce((acc: Record<string, EventStateResItem[]>, [eventKey, eventData]: [string, EventStateResItem]) => {
                    const [projectId, eventId] = getProjectIdAndEventIdFromKey(eventKey);
                    if (!acc[projectId]) {
                      acc[projectId] = [];
                    }
                    acc[projectId].push({ ...eventData, id: eventId });
                    return acc;
                  }, {});

                Object.entries(eventsByProjectId).forEach(([remoteId, remotePayload]) => {
                  const busEvent: BusEvent = {
                    from: 'tik@web',
                    to: remoteId,
                    event: 'SSE_DATA',
                    payload: remotePayload
                  };
                  this.eventBusPusher(busEvent);
                });
              }
            } catch (error) {
              console.error(error);
            }
          }
        }
      },
      error: (error) => {
        this.isReady$.next(false);
        console.error(error);
      },
      complete: () => {
        this.isReady$.next(false);
      }
    });
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
    this._sseSubscription?.unsubscribe();
  }

}
