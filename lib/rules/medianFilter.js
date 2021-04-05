function medianFilter(dObj, args) {
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
    const type = args.channel;
    args.adapter.log.debug(`medianFilter: found channel: ${dObj.model}-${dObj.id}.${type}`);
    // gather and present data for args sensor
    if (args.field !== '') {
        args.adapter.log.debug(`medianFilter: filtering field : ${args.field}`);
        const newDataPoint = dObj[args.field];
        args.adapter.log.debug(`medianFilter: ${args.field} data in: ${newDataPoint}`);
        const data = args.filterData[`${dObj.model}-${dObj.id}.${type}.${args.field}`] || [];
        data.push(newDataPoint);
        if (data.length >= args.length) data.shift();
        args.filterData[`${dObj.model}-${dObj.id}.${type}.${args.field}`] = data;
        retObj[args.field] = median(data);
        args.adapter.log.debug(`medianFilter: ${args.field} data out: ${retObj[args.field]}`);
    }
    return retObj;
}
module.exports = medianFilter;