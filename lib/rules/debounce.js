function debounce(dObj, args) {
    const retObj = { ...dObj };
    // make sure the value gets reset to a determined state after a period of time
    const type = args.channel;
    args.adapter.log.debug(`debounce: found channel: ${dObj.model}-${dObj.id}.${type}`);
    // gather and present data for args sensor
    
    if (args.field !== '') {
        args.adapter.log.debug(`debounce: monitoring field : ${args.field}`);

        // check if there is a timer already
        const timer = args.timers[`${dObj.model}-${dObj.id}.${type}.${args.field}`];
        // if there is, remove this data point, we are in the debounce period
        if (timer) {
            args.adapter.log.debug(`debounce: trapped new state`);
            retObj[args.field] = undefined;
            return retObj;
        }
        args.adapter.log.debug(`debounce: create new timer`);
        args.timers[`${dObj.model}-${dObj.id}.${type}.${args.field}`] = setTimeout(()=>{
            args.adapter.log.debug(`debounce: completed`);
            args.timers[`${dObj.model}-${dObj.id}.${type}.${args.field}`] = null;
        }, parseInt(args.period, 10));
    }
}

module.exports = debounce;