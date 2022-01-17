import { TokenEndpointOptions, TokenEndpointResponse } from './global';
import { DEFAULT_AUTHOK_CLIENT } from './constants';
import { getJSON } from './http';
import { createQueryParams } from './utils';

export async function oauthToken(
  {
    baseUrl,
    timeout,
    audience,
    scope,
    authokClient,
    useFormData,
    ...options
  }: TokenEndpointOptions,
  worker?: Worker
) {
  const body = useFormData
    ? createQueryParams(options)
    : JSON.stringify(options);

  return await getJSON<TokenEndpointResponse>(
    `${baseUrl}/oauth/token`,
    timeout,
    audience || 'default',
    scope,
    {
      method: 'POST',
      body,
      headers: {
        'Content-Type': useFormData
          ? 'application/x-www-form-urlencoded'
          : 'application/json',
        'Authok-Client': btoa(
          JSON.stringify(authokClient || DEFAULT_AUTHOK_CLIENT)
        )
      }
    },
    worker,
    useFormData
  );
}
