// app2/src/app/components/web-component-wrapper.component.ts
import { 
  Component, 
  Input, 
  ViewChild, 
  ViewContainerRef, 
  AfterViewInit, 
  OnChanges, 
  SimpleChanges,
  Injector,
  ComponentFactoryResolver
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'gui-web-component-wrapper',
  template: `<div #container></div>`,
  // standalone: true,
  // imports: [CommonModule]
})
export class WebComponentWrapperComponent implements AfterViewInit, OnChanges {
  @Input() componentName!: string;
  @Input() inputs?: Record<string, any>;
  @Input() outputs?: Record<string, (event: any) => void>;
  
  @ViewChild('container', { read: ViewContainerRef, static: true })
  viewContainerRef!: ViewContainerRef;

  private element: HTMLElement | null = null;

  constructor(
    private componentFactoryResolver: ComponentFactoryResolver,
    private injector: Injector
  ) {}

  ngAfterViewInit() {
    // console.log('componentName: ' + this.componentName)
    this.renderComponent();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.element && (changes['inputs'] || changes['outputs'])) {
      this.updateComponent();
    }
  }

  private async renderComponent() {
    try {
      this.element = await this.renderWebComponent(
        this.viewContainerRef,
        this.componentName,
        this.inputs,
        this.outputs
      );
    } catch (error) {
      console.error('Failed to render web component:', error);
    }
  }

  private updateComponent() {
    if (!this.element) return;

    // Update inputs
    if (this.inputs) {
      Object.keys(this.inputs).forEach(key => {
        (this.element as any)[key] = this.inputs![key];
      });
    }
  }

  // Method to render web component dynamically
  private async renderWebComponent(
    viewContainerRef: ViewContainerRef,
    tagName: string,
    inputs?: Record<string, any>,
    outputs?: Record<string, (event: any) => void>
  ): Promise<HTMLElement> {
    
    // Wait for web component to be registered
    await this.waitForWebComponent(tagName);
    
    // Clear the container
    viewContainerRef.clear();
    
    // Create the web component element
    const element = document.createElement(tagName);
    
    // Set input properties
    if (inputs) {
      Object.keys(inputs).forEach(key => {
        (element as any)[key] = inputs[key];
      });
    }
    
    // Subscribe to output events
    if (outputs) {
      this.addOutputListeners(element, outputs);
    }
    
    // Get the native element of the view container
    const containerElement = viewContainerRef.element.nativeElement;
    
    // Append the web component
    containerElement.appendChild(element);
    
    return element;
  }

  private addOutputListeners(
    element: HTMLElement, 
    outputs: Record<string, (event: any) => void>
  ) {
    Object.entries(outputs).forEach(([eventName, callback]) => {
      if (callback) {
        const handler = (event: Event) => {
          const customEvent = event as CustomEvent;
          callback(customEvent.detail);
        };
        element.addEventListener(eventName, handler as EventListener);
      }
    });
  }

  private waitForWebComponent(tagName: string, timeout = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (customElements.get(tagName)) {
        resolve();
        return;
      }

      const interval = setInterval(() => {
        if (customElements.get(tagName)) {
          clearInterval(interval);
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(interval);
        reject(new Error(`Web component ${tagName} not found`));
      }, timeout);
    });
  }
}