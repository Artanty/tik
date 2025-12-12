
import { NgModule, Injector, ApplicationRef, DoBootstrap } from '@angular/core';
import { createCustomElement } from '@angular/elements';
import { GuiDirectiveBody } from './../_exposed/gui-directive-body';
import { CommonModule } from '@angular/common';
// import { test } from './_exposed/test';
// import { UserAvatarComponent } from './components/_remotes/user-avatar/user-avatar.component';
// import { SharedWithComponent } from './components/_remotes/shared-with/shared-with.component';

// const mapping: any = {
//   'au-user-avatar': UserAvatarComponent,
//   'au-shared-with': SharedWithComponent
// }

export function defineCustomElement(customElementName: string, injector?: Injector): void {
  // if (typeof customElements !== 'undefined' && !customElements.get(customElementName)) {
  //   // If no injector is provided, use a fallback (less ideal but works)
  //   const effectiveInjector = injector || (window as any).ngInjector;
    
  //   if (effectiveInjector) {
  //     const customElement = createCustomElement(mapping[customElementName], { 
  //       injector: effectiveInjector 
  //     });
  //     customElements.define(customElementName, customElement);
  //     // console.log('customElement: ' + customElementName + ' defined')
  //   } else {
  //     console.warn('No injector available for custom element registration');
  //   }
  // }
  throw new Error('NOT IMLEMENTED')
}

// Also export the component for direct usage
// export { UserAvatarComponent } from './user-avatar.component';

export function getService(serviceName: string) {
  switch (serviceName) {
    case 'service1': {
      return 'service1';
      break;
    }
    case 'service2': {
      return 'service2'
      break;
    }
    default: {
      return 'default service'
      // return test()
    }
  }
};

export { GuiDirectiveBody as directive };