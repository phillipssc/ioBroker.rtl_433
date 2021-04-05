const PeakDetect = require('./PeakDetect');

class Rules {
    constructor(args) {
        this.adapter = args.adapter;
        this.filterData = {};
        this.timers = {};
    }

    cleanUp() {
        Object.keys(this.timers).forEach(timer => {
            clearTimeout(this.timers[timer]);
            this.timers[timer] = undefined;
        });
    }

    medianFilter(dObj, args) {
        const retObj = { ...dObj };
        function median(vals){
            const values = [...vals];
            if(values.length ===0) return 0;

            values.sort(function(a,b){
                return a-b;
            });
        
            var half = Math.floor(values.length / 2);
        
            if (values.length % 2)
            return values[half];
        
            return (values[half - 1] + values[half]) / 2.0;
        }
        const type = args.channel.common.name;
        this.adapter.log.debug(`medianFilter: found channel: ${dObj.model}-${dObj.id}.${type}`);
        // gather and present data for this sensor
        if (args.field.val !== '') {
            this.adapter.log.debug(`medianFilter: filtering field : ${args.field.val}`);
            const newDataPoint = dObj[args.field.val];
            this.adapter.log.debug(`medianFilter: ${args.field.val} data in: ${newDataPoint}`);
            const data = this.filterData[`${dObj.model}-${dObj.id}.${type}.${args.field.val}`] || [];
            data.push(newDataPoint);
            if (data.length >= args.length.val) data.shift();
            this.filterData[`${dObj.model}-${dObj.id}.${type}.${args.field.val}`] = data;
            retObj[args.field.val] = median(data);
            this.adapter.log.debug(`medianFilter: ${args.field.val} data out: ${retObj[args.field.val]}`);
        }
        return retObj;
    }

    peakDetect(dObj, args) {
    // Robust peak detection algorithm using z-scores
    // https://stackoverflow.com/questions/22583391/peak-signal-detection-in-realtime-timeseries-data/22640362#22640362
        // discover if the object has one or more FILTER channels
        const retObj = { ...dObj };
        const type = args.channel.common.name;
        this.adapter.log.debug(`peakDetect: found channel: ${dObj.model}-${dObj.id}.${type}`);
        // gather and present data for this sensor
        
        if (args.field.val !== '') {
            this.adapter.log.debug(`peakDetect: filtering field : ${args.field.val}`);
            // get the filter values
            const peakDetect = new PeakDetect({ 'lag': args.lag.val, 'threshold': args.threshold.val, 'influence': args.influence.val });
            // data
            const newDataPoint = dObj[args.field.val];
            this.adapter.log.debug(`peakDetect: data point: ${newDataPoint}`);
            const data = this.filterData[`${dObj.model}-${dObj.id}.${type}.${args.field.val}`] || [];
            data.push(newDataPoint);
            if (data.length >= args.lag.val) data.shift();
            this.filterData[`${dObj.model}-${dObj.id}.${type}.${args.field.val}`] = data;
            // feed it all to the algorhithm
            this.adapter.log.debug(`peakDetect: filter params: ${JSON.stringify({ 'lag': args.lag.val, 'threshold': args.threshold.val, 'influence': args.influence.val })}`);
            try {
                const correction = peakDetect.calc(data);
                // move the data back into dObj
                this.adapter.log.debug(`peakDetect: correction: ${JSON.stringify(correction)}`);
                retObj[args.field.val] = correction.pop();
            }
            catch(e) {
                this.adapter.log.warn(`peakDetect result: ${JSON.stringify(e)}`);
            }
        }
        return retObj;
    }

    heartbeat(dObj, args) {
    // make sure we get periodic responses from the sensor
        const type = args.channel.common.name;
        this.adapter.log.debug(`heartbeat: found channel: ${dObj.model}-${dObj.id}.${type}`);
        // gather and present data for this sensor
        
        if (args.heartbeat.val !== '') {
            this.adapter.log.debug(`heartbeat: period : ${args.heartbeat.val}`);
            // Mark it alive
            this.adapter.setState(`${dObj.model}-${dObj.id}.${type}.alive`, true);
            this.adapter.log.debug(`${dObj.model}-${dObj.id}.${type}.alive = true`);
            // check if there is a timer already and kill it if so
            const timer = this.timers[`${dObj.model}-${dObj.id}.${type}`];
            if (timer) {
                this.adapter.log.debug(`heartbeat: kill old timer`);
                clearTimeout(timer);
                this.timers[`${dObj.model}-${dObj.id}.${type}`] = undefined;
            }
            this.adapter.log.debug(`heartbeat: set new timer`);
            this.timers[`${dObj.model}-${dObj.id}.${type}`] = setTimeout(() => {
                // if we get here, it is dead
                this.adapter.log.warn(`heartbeat: timeout - marking ${dObj.model}-${dObj.id}.${type}.alive = false`);
                this.adapter.setState(`${dObj.model}-${dObj.id}.${type}.alive`, false);
            }, parseInt(args.heartbeat.val, 10));
        }
    }

