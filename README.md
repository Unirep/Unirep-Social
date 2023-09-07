<p align="center">
    <h1 align="center">Unirep Social</h1>
</p>

<p align="center">
    <a href="https://github.com/unirep/unirep">
        <img src="https://img.shields.io/badge/project-unirep-blue.svg?style=flat-square">
    </a>
    <a href="https://github.com/unirep/unirep/blob/master/LICENSE">
        <img alt="Github license" src="https://img.shields.io/github/license/unirep/unirep.svg?style=flat-square">
    </a>
    <a href="https://eslint.org/">
        <img alt="Linter eslint" src="https://img.shields.io/badge/linter-eslint-8080f2?style=flat-square&logo=eslint">
    </a>
    <a href="https://prettier.io/">
        <img alt="Code style prettier" src="https://img.shields.io/badge/code%20style-prettier-f8bc45?style=flat-square&logo=prettier">
    </a>
    <a href="https://dl.circleci.com/status-badge/redirect/gh/Unirep/Unirep-Social/tree/main">
        <img alt="Circle CI" src="https://img.shields.io/circleci/build/github/Unirep/Unirep-Social/main?style=flat-square">
    </a>
</p>


## 💡 About Unirep Social
**UniRep Social** is a social media that is built upon the [Unirep Protocol](https://github.com/Unirep/Unirep). The users of Unirep Social can publish posts, leave comments anonymously, and also give boost/squash to other users anonymously. User can also prove how much reputation he has when posting/commenting.

## 🔋 Requirements

- Intall [rust](https://www.rust-lang.org/tools/install) and [circom 2](https://docs.circom.io/getting-started/installation/)
- Node.js >=16.14

## 🛠 Installation

Install and build

```bash
yarn & yarn build
```

## 👷 Run Unirep Social in local

### 1. Start a blockchain environment

```sh
cd packages/core && npx hardhat node
```

### 2. Deploy Unirep and Unirep Social smart contracts

in new terminal window, from root:

```sh
yarn core deploy --network local
```

### 3 Start a relayer (backend)

Copy the [.env.example](https://github.com/Unirep/Unirep-Social/blob/main/packages/backend/.env.example) file to an `.env` file in `packages/backend`
Then grant permission from [X (Twitter) Oauth](https://developer.twitter.com/en/products/twitter-api) and [Github Oauth](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app).

Set the authentication settings as following:
| X (Twitter) | |
|--|--|
|**App permissions** | Read |
|**Type of App** | Native App |
|**Callback URL/Redirect URL** | `http://127.0.0.1:3001/api/oauth/twitter/callback` |


| Github | |
|--|--|
|**Callback URL/Redirect URL** | `http://127.0.0.1:3001/api/oauth/github/callback` |


in new terminal window, from root:

```sh
yarn backend start
```

### 4. Start a frontend

in new terminal window, from root:
```sh
yarn frontend start
```

It will be running at: http://127.0.0.1:3000/ by default.

## 🌈 Lint

### Format the code

```sh
yarn lint:fix
```

### Check if the code is formatted

```sh
yarn lint:check
```

## 🎯 Contributing

Contributions are always welcome! Feel free to open any issue or send a pull request.
Go to [CONTRIBUTING.md](./CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) to learn about how to contribute to Unirep project!

## 🙌🏻 Join our community
- Discord server: <a href="https://discord.gg/VzMMDJmYc5"><img src="https://img.shields.io/discord/931582072152281188?label=Discord&style=flat-square&logo=discord"></a>
- Twitter account: <a href="https://twitter.com/UniRep_Protocol"><img src="https://img.shields.io/twitter/follow/UniRep_Protocol?style=flat-square&logo=twitter"></a>
- Telegram group: <a href="https://t.me/unirep"><img src="https://img.shields.io/badge/telegram-@unirep-blue.svg?style=flat-square&logo=telegram"></a>

## <img height="24" src="https://pse.dev/_next/static/media/header-logo.16312102.svg"> Privacy & Scaling Explorations

This project is supported by [Privacy & Scaling Explorations](https://pse.dev/) in Ethereum Foundation.
See more projects on: https://pse.dev/projects.
