class PeakDetect {
    constructor(args) {
        this.lag = args.lag || 5;
        this.threshold = args.threshold || 3.5;
        this.influence = args.influence || 0.5;
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

module.exports = PeakDetect;