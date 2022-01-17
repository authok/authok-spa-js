import 'fast-text-encoding';
import * as esCookie from 'es-cookie';
import unfetch from 'unfetch';
import { verify } from '../../src/jwt';
import { MessageChannel } from 'worker_threads';
import * as utils from '../../src/utils';
import * as scope from '../../src/scope';

import {
  assertPostFn,
  assertUrlEquals,
  loginWithPopupFn,
  setupFn
} from './helpers';

// @ts-ignore

import {
  TEST_ACCESS_TOKEN,
  TEST_CLIENT_ID,
  TEST_CODE_CHALLENGE,
  TEST_CODE_VERIFIER,
  TEST_DOMAIN,
  TEST_ID_TOKEN,
  TEST_NONCE,
  TEST_ORG_ID,
  TEST_REDIRECT_URI,
  TEST_REFRESH_TOKEN,
  TEST_SCOPES,
  TEST_STATE
} from '../constants';

import {
  DEFAULT_AUTHOK_CLIENT,
  DEFAULT_POPUP_CONFIG_OPTIONS
} from '../../src/constants';

jest.mock('unfetch');
jest.mock('es-cookie');
jest.mock('../../src/jwt');
jest.mock('../../src/worker/token.worker');

const mockWindow = <any>global;
const mockFetch = (mockWindow.fetch = <jest.Mock>unfetch);
const mockVerify = <jest.Mock>verify;
const tokenVerifier = require('../../src/jwt').verify;

jest
  .spyOn(utils, 'bufferToBase64UrlEncoded')
  .mockReturnValue(TEST_CODE_CHALLENGE);

jest.spyOn(utils, 'runPopup');

const assertPost = assertPostFn(mockFetch);

const setup = setupFn(mockVerify);
const loginWithPopup = loginWithPopupFn(mockWindow, mockFetch);

