const path = require('path');
const fs = require('fs');
const exec = require('child_process').exec;
const adapterVer = require('../package.json').version;

const SETTINGS_DESCRIPTION = {
    'FILTER': [
      { 'name': 'field', 'description': 'Field to monitor', 'type': 'string', 'value': '' },
      { 'name': 'lag', 'description': 'how much your data will be smoothed and how adaptive the algorithm is to changes', 'type': 'number', 'value': 30 },
      { 'name': 'influence', 'description': ' the influence of signals on the algorithm\'s detection threshold', 'type': 'number', 'value': 5 },
      { 'name': 'threshold', 'description': 'the number of standard deviations from the moving mean above which the algorithm will classify a new datapoint as being a signal', 'type': 'number', 'value': 0 },
    ],
    'RANGE': [
      { 'name': 'field', 'description': 'Field to monitor', 'type': 'string', 'value': '' },
      { 'name': 'min', 'description': 'Don\'t report below this limit', 'type': 'number', 'value': undefined },
      { 'name': 'max', 'description': 'Don\'t report above this limit', 'type': 'number', 'value': undefined },
    ],
    'HEARTBEAT': [
      { 'name': 'heartbeat', 'description': 'A generous estimate of time between signals', 'type': 'number', 'value': 30 },
    ],
    'RESET': [
      { 'name': 'period', 'description': 'Period to wait to reset sensor', 'type': 'number', 'value': 15 },
      { 'name': 'value', 'description': 'Value to set it to upon reset', 'type': 'string', 'value': '0' },
      { 'name': 'field', 'description': 'Field to monitor', 'type': 'string', 'value': '' },
    ]
}

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

    async rtl_433(args) {
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

    async getDevices() {
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
      const devAddr = args.split(':')[0];
      const type = args.split(':')[1];
      this.adapter.log.debug(`adding ${type} to ${devAddr}`);
      const regex = /^.*-(\w+):\w+$/;
      const match = regex.exec(args);
      if (match) {
        const dObj = { 'id': match[0] }
        broker.createChannel(dObj, broker.aAdj(devAddr), type, () => {
          SETTINGS_DESCRIPTION[type].forEach(setting => {
            this.adapter.log.debug(`creating: ${broker.aAdj(devAddr)}.${type}.${setting.name}`);
            broker.createState(
              broker.aAdj(devAddr),
              type,
              setting.name,
              setting.type,
              (stateAddr) => {
                // populate them
                // const state = datapoints[key] && datapoints[key].type === 'number' ? parseFloat(dObj[key]) : dObj[key];
                this.adapter.setState(stateAddr, setting.value);
              }
            );
            this.adapter.createState(
              broker.aAdj(devAddr),
              type,
              setting.name,
              {name: setting.description, type: setting.type,  role: 'info', read: true, write: true},
              (stateAddr) => {
                this.adapter.setState(stateAddr && broker.aAdj(stateAddr), setting.value);
              }
            );
          });
        });
      }
    }
    
    removeSettings(args, broker) {
      const devAddr = args.split(':')[0];
      const type = args.split(':')[1];
      this.adapter.log.debug(`removing ${type} from ${devAddr}`);
      SETTINGS_DESCRIPTION[type].forEach(setting => {
        this.adapter.getState(`${devAddr}.${type}.${setting.name}`, (err, obj) => {
          if (!err && obj) {
            this.adapter.deleteState(
              broker.aAdj(devAddr),
              type,
              setting.name,
              () => {
                this.adapter.log.debug(`${broker.aAdj(devAddr)}.${type}.${setting.name} deleted`);
              }
            );
          }
        });
      });
      this.adapter.deleteChannel(
        broker.aAdj(devAddr),                       // parentDevice
        type,                         // channelName
      )
    }

}

module.exports = AdminUtility;
