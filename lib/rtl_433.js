'use strict';

const EventEmitter = require('events').EventEmitter;
const spawn = require("child_process").spawn;

//
//  Credit due to Dayne Broderson for code and inspiration
//  for node-red-contrib-rtl_433
//  https://github.com/dayne/node-red-contrib-rtl_433/
//  it saved me a lot of time
//

class Rtl_433 extends EventEmitter {
  constructor(parms) {
    super({
      ...parms,
      name: 'Rtl_433',
    });
    this.r433Connected = false;
    this.cmd = "rtl_433";
    this.args = ["-F","json","-M", "protocol","-M", "level"];
    this.server = undefined;
    this.log = parms.log;
    this.error = 0;
    this.options = parms.config;
    if (this.options.C_or_F === 'F' || this.options.C_or_F === 'f') {
      this.args = [...this.args, "-C", "customary"];
    }
    if (this.options.frequency !== undefined && this.options.frequency !== '') {
      this.args = [...this.args, "-f", this.options.frequency.toString()];
    }
    if (this.options.adapterno !== undefined && this.options.adapterno !== '') {
      this.args = [...this.args, "-d", this.options.adapterno.toString()];
    }
    if (this.options.protocols !== undefined && this.options.protocols !== '') {
      const protA = this.options.protocols.split(',');
      protA.forEach((prot) => {
        this.args = [...this.args, "-R", prot.toString()];
      });
    }
    if (this.options.verbose) this.log.info(JSON.stringify(this.args));
    this.openRtl433();
  }

  tryParseJSON (jsonString) {  // https://stackoverflow.com/a/20392392
    try {
      var o = JSON.parse(jsonString);

      // Handle non-exception-throwing cases:
      // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
      // but... JSON.parse(null) returns null, and typeof null === "object",
      // so we must check for that, too. Thankfully, null is falsey, so this suffices:
      if (o && typeof o === "object") {
        return o;
      }
    }
    catch (e) { }
  
    return false;
  };
  
  openRtl433() {
    let line;
    let lastmsg = {};
    this.r433Connected = false;
    try {
      if (this.options.verbose) this.log.info('starting rtl_433...');
      this.server = spawn(this.cmd, this.args);

      this.server.stdout.on("data",  (data) => {
        // adapter.log.info("runRtl433(): server.child.stdout data: "+data);  // debug only
        if (!this.r433Connected) {
          if (this.options.verbose) this.log.info('Connected');
          this.r433Connected = true;
          this.emit('connectionChange', true);
        }
        // only send lines that are parsable JSON data
        // if (this.options.verbose) { this.log.info("out: "+data); }
        line += data.toString();
        var bits = line.split("\n");
        // adapter.log.info("rtl_433: bits.length = " + bits.length);
        while (bits.length > 1) {
          var b = bits.shift();
          // adapter.log.info(b); // debugging only
          let o = this.tryParseJSON( b );
          if (o) {
            if ( JSON.stringify(lastmsg.payload) === JSON.stringify(o) ) {
              lastmsg.payload = o
              // adapter.log.info("rtl_433: skipped dup message: " + JSON.stringify(o));
            } else {
              lastmsg.payload = o
              // this.log.info("rtl_433: send message:        " + JSON.stringify(o));
              // something.send([lastmsg,null,null]);
              this.emit('data', JSON.stringify(o));
            }
          } else {
            // not JSON
            if (this.options.verbose) this.log.warn("Received non JSON data: "+o);
          }
        }
        line = bits[0];
      });
  
      this.server.stderr.on("data",  (data) => {
        const d = data.toString();
        if (d.search(/usb_claim_interface error/) > -1
          || d.search(/LIBUSB_ERROR_NOT_FOUND/) > -1
        ) {
          if (isNaN(parseInt(d.match(/\((.*)\)/)))) {
            this.error = -1;
          } else {
            this.error = parseInt(d.toString().match(/\((.*)\)/)[1]);
          }
          if (this.options.verbose) this.log.warn("rtl_433 STDERR:  "+data);
          this.disconnected();
          return this.destroy();
        }
        if (this.options.verbose) this.log.info("rtl_433 STDERR:  "+data);
      });
        
      this.server.on('close',  (code,signal) => {
        if (this.options.verbose) { this.log.warn("rtl_433 ret: "+code+":"+signal); }
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
    if (e.errno === "ENOENT" ) { this.log.error("Command not found: " + this.cmd); } 
    else if (e.errno === "EACCES") { this.log.error("Command not executable: " + this.cmd); } 
    else { this.log.error("rtl_433 error: "+ JSON.stringify(e)); }
    this.disconnected();
    this.destroy();
  }

  isConnected() {
    return this.r433Connected;
  };

  disconnected() {
    if (this.r433Connected) {
      if (this.log) this.log.info('disconnected');
      this.r433Connected = false;
      this.emit('connectionChange', false);
    }
  };

  destroy() {
    if (this.options.verbose) { this.log.warn('killing rtl_433'); }
    this.server && this.server.kill('SIGKILL');
  };
}

module.exports = Rtl_433;
