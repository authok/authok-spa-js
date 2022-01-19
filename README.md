# @authok/authok-spa-js

针对单页面应用(SPA)的 Authok SDK, 采用 [基于 PKCE 的认证码授权流程](https://docs.authok.cn/api-auth/tutorials/authorization-code-grant-pkce).

[![CircleCI](https://circleci.com/gh/authok/authok-spa-js.svg?style=svg)](https://circleci.com/gh/authok/authok-spa-js)
![Release](https://img.shields.io/github/v/release/authok/authok-spa-js)
[![Codecov](https://img.shields.io/codecov/c/github/authok/authok-spa-js)](https://codecov.io/gh/authok/authok-spa-js)
![Downloads](https://img.shields.io/npm/dw/@authok/authok-spa-js)
[![License](https://img.shields.io/:license-mit-blue.svg?style=flat)](https://opensource.org/licenses/MIT)

## 目录

- [@authok/authok-spa-js](#authokauthok-spa-js)
  - [目录](#目录)
  - [文档](#文档)
  - [安装](#安装)
  - [开始](#开始)
    - [Authok 配置](#authok-配置)
    - [创建 client](#创建-client)
    - [1 - 登录](#1---登录)
    - [2 - 调用 API](#2---调用-api)
    - [3 - 退登(Logout)](#3---退登logout)
    - [数据缓存选项](#数据缓存选项)
      - [创建自定义缓存](#创建自定义缓存)
    - [刷新令牌(Refresh Token)](#刷新令牌refresh-token)
      - [刷新令牌回退](#刷新令牌回退)
    - [组织](#组织)
      - [登录组织](#登录组织)
      - [接受用户邀请](#接受用户邀请)
    - [高级选项](#高级选项)
  - [贡献](#贡献)
  - [支持 + 反馈](#支持--反馈)
  - [常见问题](#常见问题)
  - [安全风险报告](#安全风险报告)
  - [Authok 是什么?](#authok-是什么)
  - [许可](#许可)

## 文档

- [文档](https://authok.cn/docs/libraries/authok-spa-js)
- [API 参考](https://authok.github.io/authok-spa-js/)
- [从 Authok.js 升级到 Authok 单页应用 SDK](https://docs.authok.cn/libraries/authok-spa-js/migrate-from-authokjs)

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

> **如果您使用的现有应用**, 确认您是否在单页应用中做了如下配置:
>
> - 点击应用页面的 "设置" 标签栏.
> - 确保 "应用属性" 下面的 "Token Endpoint Authentication Method" 设置为 "None"
> - 滚动到页面下方并点击 "显示高级设置" 链接.
> - 在 "高级设置" 中点击 "OAuth" 标签.
> - 确保 "JsonWebToken Signature Algorithm" 设置为 `RS256` 并且 "OIDC Conformant" 是开启的.

接下来，在应用 >> “设置" >> "应用 URIs" 部分配置如下 URL:

- **Allowed Callback URLs**: `http://localhost:3000`
- **Allowed Logout URLs**: `http://localhost:3000`
- **Allowed Web Origins**: `http://localhost:3000`

> 这些 URLs 对应的是应用运行的来源(origin). **Allowed Callback URLs** 还包含应用处理回调的具体路径 (见下文).

注意 "基本信息" 中的 **Client ID** 和 **Domain**. 下一步需要用到这些值.

### 创建 client

在渲染或初始化应用程序之前创建 `AuthokClient` 实例. 您应该仅创建唯一一个 client 实例.

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

//或者，您可以自行实例化 client
import { AuthokClient } from '@authok/authok-spa-js';

const authok = new AuthokClient({
  domain: '<AUTHOK_DOMAIN>',
  client_id: '<AUTHOK_CLIENT_ID>',
  redirect_uri: '<MY_CALLBACK_URL>'
});

//如果自行实例化，您需要自行检查会话
try {
  await getTokenSilently();
} catch (error) {
  if (error.error !== 'login_required') {
    throw error;
  }
}
```

### 1 - 登录

```html
<button id="login">登录</button>
```

```js
//with async/await

//重定向到统一登录页面
document.getElementById('login').addEventListener('click', async () => {
  await authok.loginWithRedirect();
});

//在回调路由中 (<MY_CALLBACK_URL>)
window.addEventListener('load', async () => {
  const redirectResult = await authok.handleRedirectCallback();
  //登录成功. 您可以获取用户档案:
  const user = await authok.getUser();
  console.log(user);
});

//with promises

//重定向到统一登录页面
document.getElementById('login').addEventListener('click', () => {
  authok.loginWithRedirect().catch(() => {
    //重定向发生错误
  });
});

//在回调路由中 (<MY_CALLBACK_URL>)
window.addEventListener('load', () => {
  authok.handleRedirectCallback().then(redirectResult => {
    //登录成功. 您可以获取用户档案:
    authok.getUser().then(user => {
      console.log(user);
    });
  });
});
```

### 2 - 调用 API

```html
<button id="call-api">调用 API</button>
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

### 3 - 退登(Logout)

```html
<button id="logout">退登</button>
```

```js
import createAuthokClient from '@authok/authok-spa-js';

document.getElementById('logout').addEventListener('click', () => {
  authok.logout();
});
```

您可以在注销后将用户重定向回您的应用. 这个 URL 必须在 [Authok Dashboard](https://manage.authok.cn) >> 应用 >> **Allowed Logout URLs** 中进行配置:

```js
authok.logout({
  return_to: 'https://your.custom.url.example.com/'
});
```

### 数据缓存选项

可以配置 SDK 在内存或本地存储中缓存 ID 令牌和访问令牌. 默认是在内存中. 可以在创建 Authok client 时通过 `cacheLocation` 选项指定.

使用内存模式无需进行选项设置. 使用 本地存储(local storage) 模式, 需设置 `cacheLocation`:

```js
await createAuthokClient({
  domain: '<AUTHOK_DOMAIN>',
  client_id: '<AUTHOK_CLIENT_ID>',
  redirect_uri: '<MY_CALLBACK_URL>',
  cacheLocation: 'localstorage' // valid values are: 'memory' or 'localstorage'
});
```

**重要:** 此功能允许将 **ID 和访问令牌** 等数据缓存存储在本地存储中. 使用此选项会给应用程序带来安全风险, 所以 **不要轻易使用**. 应特别注意抵御 XSS 攻击, 避免令牌从本地存储被盗的风险.

#### 创建自定义缓存

可以配置 SDK 使用应用自定义缓存. 比如您有更安全的令牌存储可被使用, 例如混合移动应用程序中.

通过设置 SDK 配置的 `cache` 属性来进行自定义.

cache 对象需要实现如下函数. 所有函数都可以返回 Promise 或静态值.

| 签名                             | 返回值                         | 描述                                                                                                                                                                                                  |
| -------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get(key)`                       | Promise<object> 或 object      | 返回找到的对象, 没有找到返回 `undefined`                                                                                                                                                              |
| `set(key: string, object: any) ` | Promise<void> 或 void          | 设置条目到缓存                                                                                                                                                                                        |
| `remove(key)`                    | Promise<void> 或 void          | 从缓存删除条目, 条目未找到不作任何处理                                                                                                                                                                |
| `allKeys()`                      | Promise<string[]> 或 string [] | (可选) 如果您的缓存可以返回所有缓存条目的 key 列表. 否则，SDK 会在内部自行记录 key 清单. **注意**: SDK 使用的 key 带有前缀 `@@authokspajs@@`, 如果您只想返回此 SDK 使用的 key, 可以通过此前缀进行过滤 |

下面是一个自定义缓存的示例, 它使用 `sessionStorage`:

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

**注意:** 如果 `cache` 和 `cacheLocation` 都设置的情况下 `cache` 优先级更高. 同时设置的情况下控制台会出现警告.

我们同样暴露了 `InMemoryCache` 和 `LocalStorageCache` 的实现, 这样便于您参考实现.

### 刷新令牌(Refresh Token)

刷新令牌被用于请求新的访问令牌. [了解刷新令牌如何用于浏览器应用](https://authok.cn/docs/tokens/concepts/refresh-token-rotation) 来帮助您决定是否需要使用它们.

要使用刷新令牌, 需设置 `useRefreshTokens` 选项为 `true`:

```js
await createAuthokClient({
  domain: '<AUTHOK_DOMAIN>',
  client_id: '<AUTHOK_CLIENT_ID>',
  redirect_uri: '<MY_CALLBACK_URL>',
  useRefreshTokens: true
});
```

此设置会让 SDK 自动发送 `offline_access` scope 到授权服务器. 刷新令牌 会被用于交换新的 访问令牌, 直接调用 `/oauth/token` 端点而非使用隐藏 iframe. 这意味着多数情况下 SDK 在使用 刷新令牌 时 不需要依赖第三方 cookies.

**注意** 此配置选项需要 [为你的 Authok 租户开启](https://docs.authok.cn/tokens/guides/configure-refresh-token-rotation) 轮换刷新令牌.

#### 刷新令牌回退

在刷新令牌不可用的情况下, SDK 会回退到使用传统技术方案, 即使用带有 `prompt=none` 的隐藏 iframe 来尝试获取新的访问令牌和刷新令牌.
例如，如果您正在使用内存缓存并且刷新了页面，就会出现这种情况。在这种情况下，以前存储的任何刷新令牌都将丢失.

如果回退机制失败，将抛出一个 `login_required` 错误，可以对其进行处理，以便让用户重新进行身份验证.

**注意**: 此回退机制仍然需要访问 Authok 的会话 cookie，因此如果第三方 cookie 被阻止，则回退将不起作用，用户必须重新验证才能获得新的刷新令牌.

### 组织

[组织](https://docs.authok.cn/organizations) 主要便于开发和维护 SaaS 和 B2B 应用.

#### 登录组织

通过指定 client 的 `organization` 选项来登录组织:

```js
createAuthokClient({
  domain: '<AUTHOK_DOMAIN>',
  client_id: '<AUTHOK_CLIENT_ID>',
  redirect_uri: '<MY_CALLBACK_URL>',
  organization: '<MY_ORG_ID>'
});
```

也可以在登录时指定组织:

```js
// 使用重定向
client.loginWithRedirect({
  organization: '<MY_ORG_ID>'
});

// 使用弹出窗
client.loginWithPopup({
  organization: '<MY_ORG_ID>'
});
```

#### 接受用户邀请

通过 SDK 接受用户邀请, 方法是在应用程序中创建可处理用户邀请 URL 的路由,
并通过从此 URL 传递“organization”和“invitation”参数来登录用户。您可以根据需要使用 `loginWithRedirect` 或 `loginWithPopup`.

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

### 高级选项

可以在配置 `AuthokClient` 时通过 `advancedOptions` 属性来配置 高级选项. 参考 [API 文档](https://authok.github.io/authok-spa-js/interfaces/advancedoptions.html) 来了解高级选项的完整设置.

```js
createAuthokClient({
  domain: '<AUTHOK_DOMAIN>',
  client_id: '<AUTHOK_CLIENT_ID>',
  advancedOptions: {
    defaultScope: 'email' // 修改每个 authz 请求的 scopes. **注意**: `openid` 始终都会被指定
  }
});
```

## 贡献

感谢所有对本仓库的返回和贡献! 在开始之前，先参考:

- [Authok 的一般贡献指南](https://github.com/authok/open-source-template/blob/main/GENERAL-CONTRIBUTING.md)
- [Authok 的行为准则指南](https://github.com/authok/open-source-template/blob/main/CODE-OF-CONDUCT.md)
- [本仓库的贡献指南](https://github.com/authok/authok-spa-js/blob/main/CONTRIBUTING.md)

## 支持 + 反馈

如需支持或提供反馈, 请 [在我们的问题追踪器上提出问题](https://github.com/authok/authok-spa-js/issues).

## 常见问题

有关使用 SDK 时可能遇到的常见问题，请查看[the FAQ](https://github.com/authok/authok-spa-js/blob/master/FAQ.md).

## 安全风险报告

请不要在公共 GitHub 问题跟踪器上报告安全漏洞. [Responsible Disclosure Program](https://authok.cn/whitehat)  详细说明了披露安全问题的流程.

## Authok 是什么?

Authok 可以帮助您:

- 使用多个身份提供者进行身份认证, 包括 社会化 (例如, 微信, 企业微信, 支付宝, 抖音, 微博, Google, Facebook, Microsoft, LinkedIn, GitHub, Twitter), 或者 企业 (例如, Windows Azure AD, Google Apps, Active Directory, ADFS, SAML)
- 通过 用户名/密码 数据库, 免密模式, 多因素认证 等多种模式进行登录
- 连接多个用户账号
- 生成签名的 JSON Web 令牌以授权 API 调用并安全地传递用户身份
- 登录方式、时间和地点等统计和分析
- 使用可定制的 JavaScript 规则从其他数据源丰富用户档案

[为什么使用 Authok?](https://authok.cn/why-authok)

## 许可

本项目基于 MIT 许可. 参考 [LICENSE](https://github.com/authok/authok-spa-js/blob/master/LICENSE) 以了解更多信息.
