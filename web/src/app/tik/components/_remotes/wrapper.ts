import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  Injector,
  Input,
  OnChanges,
} from '@angular/core';
import { ContainerComponent } from './container';



@Component({
  selector: 'app-wrapper',
  template: `<app-component-container [injector]="injector" [componentName]="componentName" />`,
  imports: [
    CommonModule,
    ContainerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class WrapperComponent implements OnChanges {
  @Input({ required: true })
  public providers!: Record<string, any>;

  protected injector?: Injector;

  constructor(
    private readonly _injector: Injector,
    @Inject('componentName') protected componentName: string,
  ) {}

  ngOnChanges() {
    if (this.providers) {
      this.injector = Injector.create({
        providers: [
          // { provide: Api, useValue: this.providers['api'] },
          // { provide: Service, useValue: this.providers['service'] },
        ],
        parent: this._injector,
      });
    }
  }
}