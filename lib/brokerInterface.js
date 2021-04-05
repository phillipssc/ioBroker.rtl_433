const datapoints = require('./datapoints');
const Rules = require('./rules');

class BrokerInterface {
  constructor(args) {
    this.adapter = args.adapter;
    this.devices = [];
    this.getDevices();
    // this.interval = setInterval(this.checkDevices.bind(this), this.adapter.config.killcheckinterval || 30000);
    this.rules = new Rules({ 'adapter': this.adapter });
  }

  cleanUp() {
    // clearInterval(this.interval);
    this.rules.cleanUp();
  }

  timeDifference(d0, d1) {
    let delta = d1-d0;
    const dayperiod = 24*60*60*1000;
    const days = Math.floor(delta/(dayperiod));
    delta -= days*dayperiod;
    const hourperiod = 60*60*1000;
    const hours = Math.floor(delta/hourperiod);
    delta -= hours*hourperiod;
    const minperiod = 60*1000;
    const minutes = Math.floor(delta/minperiod);
    delta -= minutes*minperiod;
    const secperiod = 1000;
    const seconds = Math.floor(delta/secperiod);
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }

  isExistingDevice(id) {
    // Check the local cache for the existance of a device
    return this.devices.some((device) => device._id.indexOf(id) > -1);
  }

  getDevices() {
    // Cache the local devices
    this.adapter.getDevices((err, obj) => {
      if (err) {
        this.adapter.log.error(err);
      } else {
        this.devices = obj;
      }
    });
  }

  checkDevices() {
    // Iterate the devices looking to mark ones dead that haven't responded in a while
    this.adapter.log.debug('Checking for dead devices...');
    const now = new Date().valueOf();
    this.devices.forEach((device) => {
      this.adapter.getState(`${device._id}.META.time`, (err, t_obj) => {
          if (err) {
            this.adapter.log.error(`${device._id}.META.time: ${err}`);
          } else {
            const alive = `${device._id}.META.alive`;
            this.adapter.getState(alive, (err, a_obj) => {
              if (err) {
                this.adapter.log.error(`${device._id}.META.alive: ${err}`);
              } else {
                if (a_obj && a_obj.val && t_obj) {
                  const lastalive = new Date(t_obj.val).valueOf();
                  if((now - lastalive) >  (this.adapter.config.lifetime || 60000)) {
                    this.adapter.log.debug(`${device._id}: dead`);
                    this.adapter.setState(alive, false);
                  }
                  else {
                    this.adapter.log.debug(`${device._id}: ok`);
                  }
                }
              }
            });
          }
        }
      );
    });
  }

  updateDeviceStates(dObj) {
    // Update existing device states
    Object.keys(dObj).forEach((key) => {
      if (datapoints[key] === undefined) datapoints[key] = { 
        type: 'string',
        role: 'value',
        read: true,
        write: false
      };
      const id = datapoints[key].channel 
        ? `${dObj.model}-${dObj.id}.${datapoints[key].channel}.${key}`
        : `${dObj.model}-${dObj.id}.${key}`;
      this.adapter.getState(id, (err, obj) => {
          if (err) {
            this.adapter.log.error(`${id}: ${err}`);
          } else {
            try {
              if (obj === null) {   // make the state as needed
                this.createState(
                  `${dObj.model}-${dObj.id}`, 
                  datapoints[key].channel,
                  key,
                  datapoints[key],
                  (stateAddr) => {
                    this.adapter.setState(this.aAdj(stateAddr), dObj[key]);
                  }
                );                           
              } else if( dObj[key] != obj.val) {
                this.adapter.setState(id, dObj[key]);
              }
            }
            catch(err) {
              this.adapter.log.error(`${id}: ${err}`);
            }
          }
        }
      );
    });
    // Mark alive = true
    // try {
    //   this.adapter.setState(
    //     `${dObj.model}-${dObj.id}.META.alive`,
    //     true
    //   );
    // }
    // catch (err) {
    //   this.adapter.log.error(`${dObj.model}-${dObj.id}.META.alive: ${err}`);
    // }
    // Mark uptime = timeDifference(d0, d1)
    this.adapter.getState(`${dObj.model}-${dObj.id}.META.discovered`, (err, obj) => {
        if (err) {
          this.adapter.log.error(`${dObj.model}-${dObj.id}.META.discovered: ${err}`);
        } else {
          // apparently it is possible to get here without error nor a defined obj
          if (obj && obj.val !== undefined) {
            try {
              this.adapter.setState(
                `${dObj.model}-${dObj.id}.META.uptime`,
                this.timeDifference(new Date(obj.val), new Date(dObj['time']))
              );
            }
            catch(err) {
              this.adapter.log.error(`${dObj.model}-${dObj.id}.META.uptime: ${err}`);
            }
          }
        }
      }
    );
  }

