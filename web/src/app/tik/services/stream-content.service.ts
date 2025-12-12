import { Injectable } from "@angular/core";
import { obs$ } from "../utilites/observable-variable";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export type StreamPayload = Record<string, any>

@Injectable({
	providedIn: 'root'
})
export class StreamContentService {
	constructor(
		private http: HttpClient,
	) {}
	public stream = obs$<StreamPayload>({})

	public streamPayload = {} as StreamPayload
 
	// ngOnInit (): void {
	//   this.setRemotePayload('doro')
	// }

	public setRemotePayload(remoteId: string, data: any = null): void {
		if (!this.streamPayload[remoteId]) {
			this.streamPayload = { 
				...this.streamPayload, 
				...this._getRemoteBody(remoteId, data) 
			};
		};
	}

	private _getRemoteBody(remoteId: string, data: any = null) {
		return {
			[remoteId]: data
		}
	}

	public updateSsePayloadApi(payload: any): Observable<any> {
		const pool = 'current_user_id';
		payload = { config: payload }
		return this.http.post(`${process.env['TIK_BACK_URL']}/pool/${pool}/config`, payload)
	}


}