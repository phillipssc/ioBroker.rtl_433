function badValue(dObj, args) {
    // See if the value should be removed
    const retObj = { ...dObj };
    const type = args.channel;
    args.adapter.log.debug(`badValue: found channel: ${dObj.model}-${dObj.id}.${type}`);
    // gather and present data for args sensor
    
    if (args.field !== '' && dObj[args.field] !== undefined) {
        args.adapter.log.debug(`badValue: monitoring field : ${args.field}`);
        // data
        let newDataPoint = dObj[args.field];
        args.adapter.log.debug(`badValue: data point: ${newDataPoint}`);
        if (newDataPoint == args.badValue) { // purposefully doing a vague comparison
            // kill the value
            retObj[args.field] = undefined;
        }
    }
    return retObj;
}

module.exports = badValue;