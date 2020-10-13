# quictrasnport-room-sample
Create rooms like socket.io by using QuicTransport protocol.

This sample is based on https://github.com/GoogleChrome/samples/tree/gh-pages/quictransport.

## How to use

### Run Server
1. Generate a certificate and a private key and save them in cert directory
1. Run `pipenv shell`
1. Run `pipenv run python ./server/stream_from_server.py ./cert/certificate.pem ./cert/certificate.key`

### Run Client (Mac)
1. Install Google Chrome canary version
1. Run `open -a /Applications/Google\ Chrome\ Canary.app --args --enable-experimental-web-platform-features --origin-to-force-quic-on=localhost:4433 --ignore-certificate-errors-spki-list=<YOUR FINGERPRINT>`

#### Room chat sample
1. Open `room.html`
1. Press "Connect" button
1. Input string and press "Send by Datagram" or "Send by Stream" button

#### WebRTC signaling sample
1. Open `media.html`
1. Press "Connect" button
1. Press "Offer" button to create offer

## API
[Documantation](docs.md)
