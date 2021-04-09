function debounce(dObj, args) {
    const retObj = { ...dObj };
    // make sure the value gets reset to a determined state after a period of time
    const type = args.channel;
    args.adapter.log.debug(`debounce: found channel: ${dObj.model}-${dObj.id}.${type}`);
    // gather and present data for args sensor

    function setTimer(id, period) {
        args.timers[id] = setTimeout(()=>{
            args.adapter.log.debug(`debounce: completed, cleaning record for ${id}`);
            args.timers[id] = null;
        }, parseInt(period, 10));
    }
    // check if there is a timer already
    const timer = args.timers[`${dObj.model}-${dObj.id}.${type}.${args.field}`];
    // if there is, remove this data point, we are in the debounce period
    if (timer !== undefined && timer !== null) {
        args.adapter.log.debug(`debounce: trapped new state`);
        return null;
    }
    args.adapter.log.debug(`debounce: create new  timer ${args.period} milliseconds`);
    setTimer(`${dObj.model}-${dObj.id}.${type}.${args.field}`, args.period);
    return dObj;
}

module.exports = debounce;