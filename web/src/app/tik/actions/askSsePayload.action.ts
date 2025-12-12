import { Inject, Injectable } from '@angular/core';
import { BusEvent, EVENT_BUS_LISTENER, EVENT_BUS_PUSHER, HOST_NAME } from 'typlib';
import { ExecutableAction } from '../models/action.model';
import { filter, map, Observable, of, ReplaySubject, take } from 'rxjs';
import { eventBusFilterByProject } from '../utilites/eventBusFilterByProject';
import { eventBusFilterByEvent } from '../utilites/eventBusFilterByEvent';


@Injectable()
export class AskSsePayloadAction implements ExecutableAction {
  constructor(
    @Inject(EVENT_BUS_PUSHER)
    private eventBusPusher: (busEvent: BusEvent) => void,
    @Inject(EVENT_BUS_LISTENER)
    private readonly eventBusListener$: Observable<BusEvent>,
  ) {}

  public execute(remoteId: string): Observable<any> | any {

    const returnObs$ = new ReplaySubject<any>(1)

    this.eventBusListener$
      .pipe(
        filter(eventBusFilterByProject),
        filter(res => eventBusFilterByEvent(res, 'SSE_PAYLOAD')),
        // map(res => res.payload.projectsIds),
        take(1)
      ).subscribe(res => {
        returnObs$.next(res)
      })

    const busEvent: BusEvent = {
      from: `${process.env['PROJECT_ID']}@${process.env['NAMESPACE']}`,
      to: 'faq@web-host',
      event: 'ASK_SSE_PAYLOAD',
      payload: {
        "project_id": "doro"
      },
    };

    this.eventBusPusher(busEvent);

    return returnObs$.pipe(take(1));
  }
}