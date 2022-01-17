import { whenReady } from '../support/utils';

describe('initialisation', function () {
  beforeEach(cy.resetTests);
  afterEach(cy.fixCookies);

  it('should expose a factory method and constructor', function () {
    whenReady().then(win => {
      assert.isFunction(
        win.createAuthokClient,
        'The createAuthokClient function should be declared on the window.'
      );
      assert.isFunction(
        win.AuthokClient,
        'The AuthokClient constructor should be declared on the window.'
      );
    });
  });
});
