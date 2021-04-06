function getComPorts() {
    return new Promise((resolve,reject) => {
        const _getComPorts = () => {
            let timeout = setTimeout(function () {
                _getComPorts();
            }, 2000);
            sendTo(null, 'listSerial', null, function (list) {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                }
                if (!list || !list.length) {
                    timeout = setTimeout(function () {
                        _getComPorts();
                    }, 1000);
                    return;
                }
                var text = '';
                for (var j = 0; j < list.length; j++) {
                    if (list[j].comName === 'Not available') {
                        text += '<option value="">' + _('Not available') + '</option>';
                        $('#usb').prop('disabled', true);
                        break;
                    } else {
                        text += '<option value="' + list[j].comName + '" ' + '>' + list[j].comName + '</option>';
                    }
                }
                $('#ports').html(text);
                resolve();
            });
        }
        _getComPorts();
    });
}

function getProtocols() {
    return new Promise((resolve, reject) => {
        const _getProtocols = () => {
            let timeout = setTimeout(function () {
                _getProtocols();
            }, 2000);
            sendTo(null, 'rtl_433', '-R', (list) => {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                }
                if (!list.stderr || !list.stderr.length) {
                    timeout = setTimeout(function () {
                        _getProtocols();
                    }, 1000);
                    return;
                }
                $('#protocolsList').empty();
                const lines = list.stderr.split('\n').filter((line) => line.search((/\s*\[\d*\]\*?\s{1,2}.*/))>=0);
                for (var j = 0; j < lines.length; j++) {
                    const parts = lines[j].match((/\s*\[(\d*)\](\*?)\s{1,2}(.*)/));
                    const hidden = parts[2] === '*' ? ' hiddendiv blacklisted' : '';
                    const color = parts[2] === '*' ? ' color: maroon;' : '';
                    let html = $('<tr>',{ "class": `device${hidden}`, "data-id": `${parts[1]}` }).append(
                        $('<td>', { "style": "white-space: nowrap;" }).append(
                            $('<label>', { "for": `include${parts[1]}`, "class": "translate" }).append(
                                $('<input>', { "type": "checkbox", "class": "pIncludes value arg", "id": `include${parts[1]}`, "disabled": true }),
                                $('<span>')
                            )
                        ),
                        $('<td>', { "style": "white-space: nowrap;" }).append(
                            $('<label>', { "for": `exclude${parts[1]}`, "class": "translate" }).append(
                                $('<input>', { "type": "checkbox", "class": "pExcludes value arg", "id": `exclude${parts[1]}`, "disabled": true }),
                                $('<span>')
                            )
                        ),
                        $('<td>', { "style": "white-space: nowrap;${color}" }).text(parts[1]),
                        $('<td>', { "style": "white-space: nowrap;${color}" }).text(parts[3])
                    )
                    $('#protocolsList').append(html);
                }
                if (M) M.updateTextFields();
                resolve();
            });
        }
        _getProtocols();
    });
}

