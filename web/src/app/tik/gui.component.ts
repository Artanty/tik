import { Component, Inject, InjectionToken, Injector, OnDestroy, OnInit } from '@angular/core';

import { BehaviorSubject, Observable, Subject, combineLatest, filter, of, take, takeUntil } from 'rxjs';
import { BusEvent, EVENT_BUS } from 'typlib';

export const EVENT_BUS_LISTENER = new InjectionToken<Observable<BusEvent>>('');
export const EVENT_BUS_PUSHER = new InjectionToken<
  (busEvent: BusEvent) => void
>('');

@Component({
  selector: 'app-gui',
  templateUrl: './gui.component.html',
  styleUrl: './gui.component.scss',
  providers: [
    {
      provide: EVENT_BUS_LISTENER,
      useFactory: (eventBus$: BehaviorSubject<BusEvent>) => {
        return eventBus$
          .asObservable()
          .pipe(filter((res: BusEvent) => res.to === `${process.env['PROJECT_ID']}@${process.env['NAMESPACE']}`));
      },
      deps: [EVENT_BUS],
    },
    {
      provide: EVENT_BUS_PUSHER,
      useFactory: (eventBus$: BehaviorSubject<BusEvent>) => {
        return (busEvent: BusEvent) => {
          eventBus$.next(busEvent);
        };
      },
      deps: [EVENT_BUS],
    },
  ],
})
export class GuiComponent {
}

