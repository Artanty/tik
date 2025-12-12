import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Nullable } from '../utilites/utility.types';

export interface IViewState {
  scope?: string,
  action: string
  payload?: Record<string, string | boolean>
}
@Injectable()
export class ViewService {

  private viewState$ = new BehaviorSubject<Nullable<IViewState>>(null)

  constructor() {}

  public setViewState(data: Nullable<IViewState>) {
    this.viewState$.next(data)
  }
  public getViewState(): Nullable<IViewState> {
    return this.viewState$.value
  }
  public listenViewState(): Observable<Nullable<IViewState>> {
    return this.viewState$.asObservable()
  }
}
