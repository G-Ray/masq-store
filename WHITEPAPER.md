# Masq Whitepaper

[![](https://img.shields.io/badge/project-Masq-7C4DFF.svg?style=flat-square)](https://github.com/QwantResearch/masq-store)

![Masq Logo](https://i.imgur.com/qZ3dq0Q.png)

# TOC

  * [Motivation](#motivation)
  * [Architecture](#architecture)
    * [Overview](#overview)
    * [Data storage](#data-storage)
    * [Pairing new devices](#pairing-new-devices)
    * [Shared secret key](#shared-secret-key)
    * [Synchronization](#synchronization)


# Motivation

Before getting into the technical stuff, you need to understand why decentralization is so important for us at this time. To answer this question, we must first explain why centralization is bad.

Centralization is a cheap and easy point for regulation, control and surveillance — your information is increasingly available from “the cloud”, an easy one stop shopping point to get data not just about you, but about everyone. Centralization is also easy — why waste time and money (as a small business) investing in a decentralized product instead of going with some off-the-shelf tech stack? While these may be valid points that may eventually be addressed, the end result is that we all pay a price — whether it’s losing your data or actual money. The data silos make no effort allow people to get out. This practice is commonly called **vendor lock-in**.

OK, so now that you know what the problem is, what can we do about it?

First, we need to aim for user-centricity, though please bear in mind I'm not talking about centralization. Right now, when a new service is launched, if we want to avoid logging in with Google or Facebook to use it, then we need to sign up. In doing this we disclose our identity as well as provide them with free access to all the content we store there. Who else gets access to our data behind our backs? What if tomorrow the service shuts down or is bought? What happens to all the data we created there so far?

The solution is a *user-centric* approach. The Internet allows us to stay connected almost permanently, with very little downtime, on most of our devices, so why not store the data on our devices under our control? All devices then share the data and stay synchronized. When you use an app, it just needs to request access to the local data store on the device. "Running" the app then simply means you just need to load the Javascript, HTML and CSS files, since the data is stored locally. For example, you can use a maps app that stores your POIs locally, and then shares them with your other devices. This new approach provides an unparalled level of privacy. The company who made the app has no idea who you are and has no access to your data since no data is sent or stored on remote servers.


# Architecture

## Overview
The architecture of our Web-based implementation is fairly straightforward. Data is stored on the device, using the browser's native storage APIs (either `localStorage` or `IndexedDB`). Client applications connect to the data store through a middleware (client) API that creates an Origin-bound communication channel using `postMessage` between the app and the store, through a hidden `<iframe>` element. This may not be an elegant solution for some people, though it offers quite decent security and browser support at no extra cost.


    [Client app on device 1] <- postMessage -> [Local Masq store on device 1] 

                          <= Sync over WebSocket =>

    [Local Masq store on device 2] <- postMessage -> [Client app on device 2]

All the complexity of storing and synchronizing data, as well as pairing new devices is handled by the Masq UI app (the store). Client applications only need to be concerned with how interact with the store to read and write data.

## Data storage
Right now the default store in our proof-of-concept implementation is based on `localStorage`, with `IndexedDB` to follow shortly. Applications are sandboxed to their own storage space, bound to the app's `Origin`. The client API for accessing the store is documented in the [client library](https://github.com/QwantResearch/masq-client), and it offers the ability to read and write individual key/value pairs or the whole data store for the given app. We have plans to allow inter-app access in the near future, protected by access control policies.


## Pairing new devices
To reuse application data on another device, a pairing step must first be performed using the Masq UI app. To pair a new device, a secret key must be shared between the user's devices, which is then used to derive a symmetric crypto key that will encrypt/decrypt the data in transit. Please note that all cryptographic operations are done using the native [WebCrypto API](https://www.w3.org/TR/WebCryptoAPI/) available today in all the browsers.

### Shared secret key
The secret key is a random string of alphanumeric characters, generated using the WebCrypto API as well. When pairing a new device, our Masq UI app creates a link that contains its own URL to which it appends the key as a fragment identifier (e.g. https://example.org/?pair=#OS1UYAiFvdQxdw1Lth). The motivation behind using a fragment identifier is that it prevents leaking the value after the `#` character, as browsers strip fragment identifiers before sending the request to the server.

For ease of use, the URL can also be placed in a QR code, to avoid errors in typing the code on a different device. However, the user has to trust that the application which scans the QR code will not leak the scanned value.

## Synchronization
The sync process is done exclusively by the store, meaning that client applications do not need to be concerned about anything related to data synchronization. Once the shared secret key has been shared with a new device, and the symmetric crypto key has been derived, the devices are ready to sync data. The data transfer is done using the WebSocket protocol. We offer a public sync server at wss://sync-beta.qwantresearch.com:8080, but you can also [install and run it](https://github.com/QwantResearch/masq-syncserver) yourself.

All the devices that have been paired join a room with a unique ID that corresponds to the hashed value of the shared secret key. In our current implementation, all changes that are made through the client API are then propagated to all the other devices using a broadcast approach. However, in certain cases, a device may be offline during a broadcase and thus it may miss an update event. In this case, when a device (re)connects to the sync server (or when it detects that it is back online) it will send a special `check` message with the timestamp of its last update. When this message is received by other devices, they can compare timestamps and then send the new data in case the timestamp received is lower than the local one they have. Please note that all messages sent through the WebSocket are encrypted.