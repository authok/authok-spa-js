# @authok/authok-spa-js

Authok SDK for Single Page Applications using [Authorization Code Grant Flow with PKCE](https://authok.cn/docs/api-auth/tutorials/authorization-code-grant-pkce).

[![CircleCI](https://circleci.com/gh/authok/authok-spa-js.svg?style=svg)](https://circleci.com/gh/authok/authok-spa-js)
![Release](https://img.shields.io/github/v/release/authok/authok-spa-js)
[![Codecov](https://img.shields.io/codecov/c/github/authok/authok-spa-js)](https://codecov.io/gh/authok/authok-spa-js)
![Downloads](https://img.shields.io/npm/dw/@authok/authok-spa-js)
[![License](https://img.shields.io/:license-mit-blue.svg?style=flat)](https://opensource.org/licenses/MIT)

## Table of Contents

- [@authok/authok-spa-js](#authokauthok-spa-js)
  - [Table of Contents](#table-of-contents)
  - [文档](#文档)
  - [安装](#安装)
  - [开始](#开始)
    - [Authok 配置](#authok-配置)
    - [Creating the client](#creating-the-client)
    - [1 - Login](#1---login)
    - [2 - Calling an API](#2---calling-an-api)
    - [3 - Logout](#3---logout)
    - [Data caching options](#data-caching-options)
      - [Creating a custom cache](#creating-a-custom-cache)
    - [Refresh Tokens](#refresh-tokens)
      - [Refresh Token fallback](#refresh-token-fallback)
    - [组织](#组织)
      - [Log in to an organization](#log-in-to-an-organization)
      - [Accept user invitations](#accept-user-invitations)
    - [Advanced options](#advanced-options)
  - [Contributing](#contributing)
  - [Support + Feedback](#support--feedback)
  - [Frequently Asked Questions](#frequently-asked-questions)
  - [Vulnerability Reporting](#vulnerability-reporting)
  - [What is Authok?](#what-is-authok)
  - [License](#license)

## 文档

- [文档](https://authok.cn/docs/libraries/authok-spa-js)
- [API 参考](https://authok.github.io/authok-spa-js/)
- [Migrate from Authok.js to the Authok Single Page App SDK](https://authok.cn/docs/libraries/authok-spa-js/migrate-from-authokjs)

## 安装

从 CDN 安装:

```html
<script src="https://cdn.authok.cn/js/authok-spa-js/1.19/authok-spa-js.production.js"></script>
```

使用 [npm](https://npmjs.org):

```sh
npm install @authok/authok-spa-js
```

使用 [yarn](https://yarnpkg.com):

```sh
yarn add @authok/authok-spa-js
```

## 开始

### Authok 配置

在 [Authok Dashboard](https://manage.authok.cn/#/applications) 中创建一个 **单页应用** .

> **If you're using an existing application**, verify that you have configured the following settings in your Single Page Application:
>
> - Click on the "Settings" tab of your application's page.
> - Ensure that "Token Endpoint Authentication Method" under "Application Properties" is set to "None"
> - Scroll down and click on the "Show Advanced Settings" link.
> - Under "Advanced Settings", click on the "OAuth" tab.
> - Ensure that "JsonWebToken Signature Algorithm" is set to `RS256` and that "OIDC Conformant" is enabled.

Next, configure the following URLs for your application under the "Application URIs" section of the "Settings" page:

- **Allowed Callback URLs**: `http://localhost:3000`
- **Allowed Logout URLs**: `http://localhost:3000`
- **Allowed Web Origins**: `http://localhost:3000`

> These URLs should reflect the origins that your application is running on. **Allowed Callback URLs** may also include a path, depending on where you're handling the callback (see below).

Take note of the **Client ID** and **Domain** values under the "Basic Information" section. You'll need these values in the next step.

### Creating the client

Create an `AuthokClient` instance before rendering or initializing your application. You should only have one instance of the client.

```js
import createAuthokClient from '@authok/authok-spa-js';

//with async/await
const authok = await createAuthokClient({
  domain: '<AUTHOK_DOMAIN>',
  client_id: '<AUTHOK_CLIENT_ID>',
  redirect_uri: '<MY_CALLBACK_URL>'
});

//with promises
createAuthokClient({
  domain: '<AUTHOK_DOMAIN>',
  client_id: '<AUTHOK_CLIENT_ID>',
  redirect_uri: '<MY_CALLBACK_URL>'
}).then(authok => {
  //...
});

//or, you can just instantiate the client on it's own
import { AuthokClient } from '@authok/authok-spa-js';

const authok = new AuthokClient({
  domain: '<AUTHOK_DOMAIN>',
  client_id: '<AUTHOK_CLIENT_ID>',
  redirect_uri: '<MY_CALLBACK_URL>'
});

//if you do this, you'll need to check the session yourself
try {
  await getTokenSilently();
} catch (error) {
  if (error.error !== 'login_required') {
    throw error;
  }
}
```

### 1 - Login

```html
<button id="login">Click to Login</button>
```

```js
//with async/await

//redirect to the Universal Login Page
document.getElementById('login').addEventListener('click', async () => {
  await authok.loginWithRedirect();
});

//in your callback route (<MY_CALLBACK_URL>)
window.addEventListener('load', async () => {
  const redirectResult = await authok.handleRedirectCallback();
  //logged in. you can get the user profile like this:
  const user = await authok.getUser();
  console.log(user);
});

//with promises

//redirect to the Universal Login Page
document.getElementById('login').addEventListener('click', () => {
  authok.loginWithRedirect().catch(() => {
    //error while redirecting the user
  });
});

//in your callback route (<MY_CALLBACK_URL>)
window.addEventListener('load', () => {
  authok.handleRedirectCallback().then(redirectResult => {
    //logged in. you can get the user profile like this:
    authok.getUser().then(user => {
      console.log(user);
    });
  });
});
```

### 2 - Calling an API

```html
<button id="call-api">Call an API</button>
```

```js
//with async/await
document.getElementById('call-api').addEventListener('click', async () => {
  const accessToken = await authok.getTokenSilently();
  const result = await fetch('https://myapi.com', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  const data = await result.json();
  console.log(data);
});

//with promises
document.getElementById('call-api').addEventListener('click', () => {
  authok
    .getTokenSilently()
    .then(accessToken =>
      fetch('https://myapi.com', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })
    )
    .then(result => result.json())
    .then(data => {
      console.log(data);
    });
});
```

### 3 - Logout

```html
<button id="logout">Logout</button>
```

```js
import createAuthokClient from '@authok/authok-spa-js';

document.getElementById('logout').addEventListener('click', () => {
  authok.logout();
});
```

You can redirect users back to your app after logging out. This URL must appear in the **Allowed Logout URLs** setting for the app in your [Authok Dashboard](https://manage.authok.cn):

```js
authok.logout({
  return_to: 'https://your.custom.url.example.com/'
});
```

### Data caching options

The SDK can be configured to cache ID tokens and access tokens either in memory or in local storage. The default is in memory. This setting can be controlled using the `cacheLocation` option when creating the Authok client.

To use the in-memory mode, no additional options need are required as this is the default setting. To configure the SDK to cache data using local storage, set `cacheLocation` as follows:

```js
await createAuthokClient({
  domain: '<AUTHOK_DOMAIN>',
  client_id: '<AUTHOK_CLIENT_ID>',
  redirect_uri: '<MY_CALLBACK_URL>',
  cacheLocation: 'localstorage' // valid values are: 'memory' or 'localstorage'
});
```

**Important:** This feature will allow the caching of data **such as ID and access tokens** to be stored in local storage. Exercising this option changes the security characteristics of your application and **should not be used lightly**. Extra care should be taken to mitigate against XSS attacks and minimize the risk of tokens being stolen from local storage.

#### Creating a custom cache

The SDK can be configured to use a custom cache store that is implemented by your application. This is useful if you are using this SDK in an environment where more secure token storage is available, such as potentially a hybrid mobile app.

To do this, provide an object to the `cache` property of the SDK configuration.

The object should implement the following functions. Note that all of these functions can optionally return a Promise or a static value.

| Signature                        | Return type                    | Description                                                                                                                                                                                                                                                                                        |
| -------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get(key)`                       | Promise<object> or object      | Returns the item from the cache with the specified key, or `undefined` if it was not found                                                                                                                                                                                                         |
| `set(key: string, object: any) ` | Promise<void> or void          | Sets an item into the cache                                                                                                                                                                                                                                                                        |
| `remove(key)`                    | Promise<void> or void          | Removes a single item from the cache at the specified key, or no-op if the item was not found                                                                                                                                                                                                      |
| `allKeys()`                      | Promise<string[]> or string [] | (optional) Implement this if your cache has the ability to return a list of all keys. Otherwise, the SDK internally records its own key manifest using your cache. **Note**: if you only want to ensure you only return keys used by this SDK, the keys we use are prefixed with `@@authokspajs@@` |

Here's an example of a custom cache implementation that uses `sessionStorage` to store tokens and apply it to the Authok SPA SDK:

```js
const sessionStorageCache = {
  get: function (key) {
    return JSON.parse(sessionStorage.getItem(key));
  },

  set: function (key, value) {
    sessionStorage.setItem(key, JSON.stringify(value));
  },

  remove: function (key) {
    sessionStorage.removeItem(key);
  },

  // Optional
  allKeys: function () {
    return Object.keys(sessionStorage);
  }
};

await createAuthokClient({
  domain: '<AUTHOK_DOMAIN>',
  client_id: '<AUTHOK_CLIENT_ID>',
  redirect_uri: '<MY_CALLBACK_URL>',
  cache: sessionStorageCache
});
```

**Note:** The `cache` property takes precedence over the `cacheLocation` property if both are set. A warning is displayed in the console if this scenario occurs.

We also export the internal `InMemoryCache` and `LocalStorageCache` implementations, so you can wrap your custom cache around these implementations if you wish.

### Refresh Tokens

Refresh tokens can be used to request new access tokens. [Read more about how our refresh tokens work for browser-based applications](https://authok.cn/docs/tokens/concepts/refresh-token-rotation) to help you decide whether or not you need to use them.

To enable the use of refresh tokens, set the `useRefreshTokens` option to `true`:

```js
await createAuthokClient({
  domain: '<AUTHOK_DOMAIN>',
  client_id: '<AUTHOK_CLIENT_ID>',
  redirect_uri: '<MY_CALLBACK_URL>',
  useRefreshTokens: true
});
```

此设置会让 SDK 自动发送 `offline_access` scope 到授权服务器. Refresh tokens 将会被用于交换新的 access tokens, 直接调用 `/oauth/token` 端点而非使用隐藏 iframe. 这意味着多数情况下 SDK 在使用 refresh tokens 时 不需要依赖第三方 cookies.

**注意** 此配置选项需要 Rotating Refresh Tokens [为你的 Authok 租户开启](https://authok.cn/docs/tokens/guides/configure-refresh-token-rotation).

#### Refresh Token fallback

In all cases where a refresh token is not available, the SDK falls back to the legacy technique of using a hidden iframe with `prompt=none` to try and get a new access token and refresh token. This scenario would occur for example if you are using the in-memory cache and you have refreshed the page. In this case, any refresh token that was stored previously would be lost.

If the fallback mechanism fails, a `login_required` error will be thrown and could be handled in order to put the user back through the authentication process.

**Note**: This fallback mechanism does still require access to the Authok session cookie, so if third-party cookies are being blocked then this fallback will not work and the user must re-authenticate in order to get a new refresh token.

### 组织

[组织](https://authok.cn/docs/organizations) is a set of features that provide better support for developers who build and maintain SaaS and Business-to-Business (B2B) applications.

#### Log in to an organization

Log in to an organization by specifying the `organization` parameter when setting up the client:

```js
createAuthokClient({
  domain: '<AUTHOK_DOMAIN>',
  client_id: '<AUTHOK_CLIENT_ID>',
  redirect_uri: '<MY_CALLBACK_URL>',
  organization: '<MY_ORG_ID>'
});
```

You can also specify the organization when logging in:

```js
// Using a redirect
client.loginWithRedirect({
  organization: '<MY_ORG_ID>'
});

// Using a popup window
client.loginWithPopup({
  organization: '<MY_ORG_ID>'
});
```

#### Accept user invitations

Accept a user invitation through the SDK by creating a route within your application that can handle the user invitation URL, and log the user in by passing the `organization` and `invitation` parameters from this URL. You can either use `loginWithRedirect` or `loginWithPopup` as needed.

```js
const url = new URL(invitationUrl);
const params = new URLSearchParams(url.search);
const organization = params.get('organization');
const invitation = params.get('invitation');

if (organization && invitation) {
  client.loginWithRedirect({
    organization,
    invitation
  });
}
```

### Advanced options

Advanced options can be set by specifying the `advancedOptions` property when configuring `AuthokClient`. Learn about the complete set of advanced options in the [API documentation](https://authok.github.io/authok-spa-js/interfaces/advancedoptions.html)

```js
createAuthokClient({
  domain: '<AUTHOK_DOMAIN>',
  client_id: '<AUTHOK_CLIENT_ID>',
  advancedOptions: {
    defaultScope: 'email' // change the scopes that are applied to every authz request. **Note**: `openid` is always specified regardless of this setting
  }
});
```

## Contributing

We appreciate feedback and contribution to this repo! Before you get started, please see the following:

- [Authok's general contribution guidelines](https://github.com/authok/open-source-template/blob/master/GENERAL-CONTRIBUTING.md)
- [Authok's code of conduct guidelines](https://github.com/authok/open-source-template/blob/master/CODE-OF-CONDUCT.md)
- [This repo's contribution guide](https://github.com/authok/authok-spa-js/blob/master/CONTRIBUTING.md)

## Support + Feedback

For support or to provide feedback, please [raise an issue on our issue tracker](https://github.com/authok/authok-spa-js/issues).

## Frequently Asked Questions

For a rundown of common issues you might encounter when using the SDK, please check out [the FAQ](https://github.com/authok/authok-spa-js/blob/master/FAQ.md).

## Vulnerability Reporting

Please do not report security vulnerabilities on the public GitHub issue tracker. The [Responsible Disclosure Program](https://authok.cn/whitehat) details the procedure for disclosing security issues.

## What is Authok?

Authok helps you to easily:

- implement authentication with multiple identity providers, including social (e.g., Google, Facebook, Microsoft, LinkedIn, GitHub, Twitter, etc), or enterprise (e.g., Windows Azure AD, Google Apps, Active Directory, ADFS, SAML, etc.)
- log in users with username/password databases, passwordless, or multi-factor authentication
- link multiple user accounts together
- generate signed JSON Web Tokens to authorize your API calls and flow the user identity securely
- access demographics and analytics detailing how, when, and where users are logging in
- enrich user profiles from other data sources using customizable JavaScript rules

[Why Authok?](https://authok.cn/why-authok)

## License

This project is licensed under the MIT license. See the [LICENSE](https://github.com/authok/authok-spa-js/blob/master/LICENSE) file for more info.