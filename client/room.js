class WebTransportRoom {
  /**
   *
   * @param {String} roomname
   * @param {String} BaseURL
   * @param {Function} cb - Callback function called when client receives data
   */
  constructor(roomname, BaseURL = 'quic-transport://localhost:4433/', cb = console.log) {
    this.roomname = roomname;
    this.BaseURL = BaseURL;
    this.cb = cb;

    this.length = {
      datagram: 0,
      stream: 0,
    };
    this.buffer = {
      datagram: new Uint8Array(),
      stream: new Uint8Array(),
    };
  }

  /**
   * Connect to QuicTransportServer
   */
  async connect() {
    if (window.WebTransport === undefined) {
      throw new Error('WebTransport is unsupported');
    }

    try {
      const URL = `${this.BaseURL}${this.roomname}`;
      this.transport = new WebTransport(URL);
      console.log('Initiating connection...');
    } catch (err) {
      throw new Error('Failed to create connection object. ' + err.message);
    }

    try {
      await this.transport.ready;
      console.log('Connection ready.');
    } catch (err) {
      throw new Error('Connection failed. ' + err.message);
    }

    this.transport.closed
      .then(() => {
        console.log('Connection closed normally.');
      })
      .catch((err) => {
        console.log('Connection closed abruptly. ' + err);
      });

    this.encoder = new TextEncoder('utf-8');
    this.datagramWriter = this.transport.datagramWritable.getWriter();
    this.streamWriter = (await this.transport.createUnidirectionalStream()).writable.getWriter();
    this.readDatagrams();
    this.readStreams();
  }

  /**
   * @private
   */
  async readStreams() {
    const reader = this.transport.incomingUnidirectionalStreams.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('Done accepting bidirectional streams!');
          break;
        }
        {
          const decoder = new TextDecoder('utf-8');
          const reader = value.readable.getReader();
          this.readFromReader(reader, data => decoder.decode(data), 'stream');
        }
      }
    } catch (err) {
      throw new Error('Error while accepting streams:', err.message);
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * @private
   */
  async readDatagrams() {
    const decoder = new TextDecoder('utf-8');
    const reader = this.transport.datagramReadable.getReader();
    this.readFromReader(reader, data => decoder.decode(data), 'datagram');
  }

  /**
   * @private
   * @param {ReadableStreamDefaultReader} reader
   * @param {TextDecoder} decoder
   * @param {String} type
   */
  async readFromReader(reader, decoder, type) {
    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('Stream closed', stream);
          return;
        }
        if (this.length[type] === 0) {
          const [len, rest] = this.unpack(Uint8Array.from([...this.buffer[type],...value]));

          this.buffer[type] = rest;
          this.length[type] = len;
        } else {
          this.buffer[type] = Uint8Array.from([...this.buffer[type],...value]);
        }

        if (this.buffer[type].byteLength > this.length[type]) { // split and flush
          const data = decoder(this.buffer[type].slice(0,this.length[type]));
          await this.cb(data);
          this.buffer[type] = this.buffer[type].slice(this.length[type]);
          this.length[type] = 0;
        } else if (this.buffer[type].byteLength === this.length[type]) { // flush
          const data = decoder(this.buffer[type]);
          await this.cb(data);

          this.buffer[type] = new Uint8Array();
          this.length[type] = 0;
        }
      }
    } catch (err) {
      console.error(err);
      throw new Error('Error while reading from stream:', err);
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Send data by using datagram
   * @param {String} data - Data to send
   */
  sendByDatagram(data) {
    const buffer = this.pack(this.encoder.encode(data));
    return this.datagramWriter.write(buffer);
  }

  /**
   * Send data by using stream
   * @param {String} data - Data to send
   */
  sendByStream(data) {
    const buffer = this.pack(this.encoder.encode(data));
    return this.streamWriter.write(buffer);
  }

  /**
   * Send data
   * @param {String} data - Data to send
   * @param {Boolean} isDatagram - The data is datagram if true, else stream
   */
  send(data, isDatagram = false) {
    if (isDatagram) return this.sendByDatagram(data);
    else return this.sendByStream(data);
  }

  /**
   * Add length field to ArrayBuffer
   * @private
   * @param {Uint8Array} ary - Length of ary must be less than 65536.
   */
  pack(ary) {
    const len = ary.byteLength;
    return Uint8Array.from([0,0,0,0,0,0,0,0,0,0,0,0,0,0,Math.floor(len/256),len%256,...ary]);
  }

  /**
   * Get length and data from ArrayBuffer
   * @private
   * @param {Uint8Array} ary - Binary data that contains its length
   */
  unpack(ary) {
    const lenField = ary.slice(0,16);
    for (let i = 0; i < 14; ++i) {
      if (lenField[i] !== 0) {
        throw new Error('Invalid length field');
      }
    }
    const len = lenField[14] * 256 + lenField[15];

    const value = ary.slice(16);
    return [len, value];
  }
}
