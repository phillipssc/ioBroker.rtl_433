function range(dObj, args) {
    // make sure the data is within the boundaries
    const retObj = { ...dObj };
    const type = args.channel;
    args.adapter.log.debug(`range: found channel: ${dObj.model}-${dObj.id}.${type}`);
    // gather and present data for args sensor
    
    if (args.field.val !== '') {
        args.adapter.log.debug(`range: filtering field : ${args.field.val}`);
        // get the range values
        // data
        let newDataPoint = dObj[args.field.val];
        args.adapter.log.debug(`range: ${args.min.val} < [${newDataPoint}] < ${args.max.val}`);
        if (newDataPoint > args.max.val || newDataPoint < args.min.val) {
            args.adapter.log.warn(`range: ${newDataPoint} is outside of range, removing`);
            // just remove it
            retObj[args.field.val] = undefined;
        }
        args.adapter.log.debug(`range: ${args.field.val} data out: ${retObj[args.field.val]}`);
    }
    return retObj;
}

module.exports = range;