function getDevices() {
    return new Promise((resolve, reject) => {
        const _getDevices = () => {
            let timeout = setTimeout(function () {
                _getDevices();
            }, 2000);
            sendTo(null, 'getDevices', null, (list) => {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                }
                if (!list || !list.length) {
                    timeout = setTimeout(function () {
                        _getDevices();
                    }, 1000);
                    return;
                }
                
                $('#devicesList').empty();

                const devices = JSON.parse(list).sort((a,b)=>a._id > b._id ? 1  : -1);
                for (let i=0; i<devices.length; i++ ) {
                    const device = devices[i];
                    const regex = /^rtl_433\.\d+\.(.*)$/;
                    const id = regex.exec(device._id)[1];
                    if (id !== undefined) {
                        const display = id !== device.common.name 
                            ? `${id} (${device.common.name})`
                            : id; 

                        sendTo(null, 'getChannelsOf', id, (channelList) => {
                            const channels = JSON.parse(channelList);
                            
                            // add icons for each rule on the sensor
                            const icons = [];
                            for (let i=0; i<channels.length; i++) {
                                const channel = channels[i];
                                sendTo(null, 'getState', `${id}.${channel}.field`, (fieldData) => {
                                    if (channel.common.name != 'META' && channel.common.name != 'INFO') {
                                        const icon = $('<div>', { "class": `opts-installed opts-${id}`, "id": `${id}.${channel.common.name}` }).append(
                                            $('<div>', { "class": "ruleType"}).text(channel.common.name),
                                            $('<div>', { "class": "ruleColumn"}).text(fieldData.val),
                                            $('<i>', { "class": `material-icons right deleteIcons-${id}` }).text("close")
                                        );
                                        icons.push(icon);
                                    }
                                });
                            }

                            let html = $( '<tr>', { "class": "device" }).append(
                                $('<td>', { "style": "white-space: nowrap;" }).text(display),
                                $('<td>', { "style": "white-space: nowrap;" }).append(icons),
                                $('<td>', { "style": "white-space: nowrap;" }).append(
                                    $('<a>', { "class": "btn opts-active opts-add", "id": `${id}-ADD` }).append(
                                        $('<i>', { "class": "material-icons left" }).text('add_task'),
                                        $('<span>', { "class": "translate", "data-lang": "save" }).text('Add')
                                    )
                                ),
                            )

                            $('#devicesList').append(html);
                            $(`#${id}-ADD`).click((e) => { openAddRuleForm(e) });
                            $(`.opts-${id}`).click((e) => { openUpdateRuleForm(e) });
                            $(`.deleteIcons-${id}`).click((e) => { deleteRule(e) });
                        });
                    }
                }
                if (M) M.updateTextFields();
                resolve();
            });
        }
        _getDevices();
    });
}

function openAddRuleForm(e) {
    const targetElementId = e.target.id || e.target.parentElement.id;
    sendTo(null, 'getStatesOf', targetElementId.replace('-ADD',''), (statesList) => {
        const regex = /^[\w-]+\.\d+\.[\w-]+\.[\w-]+$/;
        const states = JSON.parse(statesList).filter(state => regex.test(state._id));
        $(`.fieldindxs`).empty();
        states.forEach(state => {
            if(state.common.name !== "channel") {
                $(`.fieldindxs`).append(
                    $('<option>', {"value": state.common.name}).text(state.common.name)
                );
            }
        });
    });
    $('#device_id').val(targetElementId);
    $('#action_type').val('insert');
    $('#update_rule').addClass('hidden');
    $('#create_rule').removeClass('hidden');
    $('#popup').removeClass('hidden');
}

function openUpdateRuleForm(e) {
    const targetElementId = e.target.id || e.target.parentElement.id;
    sendTo(null, 'getStatesOf', targetElementId, (statesList) => {
        const states = JSON.parse(statesList);
        states.forEach((state) => {
            sendTo(null, 'getState', state._id, (stateObj) => {
                let parts = state._id.split('.').reverse();
                const field = parts[0];
                const regex = /^(\D+)\d*$/;
                parts = regex.exec(parts[1]);
                $(`#${parts[1]}-${field}`).val(JSON.parse(stateObj).val);
                if (M) M.updateTextFields();
                $('#rule').val(parts[1]).change();
                if (M) M.FormSelect.init($('#rule'), {});
            });
        });
    });
    sendTo(null, 'getStatesOf', targetElementId.split('.')[0], (statesList) => {
        const regex = /^[\w-]+\.\d+\.[\w-]+\.[\w-]+$/;
        const states = JSON.parse(statesList).filter(state => regex.test(state._id));
        $(`.fieldindxs`).empty();
        states.forEach(state => {
            if(state.common.name !== "channel") {
                $(`.fieldindxs`).append(
                    $('<option>', {"value": state.common.name}).text(state.common.name)
                );
            }
        });
    });
    $('#device_id').val(targetElementId);
    $('#action_type').val('update');
    $('#update_rule').removeClass('hidden');
    $('#update_rule span').text(targetElementId);
    $('#create_rule').addClass('hidden');
    $('#popup').removeClass('hidden');
}

function makeRuleForm(rule, fields) {
    let section = $('<div>', { "class": rule === 'HEARTBEAT' ? "opts" : "opts hidden", "id": rule });
    fields.forEach(field => {
        if (field.input) section.append(
            $('<div>',{ "class": "row" }).append(
                $('<div>', { "class": "col s12 input-field"}).append(
                    $('<input>', { "type": "text", "class": "rule", "id": `${rule}-${field.name}`, "list": `${rule}-${field.name}indxs`}),
                    $(`<datalist id="${rule}-${field.name}indxs" class="${field.name}indxs">`),
                    $('<label>', { "for": `${rule}-${field.name}`, "class": "translate" }).text(`${field.name}`),
                    $('<span>', { "class": "translate" }).text(`${field.description}`)
                )
            )
        )
    });
    $('#taskforms').append(section);
}

