import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';

export async function createWebComponent(component: any, componentName: string) {
  const app = await createApplication({
    providers: [] // Your providers here
  });

  const WebComponent = createCustomElement(component, {
    injector: app.injector,
  });

  customElements.define(componentName, WebComponent);
}