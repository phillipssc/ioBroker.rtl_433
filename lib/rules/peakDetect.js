class PeakDetect {
    constructor(args) {
        this.lag = parseInt(args.lag, 10) || 5;
        this.threshold = parseFloat(args.threshold) || 3.5;
        this.influence = parseFloat(args.influence) || 0.5;
        this.data = [];
        this.signals = [];
    }
    
    sum(a) {
        return a.reduce((acc, val) => acc + val)
    }
    
    mean(a) {
        return this.sum(a) / a.length
    }
    
    stddev(arr) {
        const arr_mean = this.mean(arr)
        const r = function(acc, val) {
            return acc + ((val - arr_mean) * (val - arr_mean))
        }
        return Math.sqrt(arr.reduce(r, 0.0) / arr.length)
    }
    
    calc(y) {    
        if(y === undefined || y.length < this.lag + 2) {
            throw ` ## y data array to short(${y.length}) for given lag of ${this.lag}`
        }
        //console.log(`lag, threshold, influence: ${lag}, ${threshold}, ${influence}`)
    
        // init variables
        var signals = Array(y.length).fill(0)
        var filteredY = y.slice(0)
        const lead_in = y.slice(0, this.lag)
        //console.log("1: " + lead_in.toString())
        var avgFilter = []
        avgFilter[this.lag-1] = this.mean(lead_in)
        var stdFilter = []
        stdFilter[this.lag-1] = this.stddev(lead_in)
        //console.log("2: " + stdFilter.toString())
    
        for(var i = this.lag; i < y.length; i++) {
            //console.log(`${y[i]}, ${avgFilter[i-1]}, ${threshold}, ${stdFilter[i-1]}`)
            if (Math.abs(y[i] - avgFilter[i-1]) > (this.threshold * stdFilter[i-1])) {
                if(y[i] > avgFilter[i-1]) {
                    signals[i] = +1     // positive signal
                } else {
                    signals[i] = -1     // negative signal
                }
                // make influence lower
                filteredY[i] = this.influence * y[i] + (1 - this.influence) * filteredY[i-1]
            } else { 
                signals[i] = 0          // no signal
                filteredY[i] = y[i]
            }
    
            // adjust the filters
            const y_lag = filteredY.slice(i-this.lag, i)
            avgFilter[i] = this.mean(y_lag)
            stdFilter[i] = this.stddev(y_lag)
        }
    
        return signals
    }
}

function peakDetect(dObj, args) {
    // Robust peak detection algorithm using z-scores
    // https://stackoverflow.com/questions/22583391/peak-signal-detection-in-realtime-timeseries-data/22640362#22640362
    const ruleName = args.channel;
    args.adapter.log.debug(`peakDetect: found channel: ${dObj.model}-${dObj.id}.${ruleName}`);
    // gather and present data for args sensor
    
    if (args.field !== '' && dObj[args.field] !== undefined) {
        args.adapter.log.debug(`peakDetect: filtering field : ${args.field}`);
        // get the filter values
        const peakDetect = new PeakDetect({ 'lag': args.lag, 'threshold': args.threshold, 'influence': args.influence });
        // data
        const newDataPoint = dObj[args.field];
        args.adapter.log.debug(`peakDetect: data point: ${newDataPoint}`);
        const data = args.filterData[`${dObj.model}-${dObj.id}.${ruleName}.${args.field}`] || [];
        data.push(newDataPoint);
        if (data.length >= args.lag + 3) data.shift();
        args.filterData[`${dObj.model}-${dObj.id}.${ruleName}.${args.field}`] = data;
        // feed it all to the algorhithm
        args.adapter.log.debug(`peakDetect: filter params: ${JSON.stringify({ 'lag': args.lag, 'threshold': args.threshold, 'influence': args.influence })}`);
        try {
            const correction = peakDetect.calc(data);
            // move the data back into dObj
            args.adapter.log.debug(`peakDetect: correction: ${JSON.stringify(correction)}`);
            const output = correction.pop();
            args.adapter.setState(`${dObj.model}-${dObj.id}.${ruleName}.output`, output);
            if (output !== 0) {
                args.adapter.log.warn(`peakDetect: ${output < 0 ? 'negative' : ''} peak detected`);
            }
        }
        catch(e) {
            // args.adapter.log.warn(`peakDetect result: ${JSON.stringify(e)}`);
        }
    }
    return dObj;
}
module.exports = peakDetect;