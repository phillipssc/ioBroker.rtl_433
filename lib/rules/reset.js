function reset(dObj, args) {
// make sure the value gets reset to a determined state after a period of time
    const type = args.channel;
    args.adapter.log.debug(`reset: found channel: ${dObj.model}-${dObj.id}.${type}`);
    // gather and present data for args sensor
    
    if (args.field !== '') {
        args.adapter.log.debug(`reset: monitoring field : ${args.field}`);
        // data
        let newDataPoint = dObj[args.field];
        args.adapter.log.debug(`reset: data point: ${newDataPoint}`);
        if (newDataPoint !== args.value) {
            // check if there is a timer already and kill it if so
            const timer = args.timers[`${dObj.model}-${dObj.id}.${type}.${args.field}`];
            if (timer) {
                args.adapter.log.debug(`reset: kill old timer`);
                clearTimeout(timer);
                args.timers[`${dObj.model}-${dObj.id}.${type}.${args.field}`] = null;
            }
            args.adapter.log.debug(`reset: create new timer`);
            args.timers[`${dObj.model}-${dObj.id}.${type}.${args.field}`] = setTimeout(()=>{
                args.adapter.log.debug(`reset: setting ${args.field} value to ${args.value}`);
                args.adapter.setState(`${dObj.model}-${dObj.id}.${args.field}`, args.value);
                args.timers[`${dObj.model}-${dObj.id}.${type}.${args.field}`] = null;
            }, parseInt(args.period, 10));
        }
    }
}

module.exports = reset;