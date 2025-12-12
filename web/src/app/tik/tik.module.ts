import { CommonModule } from '@angular/common';
import { inject, Inject, Injector, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { GuiComponent } from './gui.component';
import { eventBusFilterByProject } from './utilites/eventBusFilterByProject';
import { createCustomElement } from '@angular/elements';
import { WrapperComponent } from './components/_remotes/wrapper';
import { SelectComponent } from './components/_remotes/select/select.component';
import { ToggleComponent } from './components/_remotes/toggle/toggle.component';
import { InputComponent } from './components/_remotes/input/input.component';
import { ButtonComponent } from './components/_remotes/button/button.component';
import { InputColorComponent } from './components/_remotes/input-color/input-color.component';
import { DropdownComponent } from './components/_remotes/dropdown/dropdown.component';
import { BusEvent, EVENT_BUS, EVENT_BUS_LISTENER, EVENT_BUS_PUSHER, HOST_NAME } from 'typlib';
import { BehaviorSubject, distinctUntilChanged, filter, forkJoin, Observable, take } from 'rxjs';
import { SseService } from './services/sse.service';
import { dd } from './utilites/dd';
import { AskProjectIdsAction } from './actions/askProjectsIds.action';
import { ExecutableAction } from './models/action.model';
import { AskSsePayloadAction } from './actions/askSsePayload.action';
import { projectsWithSSE } from './core/constants';
import { StreamContentService } from './services/stream-content.service';
import { AskBackUrlsAction } from './actions/askBackUrls.action';
import { HttpClient } from '@angular/common/http';
import { ensureBackProjectId } from './utilites/ensureBackProjectId';


@NgModule({
  declarations: [
    
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([]),
    
  ],
  exports: [
    
  ],
  providers: [
    { 
      provide: EVENT_BUS_LISTENER, 
      useFactory: (eventBus$: BehaviorSubject<BusEvent>) => {
        return eventBus$
          .asObservable()
          .pipe(
          // filter(eventBusFilterByProject)
        );
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
    AskProjectIdsAction,
    AskSsePayloadAction,
    AskBackUrlsAction
  ],
  bootstrap: []
})
export class TikModule {
  ngDoBootstrap() {}

  constructor(
    private injector: Injector,
    @Inject(EVENT_BUS_LISTENER)
    private readonly eventBusListener$: Observable<BusEvent>,
    @Inject(EVENT_BUS_PUSHER)
    private eventBusPusher: (busEvent: BusEvent) => void,
    @Inject(SseService) private SseServ: SseService,
    @Inject(HOST_NAME) private readonly hostName: string,
    private streamContentService: StreamContentService,
    private http: HttpClient
    
  ) {
    console.log('tik module constructor')
    // this.register()
    this.eventBusListener$
      .pipe(
    ).subscribe((res: BusEvent) => {
      // dd(res)
      if (res.event === 'TRIGGER_ACTION') {
        // dd('WOW')
        // dd(res)
        if (res.payload.action === 'INIT_TIK_STREAM') {
          this.initTikStream()
          this._sendProductButtonCollapsed()
          this._initTik()
        }
      }
    })
  }

  // todo: move to scenario
  private _initTik() {
    const ids = this.injector
      .get<ExecutableAction>(ActionMap.get('ASK_PROJECTS_IDS'))
      .execute();
    ids.subscribe((res: string[]) => {
      
      const projectsIds = res.filter(projectId => projectsWithSSE.includes(projectId));
      this.injector
        .get<ExecutableAction>(ActionMap.get('ASK_BACK_URLS'))
        .execute(projectsIds).subscribe((res: any) => {
          //           {
          //     "project_id": "doro",
          //     "back_url": "http://localhost:3201"
          // }
          console.log(res)
          res = res[0]
          this.getOuterEventsStates(res.project_id, res.back_url)
        });
    })
    
  }

  public getOuterEventsStates(project_id: string, back_url: string) {
    const payload = {
      backendUrl: back_url,
      projectId: ensureBackProjectId(project_id),
      poolId: 'current_user_id'
    }
    this.http.post(`${process.env['TIK_BACK_URL']}/collectEventsState`, payload).subscribe(
      (response) => {
        console.log(response)
      },
      (error) => {
        console.error(error.message)
      },
    );
  }

  private initTikStream() {
    this.SseServ.createEventSource()
  }

  private _sendProductButtonCollapsed() {
    const busEvent: BusEvent = {
      from: `${process.env['PROJECT_ID']}@${process.env['NAMESPACE']}`,
      to: this.hostName,
      event: 'PRODUCT_BTN_COLLAPSED',
      payload: {
        projectId: 'tik',
        username: 'antoshkin'
      },
    };

    this.eventBusPusher(busEvent);
  }
  
  private _componentsToElements = [
    { component: SelectComponent, name: 'SelectComponent' },
    { component: ToggleComponent, name: 'ToggleComponent' },
    { component: InputComponent, name: 'InputComponent' },
    { component: ButtonComponent, name: 'ButtonComponent' },
    { component: InputColorComponent, name: 'InputColorComponent' },
    { component: DropdownComponent, name: 'DropdownComponent' },
  ];

  private register() {
    this._componentsToElements.forEach(({ component, name }: { component: any, name: string }) => {
      const injectorWithComponentName = Injector.create({
        providers: [
          { provide: 'componentName', useValue: name },
        ],
        parent: this.injector,
      });
        
      const webComponent = createCustomElement(component, {
        injector: injectorWithComponentName,
      });

      const elementName = this._renameComponentToCustomElement(name);
      customElements.define(elementName, webComponent);
      
      // console.log(`Registered: ${name} as <${elementName}>`);
    });
  }
  /**
   * ButtonComponent -> gui-button
   * InputColorComponent -> gui-input-color
   * */
  private _renameComponentToCustomElement(className: string): string {
    // Remove "Component" suffix if present
    let name = className.replace(/Component$/, '');
    
    // Convert camelCase to kebab-case
    name = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    
    // Add 'gui-' prefix
    return `gui-${name}`;
  }
}

export const ActionMap = new Map<string, any>([
  ['ASK_PROJECTS_IDS', AskProjectIdsAction],
  ['ASK_SSE_PAYLOAD', AskSsePayloadAction],
  ['ASK_BACK_URLS', AskBackUrlsAction]
]);


