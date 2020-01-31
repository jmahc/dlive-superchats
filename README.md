<div align="center">
    <img src="media/banner.png">
    <h3><a href="https://zoomercode.github.io/dlive-superchats/#demo">zoomercode.github.io/dlive-superchats</a></h3>
    <p>Track your Dlive Superchats</p>

</div>

### Motivation

On Dlive, creators can't view a log of all donations during a stream since they'll expire after a certain time. This app tracks superchats for the entirety you have your browser tab open.

### Developmentment

Install dependencies

```sh
yarn
```

Create a DLL file for application dependencies, if this is your first time cloning the application or you have added a new project dependency that will be bundled with the application (packages found in the `dependencies` section of the `package.json` file).

```sh
yarn run dev
```

Start development server on `localhost:4141`

```sh
yarn start
```

> NOTE: Webapp development here is BYOP (bring your own proxies). You'll need both a `cors-anywhere` HTTP proxy or two, and a `websocket` proxy. Why? Well in order for this webapp to function in the browser, we need to set certain headers on our requests to the Dlive API - and you can't set these headers in a browser. For this reason we filter through a proxy that will spoof the headers we need. The app will function in demo-mode without the proxies, but in order to connect to the Dlive API you'll need them. Copy `.env.example` to a new file called `.env` and fill in your proxy URLs. Feel free to open an issue if you have no idea how to make them (which I don't blame you for).

Build for production

```sh
yarn build
```
