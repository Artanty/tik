import { getCustomElement, isRemoteLoaded } from './gui-service'
import { buildCustomElName } from './gui-utils'
import { FormHTMLElement, GUI_PLACEHOLDER_TEMPLATE } from "../models/common.model";
import {
  Directive, ElementRef, Renderer2, ComponentFactoryResolver, 
  ViewContainerRef, Input, OnInit, OnDestroy, Injector, TemplateRef,
  ComponentRef, Optional,
  InjectionToken,
  Inject,
  ChangeDetectorRef
} from '@angular/core';

import { BusEvent, EVENT_BUS, EVENT_BUS_LISTENER, EVENT_BUS_PUSHER, HOST_NAME } from 'typlib';
import { BehaviorSubject, filter, Observable } from 'rxjs';
import { dd } from './../utilites/dd';

export class GuiDirectiveBody {
  private element: FormHTMLElement;
  private customComponentRef: ComponentRef<any> | null = null;
  private placeholderViewRef: any = null;
  webComponentWrapperComponent: any = null;

  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
    private componentFactoryResolver: ComponentFactoryResolver,
    private viewContainerRef: ViewContainerRef,
    
    private injector: Injector,
    
    private cdr: ChangeDetectorRef,
    
    private readonly hostName: string,
    private WebComponentWrapperComponent: any,
    private inputs: any = {},
    private outputs: any = {}
  ) {
    this.element = this.el.nativeElement;
  } 

  test() {
    console.log('GUI DIRECTIVE BODY HEALTHCHECK')
    return 'test test' 
  }
  public async _findCustomElement() {
    try {
      const elementKey = buildCustomElName(this.element);
      const customElementName = await getCustomElement(elementKey);
      await this.replaceWithCustomComponent(customElementName);
    } catch (e: unknown) {
      const text = (e instanceof Error) ? e.message : e;
      this.showPlaceholder('Failed to load custom element. ' + text);
    }
  }

  private async replaceWithCustomComponent(customElementName: string): Promise<void> {
    try {
      this.hideElement();
      const factory = this.componentFactoryResolver.resolveComponentFactory(this.WebComponentWrapperComponent);
      this.customComponentRef = this.viewContainerRef.createComponent(factory, undefined, this.injector);
      
      const instance = this.customComponentRef.instance;
      instance.componentName = customElementName;
      instance.inputs = { ...this.inputs, type: this.inputs.type ?? this.element.type };
      instance.outputs = this.outputs;
      this.cdr.detectChanges()
    } catch {
      this.showPlaceholder('Failed to load custom component');
    }
  }

  private showPlaceholder(message: string) {
    this.hideElement();
    this.clearPlaceholder();

    this.createMinimalPlaceholder(message);
  }

  private createMinimalPlaceholder(message: string) {
    const placeholderElement = this.renderer.createElement('div');
    this.renderer.setProperty(placeholderElement, 'textContent', `${message}`);
    this.renderer.setStyle(placeholderElement, 'color', 'red');
    this.renderer.setStyle(placeholderElement, 'border', '1px solid red');
    this.renderer.setStyle(placeholderElement, 'padding', '5px');
    this.renderer.insertBefore(this.element.parentNode, placeholderElement, this.element.nextSibling);
    
    this.placeholderViewRef = { element: placeholderElement };
  }

  private clearPlaceholder() {
    if (this.placeholderViewRef) {
      if (this.placeholderViewRef.destroy) {
        this.placeholderViewRef.destroy();
      } else if (this.placeholderViewRef.element && this.placeholderViewRef.element.parentNode) {
        this.renderer.removeChild(this.placeholderViewRef.element.parentNode, this.placeholderViewRef.element);
      }
      this.placeholderViewRef = null;
    }
  }

  private async retryLoading() {
    this.clearPlaceholder();
    
    await this._findCustomElement()
  }

  private hideElement() {
    this.renderer.setStyle(this.element, 'display', 'none');
    this.renderer.setAttribute(this.element, 'aria-hidden', 'true');
  }

  // ngOnDestroy() {
  //   if (this.customComponentRef) {
  //     this.customComponentRef.destroy();
  //   }
    
  //   this.clearPlaceholder();
  // }
}