  createNewFromData(dObj) {
    // Create and populate a new device
    try {
      this.createDevice(dObj, (devAddr) => {
        this.createChannel(dObj, this.aAdj(devAddr), 'INFO', () => {
          this.createChannel(dObj, this.aAdj(devAddr), 'META', () => {
            const defaultTypeData = { type: 'string', role: 'value', read: true, write: false };
            Object.keys(dObj).forEach((key) => {
              this.createState(
                this.aAdj(devAddr),
                datapoints[key] ? datapoints[key].channel : undefined,
                key,
                datapoints[key] || defaultTypeData,
                (stateAddr) => {
                  // populate them
                  // const state = datapoints[key] && datapoints[key].type === 'number' ? parseFloat(dObj[key]) : dObj[key];
                  this.adapter.setState(this.aAdj(stateAddr), dObj[key]);
                }
              );
            });
            this.createState(
              this.aAdj(devAddr),
              'META',
              'discovered',
              {type: 'string',  role: 'info', read: true, write: false},
              (stateAddr) => {
                this.adapter.setState(this.aAdj(stateAddr), dObj['time']);
              }
            );
            // add an uptime state
            this.createState(
              this.aAdj(devAddr),
              'META',
              'uptime',
              {type: 'string',  role: 'info', read: true, write: false},
              (stateAddr) => {
                this.adapter.setState(this.aAdj(stateAddr), '0 seconds');
              }
            );
            // add an alive state - moved to RULES
            // this.createState(
            //   this.aAdj(devAddr),
            //   'META',
            //   'alive',
            //   {type: 'boolean', role: 'switch', read: true, write: false},
            //   (stateAddr) => {
            //     this.adapter.setState(this.aAdj(stateAddr), true);
            //   }
            // );
          });
        });
      });
    }
    catch(err) {
      this.adapter.log.error(err);
    }
  }
  
  createDevice(dObj, cb) {
    this.adapter.log.debug(`Creating Device ${dObj.model}-${dObj.id}`);
    try {
      this.adapter.createDevice(
        `${dObj.model}-${dObj.id}`, // deviceName
        undefined,                  // common
        {clientId: dObj.id},        // _native
        undefined,                  // options
        (err, addr) => {            // callback
          if (err) {
            this.adapter.log.error(err);
          } else {
            this.getDevices();
            cb && cb(addr);
          }
        }
      );
    }
    catch(err) {
      this.adapter.log.error(err);
    }
  }

  createChannel(dObj, addr, ch, cb) {
    this.adapter.log.debug(`Creating Channel ${ch} on ${addr}`);
    try {
      this.adapter.createChannel(
        addr,                       // parentDevice
        ch,                         // channelName
        {name: ch},                 // common
        {clientId: dObj.id},        // _native
        (err, addr) => {            // callback
          if (err) {
            this.adapter.log.error(err);
          } else {
            cb && cb(addr);
          }
        }
      );
    }
    catch(err) {
      this.adapter.log.error(err);
    }
  }

  createState(addr, chan, key, role, cb) {
    this.adapter.log.debug(`Creating State ${key} on ${addr}`);
    try {
      this.adapter.createState(
        addr,                       // parentDevice
        chan,                       // parentChannel
        key,                        // stateName
        role,                       // roleOrCommon
        undefined,                  // _native
        undefined,                  // options
        (err, addr) => {            // callback
          if (err) {
            this.adapter.log.error(err);
          } else {
            cb && cb(addr);
          }
        }
      );
    }
    catch(err) {
      this.adapter.log.error(err);
    }
  }

  aAdj(aObj) {
    // The return from the function is either a string or an object with an id parameter
    // This holds the foreign address rather than the "local" one
    // This returns a string with the local address 
    if (aObj === null || aObj === undefined) return null;
    if (typeof aObj === 'string') {
      this.adapter.log.debug(`object identifier returned from create call: ${aObj}`);
      const matches = aObj.match(/^.*?\..*?\.(.*)/);
      if (matches && matches.length > 0) return matches[1].replace('_INFO', '.INFO');
      else return null;
    } else {
      this.adapter.log.debug(`object identifier returned from create call: ${JSON.stringify(aObj)}`);
      const matches = aObj.id.match(/^.*?\..*?\.(.*)/);
      if (matches && matches.length > 0) return matches[1];
      else return null;
    }
  }

  async handleIncomingObject(message) {
    // This is the main entry point for new data
    const dObj = JSON.parse(message);
    if (dObj.id !== undefined) {
      if (this.isExistingDevice(`${dObj.model}-${dObj.id}`)) {
        const newData = await this.rules.process(dObj);
        Object.keys(dObj).forEach(key => {
          if (dObj[key] !== newData[key]) {
            this.adapter.log.debug(`brokerinterface: rules changed ${key} to ${newData[key]}`);
          }
        });
        this.updateDeviceStates(newData);
      } else {
        this.adapter.log.debug('Creating new object');
        this.adapter.log.debug(message);
        if (this.adapter.config.include) {
          this.createNewFromData(dObj);
        }
      }
    }
  }
}

module.exports = BrokerInterface;
