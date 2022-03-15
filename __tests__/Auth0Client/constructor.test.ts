import 'fast-text-encoding';
import unfetch from 'unfetch';
import { verify } from '../../src/jwt';
import { MessageChannel } from 'worker_threads';
import * as utils from '../../src/utils';
import * as scope from '../../src/scope';

// @ts-ignore

import { assertUrlEquals, loginWithRedirectFn, setupFn } from './helpers';

import { TEST_CLIENT_ID, TEST_CODE_CHALLENGE, TEST_DOMAIN } from '../constants';
import { ICache } from '../../src/cache';

jest.mock('unfetch');
jest.mock('es-cookie');
jest.mock('../../src/jwt');
jest.mock('../../src/worker/token.worker');

const mockWindow = <any>global;
const mockFetch = (mockWindow.fetch = <jest.Mock>unfetch);
const mockVerify = <jest.Mock>verify;

const mockCache: ICache = {
  set: jest.fn().mockResolvedValue(null),
  get: jest.fn().mockResolvedValue(null),
  remove: jest.fn().mockResolvedValue(null)
};

jest
  .spyOn(utils, 'bufferToBase64UrlEncoded')
  .mockReturnValue(TEST_CODE_CHALLENGE);

jest.spyOn(utils, 'runPopup');

const setup = setupFn(mockVerify);

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

  describe('constructor', () => {
    it('automatically adds the offline_access scope during construction', () => {
      const authok = setup({
        useRefreshTokens: true,
        scope: 'test-scope'
      });

      expect((<any>authok).scope).toBe('test-scope offline_access');
    });

    it('ensures the openid scope is defined when customizing default scopes', () => {
      const authok = setup({
        advancedOptions: {
          defaultScope: 'test-scope'
        }
      });

      expect((<any>authok).defaultScope).toBe('openid test-scope');
    });

    it('allows an empty custom default scope', () => {
      const authok = setup({
        advancedOptions: {
          defaultScope: null
        }
      });

      expect((<any>authok).defaultScope).toBe('openid');
    });

    it('should create issuer from domain', () => {
      const authok = setup({
        domain: 'test.dev'
      });

      expect((<any>authok).tokenIssuer).toEqual('https://test.dev/');
    });

    it('should allow issuer as a domain', () => {
      const authok = setup({
        issuer: 'foo.bar.com'
      });

      expect((<any>authok).tokenIssuer).toEqual('https://foo.bar.com/');
    });

    it('should allow issuer as a fully qualified url', () => {
      const authok = setup({
        issuer: 'https://some.issuer.com/'
      });

      expect((<any>authok).tokenIssuer).toEqual('https://some.issuer.com/');
    });

    it('should allow specifying domain with http scheme', () => {
      const authok = setup({
        domain: 'http://localhost'
      });

      expect((<any>authok).domainUrl).toEqual('http://localhost');
    });

    it('should allow specifying domain with https scheme', () => {
      const authok = setup({
        domain: 'https://localhost'
      });

      expect((<any>authok).domainUrl).toEqual('https://localhost');
    });

    it('uses a custom cache if one was given in the configuration', async () => {
      const authok = setup({
        cache: mockCache
      });

      await loginWithRedirectFn(mockWindow, mockFetch)(authok);

      expect(mockCache.set).toHaveBeenCalled();
    });

    it('uses a custom cache if both `cache` and `cacheLocation` were specified', async () => {
      const authok = setup({
        cache: mockCache,
        cacheLocation: 'localstorage'
      });

      await loginWithRedirectFn(mockWindow, mockFetch)(authok);

      expect(mockCache.set).toHaveBeenCalled();
    });
  });

  describe('buildLogoutUrl', () => {
    it('creates correct query params with empty options', async () => {
      const authok = setup();

      const url = authok.buildLogoutUrl();

      assertUrlEquals(url, TEST_DOMAIN, '/v1/logout', {
        client_id: TEST_CLIENT_ID
      });
    });

    it('creates correct query params with `options.client_id` is null', async () => {
      const authok = setup();

      const url = new URL(authok.buildLogoutUrl({ client_id: null }));
      expect(url.searchParams.get('client_id')).toBeNull();
    });

    it('creates correct query params with `options.client_id` defined', async () => {
      const authok = setup();

      const url = authok.buildLogoutUrl({ client_id: 'another-client-id' });

      assertUrlEquals(url, TEST_DOMAIN, '/v1/logout', {
        client_id: 'another-client-id'
      });
    });

    it('creates correct query params with `options.return_to` defined', async () => {
      const authok = setup();

      const url = authok.buildLogoutUrl({
        return_to: 'https://return.to',
        client_id: null
      });

      assertUrlEquals(url, TEST_DOMAIN, '/v1/logout', {
        return_to: 'https://return.to'
      });
    });

    it('creates correct query params when `options.federated` is true', async () => {
      const authok = setup();

      const url = authok.buildLogoutUrl({ federated: true, client_id: null });

      assertUrlEquals(url, TEST_DOMAIN, '/v1/logout', {
        federated: ''
      });
    });
  });
});
