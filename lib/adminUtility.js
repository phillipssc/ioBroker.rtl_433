const path = require('path');
const fs = require('fs');
const exec = require('child_process').exec;

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
}

module.exports = AdminUtility;
