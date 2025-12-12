import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  Injector,
  Input,
  OnInit,
  Optional,
  Type,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';


@Component({
  selector: 'app-component-container',
  template: '<ng-container #container />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class ContainerComponent implements OnInit {
  @ViewChild('container', { read: ViewContainerRef, static: true })
  public container!: ViewContainerRef;

  @Input({ required: true })
  public componentName!: string;

  @Input()
  public dynamicInputs?: Record<string, unknown>;

  @Input()
  public injector?: Injector;

  constructor(
    private readonly _injector: Injector,
    @Inject('components') private readonly _components: Record<string, Type<unknown>>[],
  ) {}

  ngOnInit() {
    const entry = this._components.find(item => item[this.componentName]);

    if (entry) {
      const component = entry[this.componentName];
      const { instance } = this.container.createComponent(component, { injector: this.injector || this._injector });
      Object.assign(instance as Record<string, unknown>, this.dynamicInputs);
    } else {
      console.error(`${this.componentName} component not provided.`);
    }
  }
}