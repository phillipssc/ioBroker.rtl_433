const rules = require('./rules/rules.json');
const peakDetect = require('./rules/peakDetect');
const medianFilter = require('./rules/medianFilter');
const heartbeat = require('./rules/heartbeat');
const range = require('./rules/range');
const reset = require('./rules/reset');

class Rules {
    constructor(args) {
        this.adapter = args.adapter;
        this.filterData = {};
        this.timers = {};
        this.routines = {
            'PEAKDETECT': peakDetect,
            'MEDIAN': medianFilter,
            'HEARTBEAT': heartbeat,
            'RANGE': range,
            'RESET': reset,
        }
    }

    cleanUp() {
        Object.keys(this.timers).forEach(timer => {
            clearTimeout(this.timers[timer]);
            this.timers[timer] = undefined;
        });
    }

    async process(dObj) {
        return new Promise((resolve,reject) => {
            // copy dObj and modify to the needs of the filters
            let retObj = { ...dObj};
            this.adapter.getChannelsOf(`${dObj.model}-${dObj.id}`, async (err, channels) => {
                if (err) reject(err);
                const args = {
                    "adapter": this.adapter,
                    "timers": this.timers,
                    "filterData": this.filterData,
                }
                for (let i=0; i<channels.length; i++) {
                    const channel = channels[i].common.name;
                    if (channel === 'INFO' || channel === 'META') continue;
                    args.channel = channel;
                    this.adapter.log.debug(`rules: found channel ${channel}`);
                    const regex = /^(\D+)\d*$/;
                    const parts = regex.exec(channel);
                    if (parts) {
                        const ruleType = parts[1];
                        this.adapter.log.debug(`rules: corresponds to rule type ${ruleType}`);
                        const ruleSet = rules[ruleType];
                        for (let i=0; i<ruleSet.length; i++) {
                            const field = ruleSet[i];
                            this.adapter.log.debug(`rules: getting field ${field.name}`);
                            const fieldNameObject = await this.adapter.getStateAsync(`${dObj.model}-${dObj.id}.${channel}.${field.name}`);
                            args[field.name] = fieldNameObject.val;
                        }
                        const showArgs = {...args, "adapter":'[adapter]'}
                        //this.adapter.log.debug(`rules: running ${ruleType} with args ${JSON.stringify(showArgs)}`);
                        const newObj = this.routines[ruleType](dObj, args);
                        retObj = { ...retObj, ...newObj};
                    }
                }
                resolve(retObj);
            });
        });
    }
}

module.exports = Rules;