function initRuleFormValues(rules) {
    $('#rule').empty();
    Object.keys(rules).forEach((key) => {
        makeRuleForm(key, rules[key].inputs);
        $('#rule').append(
            $('<option>', { "value": key }).text(rules[key].displayName)
        );
        rules[key].inputs.forEach((rule) => {
            $(`#${key}-${rule.name}`).val(rule.value);
            if (rule.check === 'integer') {
                $(`#${key}-${rule.name}`).keyup(function() {
                    if (this.value === '' || validateInteger(this)) {
                        $(`#${key}-${rule.name}`).removeClass("invalid");
                    }
                    else {
                        $(`#${key}-${rule.name}`).addClass("invalid");
                    }
                });
            }
            if (rule.check === 'float') {
                $(`#${key}-${rule.name}`).keyup(function() {
                    if (this.value === '' || validateFloat(this)) {
                        $(`#${key}-${rule.name}`).removeClass("invalid");
                    }
                    else {
                        $(`#${key}-${rule.name}`).addClass("invalid");
                    }
                });
            }
        });
    });
    if (M) M.updateTextFields();
    if (M) M.FormSelect.init($('#rule'), {});
}

function initRuleFormCheck() {
    function _initRuleFormCheck() {
        let formValid = true;
        [...$('.popup input:visible')].forEach(input => {
            if ($(input).hasClass('invalid') || $(input).val() === '') formValid = false;
        });
        if (formValid) {
            $('.opts-save, .opts-save-close').removeClass('disabled');
        }
        else {
            $('.opts-save, .opts-save-close').addClass('disabled');
        }
    }
    $('.popup input').keyup((e) => { _initRuleFormCheck() });
    $('#rule').change((e) => { setTimeout( _initRuleFormCheck, 200) });
    _initRuleFormCheck();
    $('.opts-save, .opts-save-close').click(async (e) => {
        if ($('action_type').val() === "update") {
            await updateRule();
        }
        else {
            await submitRule();
        }
        if ($(e.target.parentElement).hasClass('opts-save-close')) $('#popup').addClass('hidden');
    });
}

function submitRule() {
    return new Promise((resolve, reject) => {
        if ($('#action_type').val() === 'update') return(resolve(updateRule()));
        if ($('.opts-save').hasClass('disabled')) return(resolve());
        const device_id = $('#device_id').val();
        const rule = $('#rule').val();
        function resetSensorsTab() { 
            $('#devicesList').empty();
            $('#taskforms').empty();
            // setTimeout(() => { 
                initDevices();
            // }, 1000);
        }
        sendTo(null, 'createSettings', `${device_id.replace('-ADD','')}_:_${rule}`, async (chAddr) => {
            const regex = /^rtl_433\.\d+\.(.+\..*)$/
            const parts = regex.exec(chAddr.id);
            if (parts) {
                const devAddr = parts[1];
                const inputs = [...$('.popup input:visible')];
                if (inputs.length !== 0) {
                    for (let i=0; i<inputs.length; i++ ) {
                        const input = inputs[i];
                        const field = input.id.split('-').reverse()[0];
                        if (field && field !== '') {
                            const value = $(input).val();
                            sendTo(null, 'setState', `${devAddr}.${field}_:_${value}`, () => {});
                        }
                    }
                    resolve();
                }
            }
            resetSensorsTab();
            resolve(chAddr);
        });
    });
}

function updateRule() {
    return new Promise((resolve, reject) => {
        if ($('.opts-save').hasClass('disabled')) return(resolve());
        const device_id = $('#device_id').val();
        // populate the data...
        const inputs = [...$('.popup input:visible')];
        if (inputs.length !== 0) {
            for (let i=0; i<inputs.length; i++ ) {
                const input = inputs[i];
                const field = input.id.split('-').reverse()[0];
                if (field && field !== '') {
                    const value = $(input).val();
                    sendTo(null, 'setState', `${device_id}.${field}_:_${value}`, () => {});
                }
            }
            resolve();
        }
        else {
            reject();
        }
    });
}

