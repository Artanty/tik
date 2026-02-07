import axios from 'axios';
import dotenv from 'dotenv';
import { attachApiToken } from '../middlewares/attachApiToken';
import { dd } from '../utils/dd';
import { poolManager } from '../pool-manager';
import { backendOrigin } from '../core/backend-origin.service';
import { PoolConfigItemBody } from './poolConfigService';
import { eventProgress, EVENT_TIK_ACTION_PROP } from '../core/constants';
dotenv.config();

export interface EventStateResItem {
  id: string
  cur: number
  len: number
  // prc: number
  stt: number
  //
  tikAction?: string
}

type RequestKey = string; // Format: 'service__entity_id' e.g., 'doro__e_286'

// todo: pass endpoint 
export class OuterEventsStateController {
  private static _pendingOuterRequests = new Set<RequestKey>();

  static async getEventsState(req: any) {
    // todo separate util\middleware pass auth header
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      dd('Missing/invalid Authorization header');
      throw new Error('Missing/invalid Authorization header')
    }
    // todo separate util\middleware pass X-Requester-URL
    const xWebHostUrlHeader = req.headers['x-web-host-url'];
    if (!xWebHostUrlHeader) {
      dd('Missing x-web-host-url header');
      throw new Error('Missing x-web-host-url header')
    }

    const thisBackOrigin = `${req.protocol}://${req.get('host')}` 
    const backendUrlForRequest = req.body.backendUrl;
    const payload = {};

