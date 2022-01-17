/**
 * @jest-environment node
 */
import AuthokClient from '../src/AuthokClient';

describe('In a Node SSR environment', () => {
  it('can be constructed', () => {
    expect(
      () => new AuthokClient({ client_id: 'foo', domain: 'bar' })
    ).not.toThrow();
  });

  it('can check authenticated state', async () => {
    const client = new AuthokClient({ client_id: 'foo', domain: 'bar' });
    expect(await client.isAuthenticated()).toBeFalsy();
    expect(await client.getUser()).toBeUndefined();
  });
});
