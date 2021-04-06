function meanFilter(dObj, args) {
    const retObj = { ...dObj };
    function mean(vals){
        const values = [...vals];
        if(values.length !== args.length) {
            args.adapter.log.debug(`meanFilter: error in arg length`);
            return;
        }

        const reducer = (accumulator, currentValue) => accumulator + currentValue;
        return (values.reduce(reducer)/args.length);
    }
    const type = args.channel;
    args.adapter.log.debug(`meanFilter: found channel: ${dObj.model}-${dObj.id}.${type}`);
    // gather and present data for args sensor
    if (args.field !== '') {
        args.adapter.log.debug(`meanFilter: filtering field : ${args.field}`);
        const newDataPoint = dObj[args.field];
        args.adapter.log.debug(`meanFilter: ${args.field} data in: ${newDataPoint}`);
        const data = args.filterData[`${dObj.model}-${dObj.id}.${type}.${args.field}`] || [];
        data.push(newDataPoint);
        if (data.length >= args.length) {
            retObj[args.field] = mean(data) || retObj[args.field];
            data.shift();
        }
        args.filterData[`${dObj.model}-${dObj.id}.${type}.${args.field}`] = data;
        args.adapter.log.debug(`meanFilter: ${args.field} data out: ${retObj[args.field]}`);
    }
    return retObj;
}
module.exports = meanFilter;