function deleteRule(e) {
    e.preventDefault();
    e.stopPropagation();
    sendTo(null, 'removeSettings', $(e.target.parentElement).attr('id'), (list) => {
        e.preventDefault()
        $(e.target.parentElement).addClass('hidden');
    });
}

function getVersion() {
    return new Promise((resolve,reject) => {
        const _getVersion = () => { 
            let timeout = setTimeout(function () {
                _getVersion();
            }, 2000);
            sendTo(null, 'rtl_433', '-V', (list) => {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                }
                if (!list.error) {
                    if (!list.stderr || !list.stderr.length) {
                        timeout = setTimeout(function () {
                            _getVersion();
                        }, 1000);
                        return;
                    }
                }
                if (list.error) {
                    $('#rtl_433_version').css('color', 'maroon');
                    if (list.error.code === 126) $('#rtl_433_version').val(_('Could not execute rtl_433, permission errors?'));
                    else if (list.error.code === 127) $('#rtl_433_version').val(_('Could not find rtl_433 executable'));
                    else  $('#rtl_433_version').val(_('General error executing rtl_433'));
                    if (M) M.updateTextFields();
                }
                else {
                    sendTo(null, 'adapterVersion', null, (ver) => {
                        $('#rtl_433_version').css('color', 'unset');
                        let text = '';
                        const line = list.stderr.split('\n')[0];
                        const parts = line.match((/rtl_433\ version\ (.*?)\ branch.*/));
                        const version = parts[1];
                        const thisVer = parseFloat(version.split('-')[0]);
                        const baseVer = 20.02;
                        $('#rtl_433_version').val(`adapter: ${ver}   rtl_433: ${parts[1]}`);
                        if (baseVer > thisVer) $('#rtl_433_version').css('color', 'maroon');
                        if (M) M.updateTextFields();
                    });
                }
                resolve();
            });
        }
        _getVersion();
    });
}

function getSystemConfig() {
    return new Promise((resolve,reject) => {
        socket.emit('getObject', 'system.config', function (err, res) {
            if (err) reject(err);
            resolve(res);
        });
    });
}

function getRules() {
    return new Promise((resolve,reject) => {
        sendTo(null, 'getRules', null, (res) => {
            resolve(JSON.parse(res));
        });
    });
}

function runProduction(val) {
    if (val) {
        $('.pExcludes').attr('disabled',true);
        $('.pIncludes').removeAttr('disabled');
    }
    else {
        $('.pIncludes').attr('disabled',true);
        $('.pExcludes').removeAttr('disabled');
    }
}

function checkProtocol(protocol) {
    let cBox;
    if (parseInt(protocol, 10) > 0) {
        cBox = `#include${protocol}`;
        // if we have positive numbers let's go production
        $('#production').prop('checked',true);
        $('#testing').prop('checked',false);
        runProduction(true);
    }
    else {
        cBox = `#exclude${Math.abs(protocol)}`;
    }
    if (typeof cBox !== undefined) {
        $(cBox).prop('checked',true).change();
        if ($(cBox).parent().parent().parent().hasClass('hiddendiv')) $('#blacklisted').click();
    } 
}

