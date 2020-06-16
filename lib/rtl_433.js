'use strict';

const EventEmitter =      require('events').EventEmitter;

// const types   = require('./datapoints');

//
//  Credit due to Dayne Broderson for code and inspiration
//  for node-red-contrib-rtl_433
//  https://github.com/dayne/node-red-contrib-rtl_433/
//  it saved me a lot of time
//

const spawn = require("child_process").spawn;
// var child = spawn("rtl_433 -F json");

// https://stackoverflow.com/a/20392392
class Rtl_433 extends EventEmitter {
// function Rtl_433(options, log, onCreated) {
  constructor(parms) {
    super({
      ...parms,
      name: 'Rtl_433',
    });
    this.r433Connected = false;
    this.cmd = "rtl_433";
    this.args = ["-F","json"];
    this.server = undefined;
    this.log = parms.log;
    this.options = parms.options;
    this.openRtl433();
  }

  tryParseJSON (jsonString) {
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
    try {
      this.server = spawn(this.cmd, this.args);

      this.server.stdout.on("data",  (data) => {
        // adapter.log.info("runRtl433(): server.child.stdout data: "+data);  // debug only
        if (!this.r433Connected) {
          if (this.options.verbose) this.log.info('Connected');
          this.r433Connected = true;
          this.emit('connectionChange', true);
        }
        // only send lines that are parsable JSON data
        if (this.options.verbose) { this.log.info("out: "+data); }
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
              this.log.info("rtl_433: send message:        " + JSON.stringify(o));
              // something.send([lastmsg,null,null]);
              this.server && this.server.emit('data', data);
            }
          } else {
            // not JSON
            this.log.info("rtl_433 STDOUT: "+o);
          }
        }
        line = bits[0];
      });
  
      this.server.stderr.on("data",  (data) => {
        this.log.info("rtl_433 STDERR:  "+data);
      });
        
      this.server.on('close',  (code,signal) => {
        if (this.options.verbose) { this.log.info("rtl_433 ret: "+code+":"+signal); }
        this.server = null;
        var rc = code;
        // if (code === null ) { rc = signal; }
        // something.send([null,null,{payload:rc}]);
      });
        
      this.server.on('error', (err) => {
        if (err.name === "ENOENT") { this.log.warn('Command not found'); }
        else if (err.name === "EACCES") { this.log.warn('Command not executable'); }
        else { this.log.info('error: ' + err); }
      });

    } catch (e) {
      console.warn(`${this.cmd} is not available`);
      if (e.errno === "ENOENT" ) { this.log.warn("Command not found: " + this.cmd); } 
      else if (e.errno === "EACCES") { this.log.warn("Command not executable: " + this.cmd); } 
      else { 
        this.log.info("error: " + e); 
        this.log.debug("rtl_433 error: "+ e);
      }
    }
  }

  isConnected() {
    return this.r433Connected;
  };

  disconnected() {
    if (this.r433Connected) {
      if (this.log) this.log.info('disconnected');
      this.r433Connected = false;
      this.server && this.server.emit('connectionChange', false);
    }
  };

  destroy() {
    this.server && this.server.kill();
  };
}

module.exports = Rtl_433;
