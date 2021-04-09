function replace(dObj, args) {
    // See if the value should be removed
    const retObj = { ...dObj };
    const type = args.channel;
    args.adapter.log.debug(`replace: found channel: ${dObj.model}-${dObj.id}.${type}`);
    // gather and present data for args sensor
    
    if (args.field !== '' && dObj[args.field] !== undefined) {
        args.adapter.log.debug(`replace: monitoring field : ${args.field}`);
        // data
        let newDataPoint = dObj[args.field];
        args.adapter.log.debug(`replace: data point: ${newDataPoint}`);
        // check if newDataPoint in search
        const searchArr = args.search.split(',');
        const idx = searchArr.iondexOf(newDataPoint);
        if (idx > -1) {
            // find the corresponding replacement
            const replaceArr = args.replace.split(',');
            // replace the field
            retObj[args.field] = replaceArr[idx];
        }
    }
    return retObj;
}

module.exports = replace;