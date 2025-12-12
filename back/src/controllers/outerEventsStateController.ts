import axios from 'axios';
import dotenv from 'dotenv';
import { attachApiToken } from '../middlewares/attachApiToken';
import { dd } from '../utils/dd';
import { poolManager } from '../pool-manager';
dotenv.config();

export interface EventStateResItem {
  id: string
  cur: number
  len: number
  prc: number
  stt: number
  //
  tikAction?: string
}

// todo: pass endpoint 
export class OuterEventsStateController {
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


    const response: { data: EventStateResItem[] } = await axios.post(
      `${backendUrlForRequest}/service/share-event-state`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': backendServiceToken.token, // v2 todo change everywhere!
          'X-Requester-Project': process.env.PROJECT_ID,
          'X-Web-Host-URL': xWebHostUrlHeader,
          'X-Requester-Url': thisBackOrigin,
          'Authorization': authHeader,
        },
        timeout: 5000
      }
    );

    const itemKeySuffix = req.body.projectId.split('@')[0];

    poolManager.updateConfigItem(req.body.poolId, itemKeySuffix, response.data);

    return {
      success: true,
      receiverResponse: response.data,
      // tokenMetadata: {
      //   // id: tokenId,
      //   // expiresIn: '1h'
      // }
    };
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
    
    poolManager.updateConfigItem(req.body.poolId, itemKeyPrefix, req.body.data);  

    return {
      success: true,
      descr: 'poolManager.updateConfigItem successful',
      // receiverResponse: response.data,
      // tokenMetadata: {
      //   // id: tokenId,
      //   // expiresIn: '1h'
      // }
    };
  }
}



