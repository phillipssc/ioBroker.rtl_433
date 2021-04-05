function range(dObj, args) {
    // make sure the data is within the boundaries
    const retObj = { ...dObj };
    const type = args.channel;
    args.adapter.log.debug(`range: found channel: ${dObj.model}-${dObj.id}.${type}`);
    // gather and present data for args sensor
    
    if (args.field !== '') {
        args.adapter.log.debug(`range: filtering field : ${args.field}`);
        // get the range values
        // data
        let newDataPoint = dObj[args.field];
        args.adapter.log.debug(`range: ${args.min} < [${newDataPoint}] < ${args.max}`);
        if (newDataPoint > args.max || newDataPoint < args.min) {
            args.adapter.log.warn(`range: ${newDataPoint} is outside of range, removing`);
            // just remove it
            retObj[args.field] = undefined;
        }
        args.adapter.log.debug(`range: ${args.field} data out: ${retObj[args.field]}`);
    }
    return retObj;
}

module.exports = range;