describe('AuthokClient', () => {
  const oldWindowLocation = window.location;

  beforeEach(() => {
    // https://www.benmvp.com/blog/mocking-window-location-methods-jest-jsdom/
    delete window.location;
    window.location = Object.defineProperties(
      {},
      {
        ...Object.getOwnPropertyDescriptors(oldWindowLocation),
        assign: {
          configurable: true,
          value: jest.fn()
        }
      }
    ) as Location;
    // --

    mockWindow.open = jest.fn();
    mockWindow.addEventListener = jest.fn();

    mockWindow.crypto = {
      subtle: {
        digest: () => 'foo'
      },
      getRandomValues() {
        return '123';
      }
    };
    mockWindow.MessageChannel = MessageChannel;
    mockWindow.Worker = {};
    jest.spyOn(scope, 'getUniqueScopes');
    sessionStorage.clear();
  });

  afterEach(() => {
    mockFetch.mockReset();
    jest.clearAllMocks();
    window.location = oldWindowLocation;
  });

  describe('loginWithPopup', () => {
    it('should log the user in and get the user and claims', async () => {
      const authok = setup({ scope: 'foo' });

      mockWindow.open.mockReturnValue({ hello: 'world' });

      await loginWithPopup(authok);

      const expectedUser = { sub: 'me' };

      expect(await authok.getUser()).toEqual(expectedUser);
      expect(await authok.getUser({})).toEqual(expectedUser);
      expect(await authok.getUser({ audience: 'default' })).toEqual(
        expectedUser
      );
      expect(await authok.getUser({ scope: 'foo' })).toEqual(expectedUser);
      expect(await authok.getUser({ audience: 'invalid' })).toBeUndefined();
      expect(await authok.getIdTokenClaims()).toBeTruthy();
      expect(await authok.getIdTokenClaims({})).toBeTruthy();
      expect(
        await authok.getIdTokenClaims({ audience: 'default' })
      ).toBeTruthy();
      expect(await authok.getIdTokenClaims({ scope: 'foo' })).toBeTruthy();
      expect(
        await authok.getIdTokenClaims({ audience: 'invalid' })
      ).toBeUndefined();
    });

    it('should log the user in with custom scope', async () => {
      const authok = setup({
        scope: 'scope1',
        advancedOptions: {
          defaultScope: 'scope2'
        }
      });
      await loginWithPopup(authok, { scope: 'scope3' });

      const expectedUser = { sub: 'me' };

      expect(await authok.getUser({ scope: 'scope1 scope2 scope3' })).toEqual(
        expectedUser
      );
    });

    it('encodes state with random string', async () => {
      const authok = setup();

      await loginWithPopup(authok);

      // prettier-ignore
      const url = (utils.runPopup as jest.Mock).mock.calls[0][0].popup.location.href;

      assertUrlEquals(
        url,
        'authok_domain',
        '/authorize',
        {
          state: TEST_STATE,
          nonce: TEST_NONCE
        },
        false
      );
    });

    it('creates `code_challenge` by using `utils.sha256` with the result of `utils.createRandomString`', async () => {
      const authok = setup();

      await loginWithPopup(authok);

      // prettier-ignore
      const url = (utils.runPopup as jest.Mock).mock.calls[0][0].popup.location.href;

      assertUrlEquals(
        url,
        'authok_domain',
        '/authorize',
        {
          code_challenge: TEST_CODE_CHALLENGE,
          code_challenge_method: 'S256'
        },
        false
      );
    });

    it('should log the user in with a popup and redirect using a default redirect URI', async () => {
      const authok = setup({ leeway: 10, redirect_uri: null });

      await loginWithPopup(authok, {
        connection: 'test-connection',
        audience: 'test'
      });

      expect(mockWindow.open).toHaveBeenCalled();

      // prettier-ignore
      const url = (utils.runPopup as jest.Mock).mock.calls[0][0].popup.location.href;

      assertUrlEquals(url, 'authok_domain', '/authorize', {
        redirect_uri: 'http://localhost',
        client_id: TEST_CLIENT_ID,
        scope: TEST_SCOPES,
        response_type: 'code',
        response_mode: 'web_message',
        state: TEST_STATE,
        nonce: TEST_NONCE,
        code_challenge: TEST_CODE_CHALLENGE,
        code_challenge_method: 'S256',
        connection: 'test-connection',
        audience: 'test'
      });
    });

    it('should log the user in with a popup and redirect', async () => {
      const authok = setup({ leeway: 10 });

      await loginWithPopup(authok, {
        connection: 'test-connection',
        audience: 'test'
      });

      expect(mockWindow.open).toHaveBeenCalled();

      // prettier-ignore
      const url = (utils.runPopup as jest.Mock).mock.calls[0][0].popup.location.href;

      assertUrlEquals(url, TEST_DOMAIN, '/authorize', {
        redirect_uri: TEST_REDIRECT_URI,
        client_id: TEST_CLIENT_ID,
        scope: TEST_SCOPES,
        response_type: 'code',
        response_mode: 'web_message',
        state: TEST_STATE,
        nonce: TEST_NONCE,
        code_challenge: TEST_CODE_CHALLENGE,
        code_challenge_method: 'S256',
        connection: 'test-connection',
        audience: 'test'
      });
    });

    it('should log the user in with a popup and redirect when using refresh tokens', async () => {
      const authok = setup({
        useRefreshTokens: true
      });

      await loginWithPopup(authok);

      // prettier-ignore
      const url = (utils.runPopup as jest.Mock).mock.calls[0][0].popup.location.href;

      assertUrlEquals(
        url,
        TEST_DOMAIN,
        '/authorize',
        {
          scope: `${TEST_SCOPES} offline_access`
        },
        false
      );
    });

    it('should log the user and redirect when using different default redirect_uri', async () => {
      const redirect_uri = 'https://custom-redirect-uri/callback';
      const authok = setup({
        redirect_uri
      });
      await loginWithPopup(authok);

      // prettier-ignore
      const url = (utils.runPopup as jest.Mock).mock.calls[0][0].popup.location.href;

      assertUrlEquals(
        url,
        TEST_DOMAIN,
        '/authorize',
        {
          redirect_uri
        },
        false
      );
    });

    it('should log the user in with a popup and get the token', async () => {
      const authok = setup();

      await loginWithPopup(authok);
      expect(mockWindow.open).toHaveBeenCalled();

      assertPost(
        'https://authok_domain/oauth/token',
        {
          redirect_uri: TEST_REDIRECT_URI,
          client_id: TEST_CLIENT_ID,
          code_verifier: TEST_CODE_VERIFIER,
          grant_type: 'authorization_code',
          code: 'my_code'
        },
        {
          'Authok-Client': btoa(JSON.stringify(DEFAULT_AUTHOK_CLIENT)),
          'Content-Type': 'application/json'
        }
      );
    });

    it('should log the user in with a popup and get the token with form data', async () => {
      const authok = setup({
        useFormData: true
      });

      await loginWithPopup(authok);
      expect(mockWindow.open).toHaveBeenCalled();

      assertPost(
        'https://authok_domain/oauth/token',
        {
          redirect_uri: TEST_REDIRECT_URI,
          client_id: TEST_CLIENT_ID,
          code_verifier: TEST_CODE_VERIFIER,
          grant_type: 'authorization_code',
          code: 'my_code'
        },
        {
          'Authok-Client': btoa(JSON.stringify(DEFAULT_AUTHOK_CLIENT)),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        0,
        false
      );
    });

    it('uses default config', async () => {
      const authok = setup({ leeway: 10 });

      await loginWithPopup(authok);

      expect(utils.runPopup).toHaveBeenCalledWith({
        ...DEFAULT_POPUP_CONFIG_OPTIONS,
        popup: expect.anything()
      });
    });

    it('should be able to provide custom config', async () => {
      const authok = setup({ leeway: 10 });

      await loginWithPopup(authok, {}, { timeoutInSeconds: 3 });

      expect(utils.runPopup).toHaveBeenCalledWith({
        timeoutInSeconds: 3,
        popup: expect.anything()
      });
    });

    it('throws an error if not resolved before timeout', async () => {
      const authok = setup({ leeway: 10 });

      await expect(
        loginWithPopup(authok, {}, { timeoutInSeconds: 0.005 }, { delay: 10 })
      ).rejects.toThrowError('Timeout');
    });

    it('uses a custom popup specified in the configuration and redirect', async () => {
      const authok = setup();
      const popup = {
        location: { href: '' },
        close: jest.fn()
      };

      await loginWithPopup(
        authok,
        { connection: 'test-connection', audience: 'test' },
        { popup }
      );

      expect(mockWindow.open).not.toHaveBeenCalled();
      assertUrlEquals(popup.location.href, TEST_DOMAIN, '/authorize', {
        redirect_uri: TEST_REDIRECT_URI,
        client_id: TEST_CLIENT_ID,
        scope: TEST_SCOPES,
        response_type: 'code',
        response_mode: 'web_message',
        state: TEST_STATE,
        nonce: TEST_NONCE,
        code_challenge: TEST_CODE_CHALLENGE,
        code_challenge_method: 'S256',
        connection: 'test-connection',
        audience: 'test'
      });
    });

    it('uses a custom popup specified in the configuration and get a token', async () => {
      const authok = setup();
      const popup = {
        location: { href: '' },
        close: jest.fn()
      };

      await loginWithPopup(authok, {}, { popup });

      expect(mockWindow.open).not.toHaveBeenCalled();
      assertPost(
        'https://authok_domain/oauth/token',
        {
          redirect_uri: TEST_REDIRECT_URI,
          client_id: TEST_CLIENT_ID,
          code_verifier: TEST_CODE_VERIFIER,
          grant_type: 'authorization_code',
          code: 'my_code'
        },
        {
          'Authok-Client': btoa(JSON.stringify(DEFAULT_AUTHOK_CLIENT))
        }
      );
    });

    it('opens popup with custom authokClient', async () => {
      const authokClient = { name: '__test_client_name__', version: '9.9.9' };
      const authok = await setup({ authokClient });

      await loginWithPopup(authok);

      expect(mockWindow.open).toHaveBeenCalled();

      // prettier-ignore
      const url = (utils.runPopup as jest.Mock).mock.calls[0][0].popup.location.href;

      assertUrlEquals(
        url,
        TEST_DOMAIN,
        '/authorize',
        {
          authokClient: btoa(JSON.stringify(authokClient))
        },
        false
      );
    });

    it('throws error if state from popup response is different from the provided state', async () => {
      const authok = setup();

      await expect(
        loginWithPopup(authok, undefined, undefined, {
          authorize: {
            response: {
              state: 'other-state'
            }
          }
        })
      ).rejects.toThrowError('Invalid state');
    });

    it('calls `tokenVerifier.verify` with the `issuer` from in the oauth/token response', async () => {
      const authok = setup({
        issuer: 'test-123.authok.cn'
      });

      await loginWithPopup(authok);
      expect(tokenVerifier).toHaveBeenCalledWith(
        expect.objectContaining({
          iss: 'https://test-123.authok.cn/'
        })
      );
    });

    it('calls `tokenVerifier.verify` with the `leeway` from constructor', async () => {
      const authok = setup({ leeway: 10 });

      await loginWithPopup(authok);

      expect(tokenVerifier).toHaveBeenCalledWith(
        expect.objectContaining({
          leeway: 10
        })
      );
    });

    it('calls `tokenVerifier.verify` with undefined `max_age` when value set in constructor is an empty string', async () => {
      const authok = setup({ max_age: '' });

      await loginWithPopup(authok);

      expect(tokenVerifier).toHaveBeenCalledWith(
        expect.objectContaining({
          max_age: undefined
        })
      );
    });

    it('calls `tokenVerifier.verify` with the parsed `max_age` string from constructor', async () => {
      const authok = setup({ max_age: '10' });

      await loginWithPopup(authok);

      expect(tokenVerifier).toHaveBeenCalledWith(
        expect.objectContaining({
          max_age: 10
        })
      );
    });

    it('calls `tokenVerifier.verify` with the parsed `max_age` number from constructor', async () => {
      const authok = setup({ max_age: 10 });

      await loginWithPopup(authok);

      expect(tokenVerifier).toHaveBeenCalledWith(
        expect.objectContaining({
          max_age: 10
        })
      );
    });

    it('calls `tokenVerifier.verify` with the organization id', async () => {
      const authok = setup({ organization: 'test_org_123' });

      await loginWithPopup(authok);

      expect(tokenVerifier).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'test_org_123'
        })
      );
    });

    it('calls `tokenVerifier.verify` with the organization id given in the login method', async () => {
      const authok = setup();
      await loginWithPopup(authok, { organization: 'test_org_123' });

      expect(tokenVerifier).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'test_org_123'
        })
      );
    });

    it('saves into cache', async () => {
      const authok = setup();

      jest.spyOn(authok['cacheManager'], 'set');

      await loginWithPopup(authok);

      expect(authok['cacheManager']['set']).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: TEST_CLIENT_ID,
          access_token: TEST_ACCESS_TOKEN,
          expires_in: 86400,
          audience: 'default',
          id_token: TEST_ID_TOKEN,
          scope: TEST_SCOPES
        })
      );
    });

    it('saves decoded token into cache', async () => {
      const authok = setup();

      const mockDecodedToken = {
        claims: { sub: 'sub', aud: 'aus' },
        user: { sub: 'sub' }
      };
      tokenVerifier.mockReturnValue(mockDecodedToken);

      jest.spyOn(authok['cacheManager'], 'set');

      await loginWithPopup(authok);

      expect(authok['cacheManager']['set']).toHaveBeenCalledWith(
        expect.objectContaining({
          decodedToken: mockDecodedToken
        })
      );
    });

    it('should not save refresh_token in memory cache', async () => {
      const authok = setup({
        useRefreshTokens: true
      });

      jest.spyOn(authok['cacheManager'], 'set');
      await loginWithPopup(authok);

      expect(authok['cacheManager']['set']).toHaveBeenCalled();

      expect(authok['cacheManager']['set']).not.toHaveBeenCalledWith(
        expect.objectContaining({
          refresh_token: TEST_REFRESH_TOKEN
        })
      );
    });

    it('should save refresh_token in local storage cache', async () => {
      const authok = setup({
        useRefreshTokens: true,
        cacheLocation: 'localstorage'
      });

      jest.spyOn(authok['cacheManager'], 'set');

      await loginWithPopup(authok);

      expect(authok['cacheManager']['set']).toHaveBeenCalledWith(
        expect.objectContaining({
          refresh_token: TEST_REFRESH_TOKEN
        })
      );
    });

    it('saves `authok.is.authenticated` key in storage', async () => {
      const authok = setup();

      await loginWithPopup(authok);

      expect(<jest.Mock>esCookie.set).toHaveBeenCalledWith(
        `_legacy_authok.${TEST_CLIENT_ID}.is.authenticated`,
        'true',
        {
          expires: 1
        }
      );

      expect(<jest.Mock>esCookie.set).toHaveBeenCalledWith(
        `authok.${TEST_CLIENT_ID}.is.authenticated`,
        'true',
        {
          expires: 1
        }
      );
    });

    it('saves organization hint cookie in storage', async () => {
      const authok = setup({}, { org_id: TEST_ORG_ID });

      await loginWithPopup(authok);

      expect(<jest.Mock>esCookie.set).toHaveBeenCalledWith(
        `_legacy_authok.${TEST_CLIENT_ID}.organization_hint`,
        JSON.stringify(TEST_ORG_ID),
        {
          expires: 1
        }
      );

      expect(<jest.Mock>esCookie.set).toHaveBeenCalledWith(
        `authok.${TEST_CLIENT_ID}.organization_hint`,
        JSON.stringify(TEST_ORG_ID),
        {
          expires: 1
        }
      );
    });

    it('removes the organization hint cookie if no org_id claim was returned in the ID token', async () => {
      const authok = setup();

      await loginWithPopup(authok);

      expect(<jest.Mock>esCookie.remove).toHaveBeenCalledWith(
        `_legacy_authok.${TEST_CLIENT_ID}.organization_hint`
      );

      expect(<jest.Mock>esCookie.remove).toHaveBeenCalledWith(
        `authok.${TEST_CLIENT_ID}.organization_hint`
      );
    });

    it('saves `authok.is.authenticated` key in storage for an extended period', async () => {
      const authok = setup({
        sessionCheckExpiryDays: 2
      });

      await loginWithPopup(authok);

      expect(<jest.Mock>esCookie.set).toHaveBeenCalledWith(
        `_legacy_authok.${TEST_CLIENT_ID}.is.authenticated`,
        'true',
        {
          expires: 2
        }
      );
      expect(<jest.Mock>esCookie.set).toHaveBeenCalledWith(
        `authok.${TEST_CLIENT_ID}.is.authenticated`,
        'true',
        {
          expires: 2
        }
      );
    });

    it('should throw an error on token failure', async () => {
      const authok = setup();

      await expect(
        loginWithPopup(authok, {}, {}, { token: { success: false } })
      ).rejects.toThrowError(
        'HTTP error. Unable to fetch https://authok_domain/oauth/token'
      );
    });
  });
});
