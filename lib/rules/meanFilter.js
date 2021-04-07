function meanFilter(dObj, args) {
    const retObj = { ...dObj };
    function mean(vals){
        const values = [...vals];
        const reducer = (accumulator, currentValue) => accumulator + currentValue;
        const total = values.reduce(reducer);
        return (total/vals.length);
    }
    const type = args.channel;
    args.adapter.log.debug(`meanFilter: found channel: ${dObj.model}-${dObj.id}.${type}`);
    // gather and present data for args sensor
    if (args.field !== '') {
        args.adapter.log.debug(`meanFilter: filtering field : ${args.field}`);
        const newDataPoint = parseFloat(dObj[args.field]);
        args.adapter.log.debug(`meanFilter: ${args.field} data in: ${newDataPoint}`);
        const data = args.filterData[`${dObj.model}-${dObj.id}.${type}.${args.field}`] || [];
        data.push(newDataPoint);
        if (data.length >= parseInt(args.length)) {
            const meanData = mean(data);
            retObj[args.field] = meanData;
            data.shift();
        }
        args.filterData[`${dObj.model}-${dObj.id}.${type}.${args.field}`] = data;
        args.adapter.log.debug(`meanFilter: ${args.field} data out: ${retObj[args.field]}`);
    }
    return retObj;
}
module.exports = meanFilter;