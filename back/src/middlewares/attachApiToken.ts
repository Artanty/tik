import axios from 'axios';
import { dd } from '../utils/dd';

export async function attachApiToken(
  targetProject: string,
  targetUrl: string,
  requesterUrl: string
): Promise<{
  token: string
  expiresAt: string
}> {
  dd('attachToken START for: ' + targetProject)

  // Validate required parameters
  const missingParams: string[] = [];
  if (!targetProject) missingParams.push('targetProject');
  if (!targetUrl) missingParams.push('targetUrl');
  if (!requesterUrl) missingParams.push('requesterUrl');
  
  if (missingParams.length > 0) {
    throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
  }

  // Validate environment variables
  const missingEnvVars: string[] = [];
  if (!process.env.KEY_BACK_URL) missingEnvVars.push('KEY_BACK_URL');
  if (!process.env.PROJECT_ID) missingEnvVars.push('PROJECT_ID');
  if (!process.env.BASE_KEY) missingEnvVars.push('BASE_KEY');
  
  if (missingEnvVars.length > 0) {
    throw new Error(`Missing environment variables: ${missingEnvVars.join(', ')}`);
  }

  const KEY_BACK_URL = process.env.KEY_BACK_URL;
  // dd(`X-Project-Id ${process.env.PROJECT_ID} 
  //   X-Project-Domain-Name ${requesterUrl} 
  //   X-Api-Key ${process.env.BASE_KEY}`
  // )
  try {
    const response = await axios.post(`${KEY_BACK_URL}/get-token`, {
      targetProject,
      targetUrl
    }, {
      headers: {
        'X-Project-Id': process.env.PROJECT_ID, // e.g. 'au@back'
        'X-Project-Domain-Name': requesterUrl,
        'X-Api-Key': process.env.BASE_KEY
      }
    });
    dd('attachToken END')
    return {
      token: response.data.apiKey,
      expiresAt: response.data.expiresAt
    };
  } catch (error: any) {
    console.error('Token acquisition failed:', error.message);
    throw new Error('Failed to acquire API token: ' + error.message);
  }
}