# Masq Hub

Data store for Qwant Masq. It allows third-party applications using [Masq Client](https://github.com/QwantResearch/masq-client) to connect to the Masq Hub (central data manager) to store and retrieve application data.

The data is currently stored in *localStorage*, bound to the origin of the client app.

# Install

## Developer

```
git clone https://github.com/QwantResearch/masq-hub.git
cd client
npm install
```

# Example usage

Add the client JS reference in your HTML page.

```JavaScript
<script type="text/javascript" src="src/index.js"></script>
```

Initialize the store.

```JavaScript
// Allow connections from testing apps running on localhost (full access) and
// also read-only access from example.org
window.MasqHub.init({
  permissions: [
    {origin: /^https?:\/\/localhost+(:[0-9]*)?/, allow: ['get', 'set', 'del', 'clear', 'getAll', 'setAll']},
    {origin: /^https?:\/\/example.org$/, allow: ['get', 'getAll']}
  ],
  debug: false
})
```
