import { Inject, Injectable } from '@angular/core';
import { BusEvent, EVENT_BUS_LISTENER, EVENT_BUS_PUSHER, HOST_NAME } from 'typlib';
import { BehaviorSubject, filter, map, Observable, of, ReplaySubject, scan, Subject, take, takeUntil, timeout } from 'rxjs';
import { eventBusFilterByEvent } from '../utilites/eventBusFilterByEvent';
import { eventBusFilterByProject } from '../utilites/eventBusFilterByProject';
import { dd } from '../utilites/dd';
import { ExecutableAction } from '../models/action.model';


export interface BackUrl { project_id: string, back_url: string }


@Injectable()
export class AskBackUrlsAction implements ExecutableAction {
    constructor(
        @Inject(EVENT_BUS_PUSHER)
        private eventBusPusher: (busEvent: BusEvent) => void,
        @Inject(EVENT_BUS_LISTENER)
        private readonly eventBusListener$: Observable<BusEvent>,
    ) {
    }
    // todo add timeout & error action
    public execute(requiredProjectIds: string[]): Observable<BackUrl[]> {

        const returnObs$ = new ReplaySubject<BackUrl[]>(1)

        const targetProjects = new Set(requiredProjectIds);

        this.eventBusListener$.pipe(
            filter(eventBusFilterByProject),
            filter(event => eventBusFilterByEvent(event, 'BACK_URLS')),
        
            // Accumulate responses in an object {project_id: back_url}
            scan((acc, event) => {
                const { project_id, back_url } = event.payload;
                if (targetProjects.has(project_id)) {
                    
                    return { ...acc, [project_id]: back_url };
                }
                return acc;
            }, {} as Record<string, string>),
        
            // Check if we have all required projects // todo wait or tries to throw error?
            filter(collectedUrls => {
                return Array.from(targetProjects).every(projectId => 
                    projectId in collectedUrls
                );
            }),
            // Convert to array format when complete
            map(collectedUrls => {
                return Array.from(targetProjects).map(projectId => ({
                    project_id: projectId,
                    back_url: collectedUrls[projectId]
                }));
            }),
        
            take(1),
        )
            .subscribe(res => {
                returnObs$.next(res)
            })

        const busEvent: BusEvent = {
            from: `${process.env['PROJECT_ID']}@${process.env['NAMESPACE']}`,
            to: `faq@web-host`,
            event: 'ASK_BACK_URLS',
            payload: {},
        };
        this.eventBusPusher(busEvent);

        return returnObs$.pipe(take(1))
    }
}

