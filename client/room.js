class QuicTransportRoom {
  /**
   *
   * @param {String} roomname
   * @param {String} BaseURL
   */
  constructor(roomname, BaseURL = 'quic-transport://localhost:4433/') {
    this.roomname = roomname;
    this.BaseURL = BaseURL;
  }
  async connect() {
    try {
      const URL = `${this.BaseURL}${this.roomname}`;
      this.transport = new QuicTransport(URL);
      console.log('Initiating connection...');
    } catch (err) {
      console.error('Failed to create connection object. ' + err);
      return;
    }

    try {
      await this.transport.ready;
      console.log('Connection ready.');
    } catch (err) {
      console.error('Connection failed. ' + err);
      return;
    }

    this.transport.closed
      .then(() => {
        console.log('Connection closed normally.');
      })
      .catch((err) => {
        console.log('Connection closed abruptly. ' + err);
      });

    this.encoder = new TextEncoder('utf-8');
    this.datagramWriter = this.transport.sendDatagrams().getWriter();
    this.streamWriter = (await this.transport.createSendStream()).writable.getWriter();
    this.readDatagrams();
    this.readStreams();
  }
  async readStreams() {
    const reader = this.transport.receiveStreams().getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('Done accepting bidirectional streams!');
          break;
        }
        {
          const decoder = new TextDecoderStream('utf-8');
          const reader = value.readable.pipeThrough(decoder).getReader();
          this.readFromReader(reader, data => data);
        }
      }
    } catch (err) {
      console.error('Error while accepting streams:', err);
    } finally {
      reader.releaseLock();
    }
  }
  async readDatagrams() {
    const decoder = new TextDecoder('utf-8');
    const reader = this.transport.receiveDatagrams().getReader();
    this.readFromReader(reader, data => decoder.decode(data));
  }

  async readFromReader(reader, decoder) {
    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('Stream closed', stream);
          return;
        }
        const data = decoder(value);
        console.log('Received data on stream:', data, data.length);
      }
    } catch (err) {
      console.error('Error while reading from stream:', err);
    } finally {
      reader.releaseLock();
    }
  }

  async sendByDatagram(data) {
    return this.datagramWriter.write(this.encoder.encode(data));
  }
  async sendByStream(data) {
    return this.streamWriter.write(this.encoder.encode(data));
  }
  /**
   *
   * @param {String} data
   * @param {Boolean} isDatagram
   */
  async send(data, isDatagram = false) {
    if (isDatagram) this.sendByDatagram(data);
    else this.sendByStream(data);
  }
}
