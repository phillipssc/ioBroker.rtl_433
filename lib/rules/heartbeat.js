async function heartbeat(dObj, args) {
// make sure we get periodic responses from the sensor
    const type = args.channel;
    args.adapter.log.debug(`heartbeat: found channel: ${dObj.model}-${dObj.id}.${type}`);
    // gather and present data for args sensor
    
    if (args.heartbeat !== '') {
        args.adapter.log.debug(`heartbeat: period : ${args.heartbeat}`);
        // Mark it alive
        const alive = await args.adapter.getStateAsync(`${dObj.model}-${dObj.id}.${type}.alive`);
        if (alive.val) {
            args.adapter.log.debug(`${dObj.model}-${dObj.id}.${type}.alive = true`);
        }
        else {
            args.adapter.setState(`${dObj.model}-${dObj.id}.${type}.alive`, true);
            args.adapter.log.warn(`${dObj.model}-${dObj.id}.${type}.alive = true`);
        }
        // check if there is a timer already and kill it if so
        const timer = args.timers[`${dObj.model}-${dObj.id}.${type}`];
        if (timer) {
            args.adapter.log.debug(`heartbeat: kill old timer`);
            clearTimeout(timer);
            args.timers[`${dObj.model}-${dObj.id}.${type}`] = undefined;
        }
        args.adapter.log.debug(`heartbeat: set new timer`);
        args.timers[`${dObj.model}-${dObj.id}.${type}`] = setTimeout(() => {
            // if we get here, it is dead
            args.adapter.log.warn(`heartbeat: timeout - marking ${dObj.model}-${dObj.id}.${type}.alive = false`);
            args.adapter.setState(`${dObj.model}-${dObj.id}.${type}.alive`, false);
        }, parseInt(args.heartbeat, 10));
    }
    return dObj;
}
module.exports = heartbeat;