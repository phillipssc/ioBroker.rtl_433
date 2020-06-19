const datapoints = require('./datapoints');

function handleIncomingObject(adapter, client, iObj) {
  const dObj = JSON.parse(iObj);
  adapter.createDevice(
    `${dObj.model}-${dObj.id}`, // deviceName
    undefined,                  // common
    undefined,                  // _native
    undefined,                  // options
    (e, devAddr) => {                 // callback
      // ok, now channel
      adapter.log.info(`Device addr: ${dObj.model}-${dObj.id}`);
      const dKeys = Object.keys(dObj);
      ['time','model','id','channel'].forEach((key) => {
        adapter.createState(
          `${dObj.model}-${dObj.id}`, // parentDevice
          undefined,                  // parentChannel
          key,                        // stateName
          'info',                     // roleOrCommon
          undefined,                  // _native
          undefined,                  // options
          (e, stateAddr) => {                 // callback
            adapter.log.info(`State addr: ${stateAddr}`);
            adapter.setState(stateAddr, dObj[key]);
          }
        );
      });
      dKeys.forEach((key) => {
        // ok now state data
        if (datapoints[key] !== undefined) {
          adapter.createState(
            `${dObj.model}-${dObj.id}`, // parentDevice
            undefined,                  // parentChannel
            key,                        // stateName
            datapoints[key],            // roleOrCommon
            undefined,                  // _native
            undefined,                  // options
            (e, stateAddr) => {                 // callback
              adapter.log.info(`State addr: ${stateAddr}`);
              adapter.setState(stateAddr, parseFloat(dObj[key]));
            }
          );
        }
      });
    }
  );
}

module.exports = {
    handleIncomingObject,
};
