'use strict';

/*
 * Created with @iobroker/create-adapter v1.25.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
let   server      = null;
const Rtl_433     = require('./lib/rtl_433.js');
const adapterName = require('./package.json').name.split('.').pop();
const BrokerInterface = require('iobroker.rtl_433/lib/brokerInterface');
const { exit } = require('process');

class Rtl433 extends utils.Adapter {

  /**
   * @param {Partial<utils.AdapterOptions>} [options={}]
   */
  constructor(options) {
    super({
      ...options,
      name: 'rtl_433',
    });
    this.on('ready', this.onReady.bind(this));
    this.on('objectChange', this.onObjectChange.bind(this));
    this.on('stateChange', this.onStateChange.bind(this));
    this.on('unload', this.onUnload.bind(this));
  }

  /**
   * Is called when databases are connected and adapter received configuration.
   */
  async onReady() {
    // Initialize your adapter here
    server = new Rtl_433({
      config: this.config, 
      log: this.log 
    });

    const brokerInterface = new BrokerInterface({
      adapter: this, 
    });

    server.on('connectionChange', connectState => {
      if (connectState !== 0) {
        this.setState('info.connection', false, true);
        this.log.error('Disconnected');
        exit(-1);
      }
      this.setState('info.connection', true, true);
    });

    server.on('data', data => {
      if (this.config.verbose) { this.log.info(`${adapterName}:${data}`); }
      brokerInterface.handleIncomingObject(data);
    });
  }

  /**
   * Is called when adapter shuts down - callback has to be called under any circumstances!
   * @param {() => void} callback
   */
  onUnload(callback) {
    try {
      this.log.info('cleaned everything up...');
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
      this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
    } else {
      // The object was deleted
      this.log.info(`object ${id} deleted`);
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
      this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
    } else {
      // The state was deleted
      this.log.info(`state ${id} deleted`);
    }
  }
}

// @ts-ignore parent is a valid property on module
if (module.parent) {
  // Export the constructor in compact mode
  /**
   * @param {Partial<utils.AdapterOptions>} [options={}]
   */
  module.exports = (options) => new Rtl433(options);
} else {
  // otherwise start the instance directly
  new Rtl433();
}