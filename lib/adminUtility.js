const path = require('path');
const fs = require('fs');
const exec = require('child_process').exec;
const adapterVer = require('../package.json').version;
const rules = require('./rules/rules.json');

class AdminUtility {
  constructor(args) {
      this.adapter = args.adapter;
      this.filterSerialPorts = this.filterSerialPorts.bind(this);
      this.listSerial = this.listSerial.bind(this);
      this.rtl_433 = this.rtl_433.bind(this);
      const cmdLine = this.adapter.config.rtl_433_cmd || 'rtl_433 -F json';
      const cmdLineParts = cmdLine.split(/\s/);
      this.rtl_433_cmd = cmdLineParts[0];
  
  }

  filterSerialPorts(path) {
      // get only serial port names
      if (!(/(tty(S|ACM|USB|AMA|MFD)|rfcomm)/).test(path)) return false;

      return fs
          .statSync(path)
          .isCharacterDevice();
  }

  listSerial() {
      // Filter out the devices that aren't serial ports
      const devDirName = '/dev';

      let result;
      try {
          result = fs
              .readdirSync(devDirName)
              .map(function (file) {
                  return path.join(devDirName, file);
              })
              .filter(this.filterSerialPorts)
              .map(function (port) {
                  return {comName: port};
              });
      } catch (e) {
          this.adapter.log.error('Cannot read "' + devDirName + '": ' + e);
          result = [];
      }
      return result;
  }

  rtl_433(args) {
      return new Promise((resolve, reject) => {
          exec(this.rtl_433_cmd + ' ' + args, (error, stdout, stderr) => {
              if (error) {
                  reject({error});
              }
              else resolve({stdout, stderr});
          });
      });
  }

  adapterVersion() {
      return adapterVer;
  }

  getRules() {
    return JSON.stringify(rules);
  }

  getDevices() {
      return new Promise((resolve, reject) => {
          this.adapter.getDevices((err, obj) => {
              if (err) {
                reject(err);
              } else {
                resolve(JSON.stringify(obj));
              }
          });
      });
  }

  createSettings(args, broker) {
    // This will create the rule on the device with default values.
    return new Promise((resolve, reject) => {
      // args: Acurite-Tower-14825_:_MEDIAN
      const parts = args.split('_:_');
      const type = parts[1];
      const devAddr = parts[0];

      this.adapter.log.debug(`adding ${type} to ${devAddr}`);
      const regex = /^.*-(\w+)_:_\w+$/;
      const match = regex.exec(args);
      if (match) {
        const dObj = { 'id': match[0] }
        this.adapter.getChannelsOf(devAddr, (err, channels) => {
          if (err) reject(err);
          let typeNumber = 0;
          const regex = /^\D+(\d*)$/;
          for (let i=0; i<channels.length; i++) {
            const channel = channels[i];
            if (channel.common.name.includes(type)) {
              const parts = regex.exec(channel.common.name);
              if (parts) {
                const channelNum = parseInt(parts[1],10);
                if (channelNum > typeNumber) typeNumber = channelNum;
              } 
            }
          }
          let typeIteration = type + (++typeNumber).toString();

          broker.createChannel(dObj, devAddr, typeIteration, (chAddr) => {
            for (let i=0; i<rules[type].length; i++) {
              const setting = rules[type][i];
              this.adapter.log.debug(`creating: ${devAddr}.${typeIteration}.${setting.name}`);
              broker.createState(
                devAddr,
                typeIteration,
                setting.name,
                {name: setting.description, type: setting.type,  role: 'info', read: true, write: true},
                (stateAddr) => {
                  // populate them
                  this.adapter.log.debug(`state created: ${stateAddr}`);
                  this.adapter.setState(stateAddr, setting.value, () => {
                    if (i = rules[type].length - 1) resolve(chAddr);
                  });
                }
              );
            };
          });
        });
      }
    });
  }
  
  removeSettings(args) {
    let parts = args.split('.');
    const devAddr = parts[0];
    const name = parts[1];
    const regex = /^(\D+)\d*$/;
    parts = regex.exec(name);
    const type = parts[1];
    if (parts) {
      this.adapter.log.debug(`removing ${name} from ${devAddr}`);
      const settings = rules[type];
      for (let i=0; i<settings.length; i++) {
        const setting = settings[i];
        this.adapter.deleteState(
          devAddr,
          name,
          setting.name,
          () => {
            this.adapter.log.debug(`${args}.${setting.name} deleted`);
          }
        );
      }
      this.adapter.deleteChannel(
        devAddr,         // parentDevice
        name,            // channelName
      )
    }
  }

  getChannelsOf(parentDevice) {
    return new Promise((resolve, reject) => {
      this.adapter.getChannelsOf(parentDevice, (err, obj) => {
          if (err) {
            reject(err);
          } else {
            resolve(JSON.stringify(obj));
          }
      });
    });
  }

  getStatesOf(device) {
    const parts = device.split('.');
    const devAddr = parts[0];
    const channel = parts[1];
    return new Promise((resolve, reject) => {
      this.adapter.getStatesOf(devAddr, channel, (err, obj) => {
          if (err) {
            reject(err);
          } else {
            resolve(JSON.stringify(obj));
          }
      });
    });
  }

  getState(devAddr) {
    return new Promise((resolve, reject) => {
      this.adapter.getState(devAddr, (err, obj) => {
          if (err) {
            reject(err);
          } else {
            resolve(JSON.stringify(obj));
          }
      });
    });
  }

  setState(args) {
    return new Promise((resolve, reject) => {
      const parts = args.split('_:_');
      const state = parts[1];
      const devAddr = parts[0];
      this.adapter.log.info(`setState('${devAddr}', ${state})`);
      this.adapter.setState(devAddr, state, () => {resolve(null)});
    });
  }

}

module.exports = AdminUtility;
