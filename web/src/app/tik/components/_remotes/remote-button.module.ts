import { Component, Injectable, NgModule } from '@angular/core';
// import { ProductButtonTopComponent } from './product-button-top.component';
import { CommonModule } from '@angular/common';
// import { FontInitializerService } from '../../services/font-initializer.service';
import { ProductCardComponent1 } from './product-card/product-card.component';

/**
 * SERVICE
 */
@Injectable({
  providedIn: 'root',
})
export class FontInitializerService {
  public value = 11
  initializeFonts(): void {
    console.log('fonts inited')
  }
}
/**
 * COMPONENT
 */
@Component({
  selector: 'app-lazy',
  template: `
    This is a lazy component with an ngFor:
    <ul><li *ngFor="let item of items">{{item}}</li></ul>
    {{service.value}}`
})
export class LazyComponent {
  items = ['Item 1', 'Item 2', 'Item 3'];

  constructor(public service: FontInitializerService) {}
}

/**
 * MODULE
 */
@NgModule({
  declarations: [LazyComponent],
  imports: [
    CommonModule, 
    // ProductButtonTopComponent
  ],
  exports: [
    // ProductButtonTopComponent
  ],
  providers: [FontInitializerService]
})
export class RemoteButtonModule {
  static components = [
    ProductCardComponent1, 
    // ProductButtonTopComponent
  ];
  // static services = [
  //   FontInitializerService
  // ]
}

