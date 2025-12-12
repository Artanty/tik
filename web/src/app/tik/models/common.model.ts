import { InjectionToken, TemplateRef } from "@angular/core";

export const GUI_PLACEHOLDER_TEMPLATE = new InjectionToken<TemplateRef<any>>('GUI_PLACEHOLDER_TEMPLATE');
export type FormHTMLElement = HTMLElement & { type: string }

