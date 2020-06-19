const datapoints = require('iobroker.rtl_433/lib/datapoints');

class BrokerInterface {
  constructor(args) {
    this.adapter = args.adapter;
    this.adapter.getDevices((err, obj) => {
      if (err) {
        this.log.error(err);
      } else {
        this.devices = obj;
      }
    });
  }

  isExistingDevice(id) {
    // if (this.adapter.config.verbose) this.adapter.log.info(`Testing if ${id} exists`);
    return this.devices.some((device) => device._id.indexOf(id) > -1);
  }

  updateDeviceStates(dObj) {
    // if (this.adapter.config.verbose) this.adapter.log.info(`Updating device states for ${dObj.model}-${dObj.id}`);
    Object.keys(dObj).forEach((key) => {
      if (datapoints[key] !== undefined) {
        const id = `${dObj.model}-${dObj.id}.${key}`;
        this.adapter.getState(id, (err, obj) => {
          if (err) {
            this.adapter.log.error(err);
          } else {
            const state = datapoints[key].type === 'number' ? parseFloat(dObj[key]) : dObj[key];
            if (dObj[key] != obj.val) {
              this.adapter.setState(`${dObj.model}-${dObj.id}.${key}`, state);
            }
          }
        });
      }
    });
  }

  createDevice(dObj, cb) {
    if (this.adapter.config.verbose) this.adapter.log.info(`Creating device ${dObj.model}-${dObj.id}`);
    this.adapter.createDevice(
      `${dObj.model}-${dObj.id}`, // deviceName
      undefined,                  // common
      {clientId: dObj.id},        // _native
      undefined,                  // options
      (err, addr) => {           // callback
        if (err) {
          this.log.error(err);
        } else {
          cb && cb(addr);
        }
      }
    )
  }

  createChannel(dObj, cb) {
    if (this.adapter.config.verbose) this.adapter.log.info(`Creating Channel ${dObj.model}-${dObj.id}`);
    this.adapter.createDevice(
      `${dObj.model}-${dObj.id}`, // deviceName
      undefined,                  // common
      {clientId: dObj.id},        // _native
      undefined,                  // options
      (err, addr) => {           // callback
        if (err) {
          this.log.error(err);
        } else {
          cb && cb(addr);
        }
      }
    )
  }

  createState(dObj, key, role, cb) {
    if (this.adapter.config.verbose) this.adapter.log.info(`Creating states ${dObj.model}-${dObj.id}.${key}`);
    this.adapter.createState(
      `${dObj.model}-${dObj.id}`, // parentDevice
      undefined,                  // parentChannel
      key,                        // stateName
      role,                       // roleOrCommon
      undefined,                  // _native
      undefined,                  // options
      (err, addr) => {           // callback
        if (err) {
          this.log.error(err);
        } else {
          cb && cb(addr);
        }
      }
    )
  }

  handleIncomingObject(message) {
    const dObj = JSON.parse(message);
    const deviceId = `${dObj.model}-${dObj.id}`;

    if (this.isExistingDevice(deviceId)) {
      this.updateDeviceStates(dObj);
    } else {
      this.createDevice(dObj, (devAddr) => {
        ['model','id'].forEach((key) => {
          this.createState(dObj, key, 'info', (stateAddr) => {
              this.adapter.setState(stateAddr, dObj[key]);
            }
          );
        });
        Object.keys(dObj).forEach((key) => {
          if (datapoints[key] !== undefined) {
            this.createState(dObj, key, datapoints[key], (stateAddr) => {
              const state = datapoints[key].type === 'number' ? parseFloat(dObj[key]) : dObj[key];
              this.adapter.setState(stateAddr, parseFloat(dObj[key]));
            });
          }
        });
      });
    }
  }
}

module.exports = BrokerInterface;
