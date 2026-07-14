import { Inject, Injectable } from '@angular/core';
import { BusEvent, EVENT_BUS_LISTENER, EVENT_BUS_PUSHER, HOST_NAME } from 'typlib';
import { ExecutableAction } from '../models/action.model';
import { filter, map, Observable, of, ReplaySubject, take } from 'rxjs';
import { filterBusEventsByProject, filterBusEventsByEvent } from '@shared';


@Injectable()
export class AskProjectIdsAction implements ExecutableAction {
  constructor(
    @Inject(EVENT_BUS_PUSHER)
    private eventBusPusher: (busEvent: BusEvent) => void,
    @Inject(EVENT_BUS_LISTENER)
    private readonly eventBusListener$: Observable<BusEvent>,
  ) {}

  public execute(): Observable<any> | any {

    const returnObs$ = new ReplaySubject<any>(1)

    this.eventBusListener$
      .pipe(
        filter(res => filterBusEventsByProject(res, process.env['PROJECT_ID'], process.env['NAMESPACE'])),
        filter(res => filterBusEventsByEvent(res, 'PROJECTS_IDS')),
        map(res => res.payload.projectsIds),
        take(1)
      ).subscribe(res => {
        returnObs$.next(res)
      })

    const busEvent: BusEvent = {
      from: `${process.env['PROJECT_ID']}@${process.env['NAMESPACE']}`,
      to: 'faq@web-host', // todo
      event: 'ASK_PROJECTS_IDS',
      payload: {},
    };

    this.eventBusPusher(busEvent);

    return returnObs$.pipe(take(1));
  }
}