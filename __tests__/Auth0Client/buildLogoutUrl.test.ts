import 'fast-text-encoding';
import unfetch from 'unfetch';
import { verify } from '../../src/jwt';
import { MessageChannel } from 'worker_threads';
import * as utils from '../../src/utils';
import * as scope from '../../src/scope';

// @ts-ignore

import { assertUrlEquals, setupFn } from './helpers';

import { TEST_CLIENT_ID, TEST_CODE_CHALLENGE, TEST_DOMAIN } from '../constants';

jest.mock('unfetch');
jest.mock('es-cookie');
jest.mock('../../src/jwt');
jest.mock('../../src/worker/token.worker');

const mockWindow = <any>global;
const mockFetch = (mockWindow.fetch = <jest.Mock>unfetch);
const mockVerify = <jest.Mock>verify;

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
