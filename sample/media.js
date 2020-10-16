const localStreamElem = document.getElementById('localStream');
const remoteStreamElem = document.getElementById('remoteStream');

const pc = new RTCPeerConnection();
let room;

const offer = async () => {
  await pc.setLocalDescription(await pc.createOffer());
  await room.send(JSON.stringify({
    type: 'offer',
    message: pc.localDescription,
  }));
};
const answer = async () => {
  await pc.setLocalDescription(await pc.createAnswer());
  await room.send(JSON.stringify({
    type: 'answer',
    message: pc.localDescription,
  }));
};

const connect = async () => {
  room = new WebTransportRoom('media', 'quic-transport://localhost:4433/', async (data) => {
    const {type, message} = JSON.parse(data);
    if (type === 'offer') {
      await pc.setRemoteDescription(message);
      await answer();
    }
    if (type === 'answer') {
      await pc.setRemoteDescription(message);
    }
    if (type === 'candidate') {
      if (!pc.remoteDescription || !pc.remoteDescription.type) return;

      console.log('candidate:', message);

      await pc.addIceCandidate(message);
    }
  });
  room.connect();

  pc.onnegotiationneeded = async (e) => {
    try {
      await offer();
    } catch (e) {
      console.error(e);
    }
  };
  pc.onicecandidate = async evnet => {
    // if (event.candidate) {
    //     console.log(event.candidate);
    //     await room.send(JSON.stringify({
    //       type: 'candidate',
    //       message: event.candidate,
    //     }))
    //     return;
    // }
    // console.log(evnet);
  }
  pc.ontrack = async event => {
    for (const stream of event.streams) {
        remoteStreamElem.srcObject = stream;
        // for (const track of stream.getTracks()) {
        //     console.log('addtrack', track);
        //     remoteStreamElem.srcObject.addTrack(track);
        // }
    }
  };

  const localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  localStreamElem.srcObject = localStream;

  for (const track of localStream.getTracks()) pc.addTrack(track, localStream);
};

