// https://github.com/Philmod/node-pid-controller
const Controller = require('node-pid-controller');

function pidController(dObj, args) {
    const ruleName = args.channel;
    args.adapter.log.debug(`pidController: found channel: ${dObj.model}-${dObj.id}.${ruleName}`);

    if (args.field !== '' && dObj[args.field] !== undefined) {
        let ctr = args.controllers[`${dObj.model}-${dObj.id}.${ruleName}.${args.field}`];
        if(ctr === undefined) {
            args.adapter.log.debug(`pidController: creating PID controller for: ${dObj.model}-${dObj.id}.${args.field}`);
            ctr = new Controller({
                k_p: args.k_p,
                k_i: args.k_i,
                k_d: args.k_d,
                dt: undefined
            });
            args.controllers[`${dObj.model}-${dObj.id}.${ruleName}.${args.field}`] = ctr;
        }
        
        ctr.setTarget(args.target);
        const current = dObj[args.field];
        const pidRslt  = ctr.update(current);
        args.adapter.setState(`${dObj.model}-${dObj.id}.${ruleName}.output`, pidRslt);
    }
}

module.exports = pidController;

// "PIDCTRL": {
//     "inputs": [
//         {
//             "name": "field",
//             "description": "Field to monitor",
//             "type": "string",
//             "check": "string",
//             "value": "",
//             "input": true,
//             "output": true
//         },
//         {
//             "name": "k_p",
//             "description": "",
//             "type": "number",
//             "check": "float",
//             "value": null,
//             "input": true,
//             "output": true
//         },
//         {
//             "name": "k_i",
//             "description": "",
//             "type": "number",
//             "check": "float",
//             "value": null,
//             "input": true,
//             "output": true
//         },
//         {
//             "name": "k_d",
//             "description": "",
//             "type": "number",
//             "check": "float",
//             "value": null,
//             "input": true,
//             "output": true
//         },
//         {
//             "name": "target",
//             "description": "The target the PID controller should strive to achieve",
//             "type": "number",
//             "check": "float",
//             "value": null,
//             "input": true,
//             "output": true
//         },
//         {
//             "name": "output",
//             "description": "The output of the PID controller appears here",
//             "type": "number",
//             "check": "float",
//             "value": null,
//             "input": false,
//             "output": true
//         }
//     ],
//     "displayName": "PID Controller",
//     "filename": "pidController.js"
// }