function establishCmdLineToOptionsRelation() {
    let fillDirection = null;

    function forwardCmdLine() {
        if (fillDirection) return;
        else fillDirection = 'forward';
        let options = [];
        // device -d
        const type = $('#deviceType').val();
        if (type !== '') {
            if (type === 'idx') { // integer
                const val = $('#idxData').val();
                if (val !== '') {
                    options = [...options, '-d', val];
                }
            }
            //value="usb" 
            if (type === 'usb') { // ":/dev/" beginning of string
                const val = $('#usbData').val();
                if (val !== '') {
                    options = [...options, '-d', `:${val}`];
                }
            }
            //value="soa" 
            if (type === 'soa') { // string
                const val = $('#soaData').val();
                if (val !== '') {
                    options = [...options, '-d', val];
                }
            }

            //value='tcp'
            if (type === 'tcp') { // rtl_tcp://host:1234
                const val = $('#tcpData').val();
                if (val !== '') {
                    const corrected = val.includes(':') ? val : `${val}:1234`;
                    options = [...options, '-d', `rtl_tcp://${corrected}`];
                }
            }
        }
        // -G 4
        if($('#testing').prop('checked') && $('#blacklisted').prop('checked')) {
            options = [...options, '-G', '4'];
        }
        // protocols
        if ($('#production').prop('checked')) {
            [...$('.pIncludes:checkbox:checked:visible')].forEach((item) => {
                options = [...options, '-R', item.id.replace('include','')];
            });
        }
        else {
            [...$('.pExcludes:checkbox:checked:visible')].forEach((item) => {
                options = [...options, '-R', '-'+item.id.replace('exclude','')];
            });
        }
        // general options
        ['g','t','H','p','s','X','Y','C'].forEach(letter => {
            const arg = $(`#arg_${letter}`).val();
            if (arg !== '') {
                options = [...options, `-${letter}`, arg];
            }
        });
        // frequency 1 or more
        const addF_A = $('#arg_f').val().split(/[,;\s]/);
        addF_A.forEach((val) => {
            if(val !== '') {
                options = [...options, '-f', val];
            }
        });
        // additional data options
        const addPD = $('#arg_Ml').prop('checked');
        if (addPD) {
            options = [...options, `-M`, 'level'];
        }
        const addSD = $('#arg_Mp').prop('checked');
        if (addSD) {
            options = [...options, `-M`, 'protocol'];
        }

        $('#rtl_433_cmd').val($('#rtl_433_cmd').val().split(/\s/)[0]+' -F json '+options.join(' ')).change();
        fillDirection = null;
    }

    function reverseCmdline() {
        if (fillDirection) return;
        else fillDirection = 'reverse';
        const cmdline = $('#rtl_433_cmd').val();
        const cmdArry = cmdline.split(/\s/);
        // clear the protocols before starting
        $('.pIncludes').prop('checked', false);
        $('.pExcludes').prop('checked', false);
        // empty args
        $('.arg').val('');
        // iterate the command line to determine what is checked/filled or not
        for (let j=1; j<cmdArry.length; j++) {
            if (cmdArry[j] === '-d') {
                if (cmdArry.length > j+1) {
                    j++;
                    const device = cmdArry[j];
                    let serviced = false;
                    // tcp
                    let parts = device.match(/rtl_tcp:\/\/(.*)/);
                    if (parts) {
                        serviced = true;
                        $('#deviceType').val('tcp').change();
                        $('#tcpData').val(parts[1]);
                    }
                    // usb port
                    parts = device.match(/:(\/dev\/.*)/);
                    if (parts) {
                        serviced = true;
                        $('#deviceType').val('usb').change();
                        $('#usbData').val(parts[1]);
                    }
                    // device index
                    parts = device.match(/^(\d+)$/);
                    if (parts) {
                        serviced = true;
                        $('#deviceType').val('idx').change();
                        $('#idxData').val(parts[1]);
                    }
                    if (!serviced && device !== '') {
                        $('#deviceType').val('soa').change();
                        $('#soaData').val(device);
                    }
                    if (M) M.FormSelect.init($('#deviceType'), {});
                }
            }
            if (cmdArry[j] === '-R') {
                if (cmdArry.length > j+1) {
                    j++;
                    checkProtocol(cmdArry[j]);
                }
            }
            if (cmdArry[j] === '-G') {
                if (cmdArry.length > j+1) {
                    j++;
                    const protocol = parseInt(cmdArry[j]);
                    if (protocol === 4) $('#blacklisted').click();

                }
            }
            if (cmdArry[j] === '-M') {
                if (cmdArry.length > j+1) {
                    j++;
                    const arg = cmdArry[j];
                    if (arg === 'level') $('#arg_Ml').prop('checked',true);
                    if (arg === 'protocol') $('#arg_Mp').prop('checked',true);
                }
            }
            if (['-g','-t','-H','-p','-s','-X','-Y','-C'].includes(cmdArry[j])) {
                const cmd = cmdArry[j];
                if (cmdArry.length > j+1) {
                    j++;
                    const arg = cmdArry[j];
                    const id = `#arg_${cmd.substring(1)}`;
                    $(id).val(arg);
                    if (M && id === '#arg_C') M.FormSelect.init($(id), {});
                }
            }
            if (cmdArry[j] === '-f') {
                const currVal = $('#arg_f').val();
                if (cmdArry.length > j+1) {
                    j++;
                    const arg = currVal.length > 0 ? `${currVal} ${cmdArry[j]}` : cmdArry[j];
                    $('#arg_f').val(arg);
                }
            }
        }
        if (M) M.updateTextFields();
        fillDirection = null;
    }
    $('.arg').change(() => {forwardCmdLine()});
    $('#rtl_433_cmd').change(() => {reverseCmdline()});
    reverseCmdline();
}

