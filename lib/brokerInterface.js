const datapoints = require('iobroker.rtl_433/lib/datapoints');

class BrokerInterface {
  constructor(args) {
    this.adapter = args.adapter;
    this.devices = [];
    this.getDevices();
    this.interval = setInterval(this.checkDevices.bind(this), this.adapter.config.killcheckinterval || 30000);
  }

  cleanUp() {
    clearInterval(this.interval);
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
    if (this.adapter.config.verbose) this.adapter.log.info('Checking for dead devices...');
    const now = new Date().valueOf();
    this.devices.forEach((device) => {
      this.adapter.getForeignState(
        `${device._id}.META.time`,
        (err, t_obj) => {
          if (err) {
            this.adapter.log.error(err);
          } else {
            const alive = `${device._id}.META.alive`;
            this.adapter.getForeignState(
              alive,
              (err, a_obj) => {
                if (err) {
                  this.adapter.log.error(err);
                } else {
                  if (a_obj.val) {
                    const lastalive = new Date(t_obj.val).valueOf();
                    if((now - lastalive) >  (this.adapter.config.lifetime || 60000)) {
                      if (this.adapter.config.verbose) this.adapter.log.warn(`declared ${device._id} dead`);
                      this.adapter.setForeignState(alive, false);
                    }
                  }
                }
              }
            );
          }
        }
      );
    });
  }

  updateDeviceStates(dObj) {
    // Update existing device states
    Object.keys(dObj).forEach((key) => {
      if (datapoints[key] !== undefined) {
        const id = datapoints[key].channel ? `${dObj.model}-${dObj.id}.${datapoints[key].channel}.${key}` : `${dObj.model}-${dObj.id}.${key}`;
        this.adapter.getState(
          id,
          (err, obj) => {
            if (err) { // error here means that the device got deleted.
              // rerun the device caching
              this.getDevices();
              // return by rerunning the command.
              // if (this.adapter.config.verbose) this.adapter.log.info('device missing, rerunning the index');
              // return this.handleIncomingObject(JSON.stringify(dObj));
            } else {
              if (obj === null || dObj[key] != obj.val) {
                const state = datapoints[key].type === 'number' ? parseFloat(dObj[key]) : dObj[key];
                this.adapter.setState(id, state);
              }
            }
          }
        );
      }
    });
    // Mark alive = true
    this.adapter.setState(
      `${dObj.model}-${dObj.id}.META.alive`,
      true
    );
    // Mark uptime = timeDifference(d0, d1)
    this.adapter.getState(
      `${dObj.model}-${dObj.id}.META.discovered`,
      (err, obj) => {
        if (err) {
          this.adapter.log.error(err);
        } else {
          this.adapter.setState(
            `${dObj.model}-${dObj.id}.META.uptime`,
            this.timeDifference(new Date(obj.val), new Date(dObj['time']))
          );
        }
      }
    );
  }

  createNewFromData(dObj) {
    // Create and populate a new device
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
          // add an alive state
          this.createState(
            this.aAdj(devAddr),
            'META',
            'alive',
            {type: 'boolean', role: 'switch', read: true, write: false},
            (stateAddr) => {
            this.adapter.setState(this.aAdj(stateAddr), true);
            }
          );
        });
      });
    });
  }
  
  createDevice(dObj, cb) {
    if (this.adapter.config.verbose) this.adapter.log.info(`Creating Device ${dObj.model}-${dObj.id}`);
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
    )
  }

  createChannel(dObj, addr, ch, cb) {
    if (this.adapter.config.verbose) this.adapter.log.info(`Creating Channel ${ch} on ${addr}`);
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
    )
  }

  createState(addr, chan, key, role, cb) {
    if (this.adapter.config.verbose) this.adapter.log.info(`Creating State ${key} on ${addr}`);
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
    )
  }

  aAdj(aObj) {
    // The return from the function is either a string or an object with an id parameter
    // This holds the foreign address rather than the "local" one
    // This returns a string with the local address 
    if (typeof aObj === 'string') {
      return aObj.match(/^.*?\..*?\.(.*)/)[1].replace('_INFO', '.INFO');
    } else {
      return aObj.id.match(/^.*?\..*?\.(.*)/)[1];
    }
  }

  handleIncomingObject(message) {
    // This is the main entry point for new data
    const dObj = JSON.parse(message);
    if (this.isExistingDevice(`${dObj.model}-${dObj.id}`)) {
      this.updateDeviceStates(dObj);
    } else {
      this.createNewFromData(dObj);
    }
  }
}

module.exports = BrokerInterface;