    async process(dObj) {
        return new Promise((resolve,reject) => {
            // copy dObj and modify to the needs of the filters
            let retObj = { ...dObj};
            this.adapter.getChannelsOf(`${dObj.model}-${dObj.id}`, async (err, channels) => {
                if (err) reject(err);
                for (let i=0; i<channels.length; i++) {
                    const channel = channels[i];
                    if (channel.common.name.includes('PEAKDETECT')) {
                        const field = await this.adapter.getStateAsync(`${dObj.model}-${dObj.id}.${channel.common.name}.field`);
                        const lag = await this.adapter.getStateAsync(`${dObj.model}-${dObj.id}.${channel.common.name}.lag`);
                        const threshold = await this.adapter.getStateAsync(`${dObj.model}-${dObj.id}.${channel.common.name}.threshold`);
                        const influence = await this.adapter.getStateAsync(`${dObj.model}-${dObj.id}.${channel.common.name}.influence`);
                        this.adapter.log.debug(`rules: running peakDetect`);
                        const newObj = this.peakDetect(dObj, {channel, field, lag, threshold, influence});
                        retObj = { ...retObj, ...newObj};
                    }
                    else if (channel.common.name.includes('MEDIAN')) {
                        const field = await this.adapter.getStateAsync(`${dObj.model}-${dObj.id}.${channel.common.name}.field`);
                        const length = await this.adapter.getStateAsync(`${dObj.model}-${dObj.id}.${channel.common.name}.length`);
                        this.adapter.log.debug(`rules: running medianFilter`);
                        const newObj = this.medianFilter(dObj, {channel, field, length});
                        retObj = { ...retObj, ...newObj};
                    }
                    else if (channel.common.name.includes('RANGE')) {
                        const field = await this.adapter.getStateAsync(`${dObj.model}-${dObj.id}.${channel.common.name}.field`);
                        const min = await this.adapter.getStateAsync(`${dObj.model}-${dObj.id}.${channel.common.name}.min`);
                        const max = await this.adapter.getStateAsync(`${dObj.model}-${dObj.id}.${channel.common.name}.max`);
                        this.adapter.log.debug(`rules: running range`);
                        const newObj = this.range(dObj, {channel, field, min, max});
                        retObj = { ...retObj, ...newObj};
                    }
                    else if (channel.common.name.includes('RESET')) {
                        const field = await this.adapter.getStateAsync(`${dObj.model}-${dObj.id}.${channel.common.name}.field`);
                        const period = await this.adapter.getStateAsync(`${dObj.model}-${dObj.id}.${channel.common.name}.period`);
                        const value = await this.adapter.getStateAsync(`${dObj.model}-${dObj.id}.${channel.common.name}.value`);
                        this.adapter.log.debug(`rules: running reset`);
                        this.reset(dObj, {channel, field, period, value});
                    }
                    else if (channel.common.name.includes('HEARTBEAT')) {
                        let heartbeat = await this.adapter.getStateAsync(`${dObj.model}-${dObj.id}.${channel.common.name}.heartbeat`);
                        this.adapter.log.debug(`rules: running heartbeat`);
                        this.heartbeat(dObj, {channel, heartbeat});
                    }
                }
                resolve(retObj);
            });
        });
    }

    range(dObj, args) {
        // make sure the data is within the boundaries
        const retObj = { ...dObj };
        const type = args.channel.common.name;
        this.adapter.log.debug(`range: found channel: ${dObj.model}-${dObj.id}.${type}`);
        // gather and present data for this sensor
        
        if (args.field.val !== '') {
            this.adapter.log.debug(`range: filtering field : ${args.field.val}`);
            // get the range values
            // data
            let newDataPoint = dObj[args.field.val];
            this.adapter.log.debug(`range: ${args.min.val} < [${newDataPoint}] < ${args.max.val}`);
            if (newDataPoint > args.max.val || newDataPoint < args.min.val) {
                this.adapter.log.warn(`range: ${newDataPoint} is outside of range, removing`);
                // just remove it
                retObj[args.field.val] = undefined;
            }
            this.adapter.log.debug(`range: ${args.field.val} data out: ${retObj[args.field.val]}`);
        }
        return retObj;
    }

    reset(dObj, args) {
    // make sure the value gets reset to a determined state after a period of time
        const type = args.channel.common.name;
        this.adapter.log.debug(`reset: found channel: ${dObj.model}-${dObj.id}.${type}`);
        // gather and present data for this sensor
        
        if (args.field.val !== '') {
            this.adapter.log.debug(`reset: monitoring field : ${args.field.val}`);
            // data
            let newDataPoint = dObj[args.field.val];
            this.adapter.log.debug(`reset: data point: ${newDataPoint}`);
            if (newDataPoint !== args.value) {
                // check if there is a timer already and kill it if so
                const timer = this.timers[`${dObj.model}-${dObj.id}.${type}.${args.field.val}`];
                if (timer) {
                    this.adapter.log.debug(`reset: kill old timer`);
                    clearTimeout(timer);
                    this.timers[`${dObj.model}-${dObj.id}.${type}.${args.field.val}`] = null;
                }
                this.adapter.log.debug(`reset: create new timer`);
                this.timers[`${dObj.model}-${dObj.id}.${type}.${args.field.val}`] = setTimeout(()=>{
                    this.adapter.log.debug(`reset: setting ${args.field.val} value to ${args.value}`);
                    this.adapter.setState(`${dObj.model}-${dObj.id}.${type}.${args.field.val}`, args.value);
                    this.timers[`${dObj.model}-${dObj.id}.${type}.${args.field.val}`] = null;
                }, parseInt(args.period.val, 10));
            }
        }
    }
}

module.exports = Rules;