function validateIPAddress(address) {
    var expression = /((^\s*((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])):*\d*\s*$)|(^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?:*\d*\s*$))/;
    return expression.test(address.value);
}

function validateInteger(idx) {
    var expression = /^-*\d+$/;
    return expression.test(idx.value);
}

function validateIntegerPlus(idx) {
    var expression = /^\d+M{0,1}k{0,1}[,;\s]*\d*M{0,1}k{0,1}[,;\s]*\d*M{0,1}k{0,1}[,;\s]*\d*M{0,1}k{0,1}$/;
    return expression.test(idx.value);
}

function validateFloat(num) {
    var expression = /^-*\d+\.?\d*$/;
    return expression.test(num.value);
}

function establishBoundsChecking() {
    // ip address verification 
    $("#tcpData").keyup(function() {
        if (this.value === '' || validateIPAddress(this)) {
            $("#tcpData").removeClass("invalid");
        }
        else {
            $("#tcpData").addClass("invalid");
            
        }
    });
    // integer verification
    ['#idxData', '#arg_H', '#arg_p', '#arg_Y', '#killcheckinterval', '#lifetime'].forEach(id => {
        $(id).keyup(function() {
            if (this.value === '' || validateInteger(this)) {
                $(id).removeClass("invalid");
            }
            else {
                $(id).addClass("invalid");
            }
        })
    });
    // integer plus verification
    ['#arg_f', '#arg_s'].forEach(id => {
        $(id).keyup(function() {
            if (this.value === '' || validateIntegerPlus(this)) {
                $(id).removeClass("invalid");
            }
            else {
                $(id).addClass("invalid");
            }
        })
    });
}

function establishEvents() {
    $('#deviceType').change(e => {
        $('.deviceType').addClass('hiddendiv');
        $(`#${e.target.value}Div`).removeClass('hiddendiv');
    });

    $('#production, #testing').change(e => {
        const checked = e.target.id;
        $(`#${checked}`).prop('checked', true);
        const unchecked = checked === 'production' ? 'testing' : 'production'
        $(`#${unchecked}`).prop('checked', false);
        runProduction(checked === 'production');
    });

    $('#protocolType').change(e => runProduction(e.target.value === 'production'));
    $('#protocolType').change();

    $('#blacklisted').change(e => {
        if (e.target.checked === true) {
            $('.blacklisted').removeClass('hiddendiv');
        }
        else {
            $('.blacklisted').addClass('hiddendiv');
        }
    });

}

function updateConfig(settings, config) {
    if (settings.rtl_433_cmd === 'rtl_433 -F json') {
        if (settings.protocols && settings.protocols !== '') {
            const ports = settings.protocols.split(',');
            ports.forEach((port) => {
                checkProtocol(port);
            });
        }
        if (settings.frequency && settings.frequency !== '') {
            $('#arg_f').val(settings.frequency);
        }
        if (settings.adapterno && settings.adapterno !== '') {
            $('#idxData').val(settings.adapterno);
            $('#deviceType').val('idx');
        }
        const fBox = $('#arg_C');
        const systemMeasureUnit = config.common.tempUnit === '°F' ? 'customary' : 'si';
        if (fBox.val() !== systemMeasureUnit) {
            fBox.val(systemMeasureUnit);
            if (M) M.FormSelect.init(fBox, {});
        }
    }
}

async function initDevices() {
    await getDevices();
    const rules = await getRules();
    initRuleFormValues(rules);
    initRuleFormCheck();
}

async function initializeNonConfigData(settings) {
    const config = await getSystemConfig();
    await getComPorts();
    await getProtocols();
    await getVersion();
    await establishBoundsChecking();
    establishEvents();
    await establishCmdLineToOptionsRelation();
    updateConfig(settings,config);
    initDevices();
    $('#rule').change((e) => {
        $('.opts').addClass('hidden');
        $('#'+e.target.value).removeClass('hidden');
    });
    $('.opts-cancel').click((e) => {
        $('#popup').addClass('hidden');
    });
}