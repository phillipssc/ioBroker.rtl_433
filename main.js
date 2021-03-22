'use strict';

/*
 * Created with @iobroker/create-adapter v1.25.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const adapterName = require('./package.json').name.split('.').pop();
const Rtl_433 = require('./lib/rtl_433.js');
const BrokerInterface = require('./lib/brokerInterface');
const AdminUtility = require('./lib/adminUtility');
const MAX_RESTART_DURATION = 10*60; // 10 minutes
const BASE_RESTART_DURATION = 20; // 20 seconds 
const INC_RESTART_DURATION = 20; // 20 seconds 

class rtl_433 extends utils.Adapter {
  /**
   * @param {Partial<utils.AdapterOptions>} [options={}]
   */
  constructor(options) {
    super({
      ...options,
      name: 'rtl_433',
    });
    this.brokerInterface = null;
    this.server = null;
    this.restartDuration = 20;
    this.on('ready', this.onReady.bind(this));
    this.on('objectChange', this.onObjectChange.bind(this));
    this.on('stateChange', this.onStateChange.bind(this));
    this.on('unload', this.onUnload.bind(this));
    this.on('message', this.onMessage.bind(this));

  }

  /**
   * Is called when databases are connected and adapter received configuration.
   */
  async onReady() {
    // Initialize your adapter here
    const rtl_433Server = () => {
      const server = new Rtl_433({
        config: this.config, 
        log: this.log 
      });

      let connected = false;
      server.on('connectionChange', (connectState) => {
        this.setState('info.connection', connectState, true);
        if (!connectState && !connected) {
          this.log.error(`rtl_433 disconnected, reconnecting in ${this.restartDuration}s ...`);
          this.timeout = setTimeout(() => {
            this.server = rtl_433Server();
            if (this.restartDuration < MAX_RESTART_DURATION) {
              this.restartDuration += INC_RESTART_DURATION;
            }
            else {
              this.restartDuration = MAX_RESTART_DURATION;
            }
          }, this.restartDuration*1000);
        }
        else {
          this.restartDuration = BASE_RESTART_DURATION;
        }
        connected = connectState;
      });
  
      server.on('data', data => {
        this.log.debug(`${adapterName}:${data}`);
        this.brokerInterface && this.brokerInterface.handleIncomingObject(data);
      });
    }
    this.server = rtl_433Server();
    
    this.brokerInterface = new BrokerInterface({
      adapter: this, 
    });

    this.adminUtils = new AdminUtility({
      adapter: this, 
    });

  };

  /**
   * Is called when adapter shuts down - callback has to be called under any circumstances!
   * @param {() => void} callback
   */
  onUnload(callback) {
    try {
      this.brokerInterface && this.brokerInterface.cleanUp();
      this.log.info('cleaned everything up...');
      this.timeout && clearTimeout(this.timeout);
      callback();
    } catch (e) {
      callback();
    }
  }

  /**
   * Is called if a subscribed object changes
   * @param {string} id
   * @param {ioBroker.Object | null | undefined} obj
   */
  onObjectChange(id, obj) {
    if (obj) {
      // The object was changed
      this.log.debug(`object ${id} changed: ${JSON.stringify(obj)}`);
    } else {
      // The object was deleted
      this.log.debug(`object ${id} deleted`);
      this.brokerInterface && this.brokerInterface.getDevices();
    }
  }

  /**
   * Is called if a subscribed state changes
   * @param {string} id
   * @param {ioBroker.State | null | undefined} state
   */
  onStateChange(id, state) {
    if (state) {
      // The state was changed
      this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
    } else {
      // The state was deleted
      this.log.debug(`state ${id} deleted`);
    }
  }

  // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
  /**
   * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
   * Using this method requires "common.messagebox" property to be set to true in io-package.json
   * @param {ioBroker.Message} obj
   */
  async onMessage(obj) {
    const respond = (response) => {
      if (obj.callback)
        this.sendTo(obj.from, obj.command, response, obj.callback);
    };
    if (typeof obj === 'object') {
      if (obj.command === 'rtl_433') {
        try {
          respond(this.adminUtils ? await this.adminUtils.rtl_433(obj.message) : null);
        }
        catch(e) {
          respond(e);
        }
      }
      if (obj.command === 'listSerial') {
        try {
          respond(this.adminUtils ? await this.adminUtils.listSerial() : null);
        }
        catch(e) {
          respond(e);
        }
      }
      if (obj.command === 'adapterVersion') {
        try {
          respond(this.adminUtils ? this.adminUtils.adapterVersion() : null);
        }
        catch(e) {
          respond(e);
        }
      }
    }
  }
}

// @ts-ignore parent is a valid property on module
if (module.parent) {
  // Export the constructor in compact mode
  /**
   * @param {Partial<utils.AdapterOptions>} [options={}]
   */
  module.exports = (options) => new rtl_433(options);
} else {
  // otherwise start the instance directly
  new rtl_433();
}