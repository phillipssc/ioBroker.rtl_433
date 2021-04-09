function calibrate(dObj, args) {
    // calibrate a value
    const retObj = { ...dObj };
    const type = args.channel;
    args.adapter.log.debug(`calibrate: found channel: ${dObj.model}-${dObj.id}.${type}`);    
    if (args.field !== '' && dObj[args.field] !== undefined) {
        let newDataPoint = dObj[args.field];
        args.adapter.log.debug(`calibrate: ${args.field} data point: ${newDataPoint} + (${args.calibratement})`);
        newDataPoint += parseFloat(args.adjustment);
        retObj[args.field] = newDataPoint;
    }
    return retObj;
}

module.exports = calibrate;