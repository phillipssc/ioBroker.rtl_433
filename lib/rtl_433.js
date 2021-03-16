'use strict';

const EventEmitter = require('events').EventEmitter;
const spawn = require('child_process').spawn;
//
//  Credit due to Dayne Broderson for code and inspiration
//  for node-red-contrib-rtl_433
//  https://github.com/dayne/node-red-contrib-rtl_433/
//  it saved me a lot of time
//

class rtl_433 extends EventEmitter {
  constructor(parms) {
    super({
      ...parms,
      name: 'rtl_433',
    });
    this.log = parms.log;
    this.config = parms.config;
    this.r433Connected = false;
    this.server = undefined;

    const cmdLine = this.config.rtl_433_cmd || 'rtl_433 -F json';
    this.args = cmdLine.split(/\s/);
    this.cmd = this.args.shift();
    this.openRtl433();
  }

  tryParseJSON (jsonString) {  // https://stackoverflow.com/a/20392392
    try {
      const o = JSON.parse(jsonString);

      // Handle non-exception-throwing cases:
      // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
      // but... JSON.parse(null) returns null, and typeof null === "object",
      // so we must check for that, too. Thankfully, null is falsey, so this suffices:
      if (o && typeof o === 'object') {
        return o;
      }
    }
    catch (e) { 
      this.log.warn(e);
    }
  
    return false;
  }
  
  openRtl433() {
    let line = '';
    let lastmsg;
    this.r433Connected = false;
    try {
      this.log.info(`spawning: ${this.cmd} ${this.args.join(' ')}`);
      this.server = spawn(this.cmd, this.args);

      this.server.stdout.on('data',  (data) => {
        if (!this.r433Connected) {
          this.log.debug('Connected');
          this.r433Connected = true;
          this.emit('connectionChange', true);
        }
        // only send lines that are parsable JSON data
        line += data.toString();
        const bits = line.split('\n');
        while (bits.length > 1) {
          const b = bits.shift();
          const o = this.tryParseJSON( b );
          if (o) {
            if ( JSON.stringify(lastmsg) === JSON.stringify(o) ) {
              lastmsg = o;
            } else {
              lastmsg = o;
              this.emit('data', JSON.stringify(o));
            }
          } else {
            // not JSON
            this.log.debug('Received non JSON data: '+o);
          }
        }
        line = bits[0];
      });
  
      this.server.stderr.on('data',  (data) => {
        const dataStr = data.toString();
        if (
          dataStr.search(/pulse_FSK_detect/) === -1
          && dataStr.search(/Trying conf file at/) === -1
        ) {
          this.log.info(`rtl_433 STDERR:\t${dataStr}`);
        }
        if ( // if the condition could be fixed in a restart - add it below
          dataStr.search(/usb_claim_interface error/) > -1
          || dataStr.search(/LIBUSB_ERROR_NOT_FOUND/) > -1
        ) {
          this.log.info(`USB error. Attempting retry`);
          this.disconnected();
          return this.destroy();
        }
      });
        
      this.server.on('close',  (code,signal) => {
        this.log.debug(`rtl_433 ret: ${code}:${signal}`);
        this.emit('connectionChange', false);
        this.disconnected();
        return this.destroy();
      });
        
      this.server.on('error', (err) => {
        return this.handleError(err); 
      });

    } catch (e) {
      return this.handleError(e);
    }
  }

  handleError(e) {
    if (e.code === 'ENOENT' ) { 
      this.log.error('rtl_433 is not found on the system. Please check the installation of rtl_433'); 
    } 
    else if (e.code === 'EACCES') { 
      this.log.error('rtl_433 found but improperly installed or iobroker user does not have access.'); 
    } 
    else { 
      this.log.error('rtl_433 error: '+ JSON.stringify(e)); 
    }
    this.log.info('Go to https://github.com/merbanan/rtl_433 to for installation instructions'); 
  }

  isConnected() {
    return this.r433Connected;
  }

  disconnected() {
    if (this.r433Connected) {
      if (this.log) this.log.info('disconnected');
      this.r433Connected = false;
      this.emit('connectionChange', false);
    }
  }

  destroy() {
    this.log.debug('killing rtl_433');
    this.server && this.server.kill('SIGKILL');
  }
}

module.exports = rtl_433;
