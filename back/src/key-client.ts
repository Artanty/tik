import { dd } from './lib';

/**
 * Exchange this service's BASE_KEY at key@back for a scoped token bound to the
 * requester->target pair (target validates it via key@back /validate).
 * The requester URL must equal the URL this service is registered under.
 */
export async function attachApiToken(
  targetProject: string,
  targetUrl: string,
  requesterUrl: string,
): Promise<{ token: string; expiresAt: string }> {
  const missingParams: string[] = [];
  if (!targetProject) missingParams.push('targetProject');
  if (!targetUrl) missingParams.push('targetUrl');
  if (!requesterUrl) missingParams.push('requesterUrl');
  if (missingParams.length) throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);

  const missingEnvVars: string[] = [];
  if (!process.env.KEY_BACK_URL) missingEnvVars.push('KEY_BACK_URL');
  if (!process.env.PROJECT_ID) missingEnvVars.push('PROJECT_ID');
  if (!process.env.BASE_KEY) missingEnvVars.push('BASE_KEY');
  if (missingEnvVars.length) throw new Error(`Missing environment variables: ${missingEnvVars.join(', ')}`);

  dd('attachToken START for: ' + targetProject);
  try {
    const response = await fetch(`${process.env.KEY_BACK_URL}/get-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Project-Id': process.env.PROJECT_ID ?? '', // e.g. 'tik@back'
        'X-Project-Domain-Name': requesterUrl,
        'X-Api-Key': process.env.BASE_KEY ?? '',
      },
      body: JSON.stringify({ targetProject, targetUrl }),
    });
    if (!response.ok) {
      throw new Error(`key@back responded ${response.status}`);
    }
    const data = (await response.json()) as { apiKey: string; expiresAt: string };
    dd('attachToken END');
    return { token: data.apiKey, expiresAt: data.expiresAt };
  } catch (error: any) {
    console.error('Token acquisition failed:', error.message);
    throw new Error('Failed to acquire API token: ' + error.message);
  }
}
