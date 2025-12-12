import { ElementRef } from "@angular/core";
import { FormHTMLElement } from "../models/common.model";


export async function waitForWebComponent(tagName: string, timeout = 5000): Promise<void> {
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

export const buildCustomElName = (element: FormHTMLElement): string => {
  const tag = element.tagName;
  const typeAttr = element.getAttribute('type');
  const formElementType = element.type;
  const type = (formElementType || typeAttr)?.toUpperCase().replace(/-/g, '_');

  return `${tag}__${type}`;
}