    const backendServiceToken = await attachApiToken(
      req.body.projectId, // target project, f.e.: note@back
      backendUrlForRequest, // target URL
      thisBackOrigin // requester url (this back url)
    )
    // dd(backendServiceToken)
    let outerServiceResponse: { data: { data: EventStateResItem[] } } = { data: { data: [] } };
    try {
      outerServiceResponse = await axios.post(
        `${backendUrlForRequest}/service/share-event-state`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': backendServiceToken.token, // v2 todo change everywhere!
            'X-Requester-Project': process.env.PROJECT_ID,
            'X-Web-Host-URL': xWebHostUrlHeader, // for validateUserAccessToken
            'X-Requester-Url': thisBackOrigin,
            'Authorization': authHeader,  // for validateUserAccessToken
          },
          timeout: 5000
        }
      );
      dd(outerServiceResponse.data.data)
      const itemKeyPrefix = req.body.projectId.split('@')[0];

      poolManager.updateConfigItem(req.body.poolId, itemKeyPrefix, outerServiceResponse.data.data);

      return {
        data: {
          success: true,
          receiverResponse: outerServiceResponse.data.data,
          // tokenMetadata: {
          //   // id: tokenId,
          //   // expiresIn: '1h'
          // }
        },
        debug: {
          outerServiceResponse: outerServiceResponse.data.data,
          backendServiceTokenResult: {
            request: {
              targetProjectId: req.body.projectId,
              backendUrlForRequest,
              thisBackOrigin,
            },
            response: backendServiceToken,
          },
        }
      };
    } catch (error: any) {
      dd(error.message)
      return {
        data: {
          success: false,
        },
        debug: {
          outerServiceResult: {
            request: {
              'query': `${backendUrlForRequest}/service/share-event-state`, 
              'X-Api-Key': backendServiceToken.token, // v2 todo change everywhere!
              'X-Requester-Project': process.env.PROJECT_ID,
              'X-Web-Host-URL': xWebHostUrlHeader,
              'X-Requester-Url': thisBackOrigin,
              'Authorization': authHeader,
            },
            response: {
              outerServiceResponse
            },
          },
          backendServiceToken,
        },
        error: error.message
        // tokenMetadata: {
        //   // id: tokenId,
        //   // expiresIn: '1h'
        // }
      };
    }
  }

  static async updateEventsState(req: any) {
    // // todo separate util\middleware pass auth header
    // const authHeader = req.headers['authorization'];
    // if (!authHeader?.startsWith('Bearer ')) {
    //   dd('Missing/invalid Authorization header');
    //   throw new Error('Missing/invalid Authorization header')
    // }
    // // todo separate util\middleware pass X-Requester-URL
    // const xWebHostUrlHeader = req.headers['x-web-host-url'];
    // if (!xWebHostUrlHeader) {
    //   dd('Missing x-web-host-url header');
    //   throw new Error('Missing x-web-host-url header')
    // }

    // const thisBackOrigin = `${req.protocol}://${req.get('host')}` 
    // const backendUrlForRequest = req.body.backendUrl;
    // const payload = {};

    // const backendServiceToken = await attachApiToken(
    //   req.body.projectId, // target project, f.e.: note@back
    //   backendUrlForRequest, // target URL
    //   thisBackOrigin // requester url (this back url)
    // )


    // const response: { data: EventStateResItem[] } = await axios.post(
    //   `${backendUrlForRequest}/service/share-event-state`,
    //   payload,
    //   {
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'X-Api-Key': backendServiceToken.token, // v2 todo change everywhere!
    //       'X-Requester-Project': process.env.PROJECT_ID,
    //       'X-Web-Host-URL': xWebHostUrlHeader,
    //       'X-Requester-Url': thisBackOrigin,
    //       'Authorization': authHeader,
    //     },
    //     timeout: 5000
    //   }
    // );

    const itemKeyPrefix = req.body.projectId.split('@')[0];
    // if (req.body.action === 'update') {
    //   poolManager.updateConfigItem(req.body.poolId, itemKeyPrefix, req.body.data);  
    // } else if (req.body.action === 'delete') {
    //   poolManager.deleteConfigItem(req.body.poolId, itemKeyPrefix, req.body.data);  
    // } else {
    //   return {
    //     success: false,
    //     descr: 'no action provided'
    //   };
    // }
    
    try {
      const stat = poolManager.updateConfigItem(req.body.poolId, itemKeyPrefix, req.body.data);  

      return {
        success: true,
        desc: 'poolManager.updateConfigItem successful',
        stat: stat,
        // receiverResponse: response.data,
        // tokenMetadata: {
        //   // id: tokenId,
        //   // expiresIn: '1h'
        // }
      };
    } catch (e) {
      
    }
  }

  /**
   * todo: on register remote -pass map of entity-rest 
   * */
  public static async finishEntry(entryId: string, entryConfig: PoolConfigItemBody) {
    if (this._pendingOuterRequests.has(entryId)) {
      console.log(`Request for ${entryId} is already in progress`);
      return null;
    }
    this._pendingOuterRequests.add(entryId);
    try {
      const { project, entityType, id } = this.parseEntryId(entryId);
      if (entityType === 'e') {
        OuterEventsStateController.completeEvent(entryId, id, entryConfig);    
      } else {
        throw new Error(`complete entityType=${entityType} - not implemented`)
      }
    } catch (error: any) {
      dd(error.message);
    }
  }

  public static async completeEvent(entryId: string, eventId: string, poolEntry: PoolConfigItemBody) {
    // convert:
    // "doro__e_329": {
    //     "cur": 0,
    //     "len": 10,
    //     "stt": 3
    // },
    // to:
    // {
    //   cur: 44
    //   id: "e_314"
    //   len: 600
    //   stt: 2
    //   tikAction: "update"
    // }
    const poolId = 'current_user_id';
    // 1. get from outerState id from config entry id
    // doro__e_329 -> e_329
    const outerItemId = entryId.split('__')[1]
    const itemKeyPrefix = entryId.split('__')[0]
    const outerEntry: EventStateResItem = {
      id: outerItemId,
      cur: poolEntry.cur,
      len: poolEntry.len,
      stt: eventProgress.COMPLETED,
      [EVENT_TIK_ACTION_PROP]: 'update'
    }
    const stat = poolManager.updateConfigItem(poolId, itemKeyPrefix, [outerEntry]);
    const state = eventProgress.COMPLETED; // todo get somewhere or pass
    await this.shareEventState(entryId, eventId, state)
  }

  /**
   * сначала заканчиваем это событие здесь.
   * это делается в любом случае, чтобы упростить флоу.
   * затем отправляем запрос в соответствующий бэк.
   * */
  // todo: pass endpoint 

  static async shareEventState(entryId: string, eventId: string, state: number) {
    dd('shareEventState')
    // const thisBackOrigin = `${req.protocol}://${req.get('host')}` //
    const thisBackOrigin = backendOrigin.get();
    // const backendUrlForRequest = req.body.backendUrl;
    const backendUrlForRequest = 'http://localhost:3201'; // todo pass it
    const payload = { eventId, state };
    const targetProjectId = 'doro@back';
    const backendServiceToken = await attachApiToken(
      // req.body.projectId, // target project, f.e.: note@back - pass from entry
      targetProjectId,
      backendUrlForRequest, // target URL
      thisBackOrigin // requester url (this back url)
    )
    let outerServiceResponse;

    const debug = {
      outerServiceResult: {
        request: {
          url: `${backendUrlForRequest}/service/receive-event-state`,
          payload: JSON.stringify(payload),
        },
        // response: outerServiceResponse.data.data,
      },
      backendServiceTokenResult: {
        request: {
          targetProjectId,
          backendUrlForRequest,
          thisBackOrigin,
        },
        response: backendServiceToken,
      },
    }
    dd(debug)

    try {
      
      outerServiceResponse = await axios.post(
        `${backendUrlForRequest}/service/receive-event-state`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': backendServiceToken.token, // v2 todo change everywhere!
            'X-Requester-Project': process.env.PROJECT_ID,
            'X-Requester-Url': thisBackOrigin,
          },
          timeout: 5000
        }
      );
      // dd(response)
      const debug2 = {
        outerServiceResult: {
          // request: {
          //   url: `${backendUrlForRequest}/service/receive-event-state`,
          //   payload,
          // },
          response: outerServiceResponse.data,
        },
        // backendServiceTokenResult: {
        //   request: {
        //     targetProjectId,
        //     backendUrlForRequest,
        //     thisBackOrigin,
        //   },
        //   response: backendServiceToken,
        // },
      }
      dd(debug2)
    } catch (error: any) {
      dd(error.message);
    } finally {
      // Remove from pending
      if (this._pendingOuterRequests.has(entryId)) {
        this._pendingOuterRequests.delete(entryId)
      }
    } 
  }

  static parseEntryId(key: string): {
    project: string;
    entityType: string;
    id: string;
  } {
    // Format: service__entityType_id
    const parts = key.split('__');
    
    if (parts.length !== 2) {
      throw new Error(`Invalid key format: ${key}. Expected: service__entityType_id`);
      
    }
    
    const [project, rest] = parts;
    const entityParts = rest.split('_');
    
    if (entityParts.length < 2) {
      throw new Error(`Invalid entity format in key: ${key}. Expected: entityType_id`);
      
    }
    
    const entityType = entityParts[0];
    const id = entityParts.slice(1).join('_'); // In case ID contains underscores
    
    return { project, entityType, id };
  }
}



