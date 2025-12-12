import { Inject, Injectable } from "@angular/core";
import { BehaviorSubject, Subject } from "rxjs";

@Injectable()
export class CoreService {
    
    private _routerPath = '/'
    
    private _isRouterPathSet$ = new BehaviorSubject<boolean>(false)
    
    private _authConfig$ = new BehaviorSubject<any>('')

    public listenRouterPathSet$ = this._isRouterPathSet$.asObservable()
    public isRouterPathSet(): boolean {
        return this._isRouterPathSet$.getValue()
    }

    public async setRouterPath(data: string): Promise<void> {
        // console.log('Router path changed: ' + data)
        this._routerPath = data
        this._isRouterPathSet$.next(true)
        return Promise.resolve()
    }

    public getRouterPath() {
        return this._routerPath;
    }

    public isDev(): boolean {
        return this.getBaseUrl().includes('http://localhost')
    }

    public isInsideHost(): boolean {
        return this._routerPath !== '/'
    }

    public getBaseUrl(): string {
        return __webpack_public_path__;
    }

    public async setAuthConfig(data: any): Promise<void> {
        this._authConfig$.next(data)
        return Promise.resolve()
    }

    public getAuthConfig(): any {
        return this._authConfig$.getValue()
    }

}