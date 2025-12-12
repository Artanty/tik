import { Injectable } from '@angular/core';

import { BehaviorSubject, Observable } from 'rxjs';
import { IAuthDto } from '../auth.component';
import { Nullable } from './user-action.service';

const defaultConfig: IAuthDto = {
  productName: "AU",
  authStrategy: "backend",
  tokenShareStrategy: 'saveTempDuplicate',
  payload: {
    checkBackendUrl: `${process.env['AU_BACK_URL']}/getUpdates`,
    signUpByDataUrl: `${process.env['AU_BACK_URL']}/auth-token/signup`,
    signInByDataUrl: `${process.env['AU_BACK_URL']}/auth-token/login`,
    signInByTokenUrl: "",
  },
  from: "AU",
  status: "init",
}

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private config$ = new BehaviorSubject<Nullable<IAuthDto>>(defaultConfig);

  constructor() {}

  public setConfig(data: Nullable<IAuthDto>) {
    this.config$.next(data);
  }
  public getConfig(): Nullable<IAuthDto> {
    return this.config$.value;
  }
  public getConfigAuthStrategy(): string {
    return this.config$.value?.authStrategy || '';
  }
  public getTokenShareStrategy(): string {
    return this.config$.value?.tokenShareStrategy || '';
  }
  public listenConfig(): Observable<Nullable<IAuthDto>> {
    return this.config$.asObservable();
  }
}
