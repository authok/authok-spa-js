import 'core-js/es/string/starts-with';
import 'core-js/es/symbol';
import 'core-js/es/array/from';
import 'core-js/es/typed-array/slice';
import 'core-js/es/array/includes';
import 'core-js/es/string/includes';
import 'core-js/es/set';
import 'promise-polyfill/src/polyfill';
import 'fast-text-encoding';
import 'abortcontroller-polyfill/dist/abortcontroller-polyfill-only';

import AuthokClient from './AuthokClient';
import { AuthokClientOptions } from './global';

import './global';

export * from './global';

/**
 * Asynchronously creates the AuthokClient instance and calls `checkSession`.
 *
 * **Note:** There are caveats to using this in a private browser tab, which may not silently authenticae
 * a user on page refresh. Please see [the checkSession docs](https://authok.github.io/authok-spa-js/classes/authokclient.html#checksession) for more info.
 *
 * @param options The client options
 * @returns An instance of AuthokClient
 */
export default async function createAuthokClient(options: AuthokClientOptions) {
  const authok = new AuthokClient(options);
  await authok.checkSession();
  return authok;
}

export { AuthokClient };

export {
  GenericError,
  AuthenticationError,
  TimeoutError,
  PopupTimeoutError,
  PopupCancelledError,
  MfaRequiredError
} from './errors';

export { ICache, LocalStorageCache, InMemoryCache, Cacheable } from './cache';
