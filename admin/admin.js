async function getComPorts() {
    return new Promise((resolve,reject) => {
        let timeout = setTimeout(function () {
            getComPorts();
        }, 2000);

        sendTo(null, 'listSerial', null, function (list) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            if (!list || !list.length) {
                setTimeout(function () {
                    getComPorts();
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
    })
}

async function getProtocols() {
    return new Promise((resolve, reject) => {
        let timeout = setTimeout(function () {
            getProtocols();
        }, 2000);

        sendTo(null, 'rtl_433', '-R', (list) => {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            if (!list.stderr || !list.stderr.length) {
                setTimeout(function () {
                    getProtocols();
                }, 1000);
                return;
            }
            $('#protocolsList').empty();
            const lines = list.stderr.split('\n').filter((line) => line.search((/\s*\[\d*\]\*?\s{1,2}.*/))>=0);
            for (var j = 0; j < lines.length; j++) {
                const parts = lines[j].match((/\s*\[(\d*)\](\*?)\s{1,2}(.*)/));
                const hidden = parts[2] === '*' ? ' hiddendiv blacklisted' : '';
                const color = parts[2] === '*' ? ' color: maroon;' : '';
                let text = `<tr class="device${hidden}" data-id="${parts[1]}">`;
                text += '<td style="white-space: nowrap;">';
                text += `<label for="include${parts[1]}" class="translate">`;
                text += `<input type="checkbox" class="pIncludes value arg" id="include${parts[1]}" disabled />`;
                text += '<span></span>';
                text += '</label>';
                text += '</td>';
                text += '<td style="white-space: nowrap;">';
                text += `<label for="exclude${parts[1]}" class="translate">`;
                text += `<input type="checkbox" class="pExcludes value arg" id="exclude${parts[1]}" />`;
                text += '<span></span>';
                text += '</label>';
                text += '</td>';
                text += `<td style="white-space: nowrap;${color}">${parts[1]}</td>`;
                text += `<td style="white-space: nowrap;${color}">${parts[3]}</td>`;
                text += '</tr>';

                $('#protocolsList').append($(text));
                const cBox = $(`#protocol${parts[1]}`);
            }
            if (M) M.updateTextFields();
            resolve();
        });
    });
}

async function getVersion() {
    return new Promise((resolve,reject) => {
        let timeout = setTimeout(function () {
            getVersion();
        }, 2000);
    
        sendTo(null, 'rtl_433', '-V', (list) => {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            if (!list.error) {
                if (!list.stderr || !list.stderr.length) {
                    setTimeout(function () {
                        getVersion();
                    }, 1000);
                    return;
                }
            }
            if (list.error) {
                $('#rtl_433_version').css('color', 'maroon');
                if (list.error.code === 126) $('#rtl_433_version').val(_('Could not execute rtl_433, permission errors?'));
                else if (list.error.code === 127) $('#rtl_433_version').val(_('Could not find rtl_433 executable'));
                else  $('#rtl_433_version').val(_('General error executing rtl_433'));
            }
            else {
                $('#rtl_433_version').css('color', 'unset');
                let text = '';
                const line = list.stderr.split('\n')[0];
                const parts = line.match((/rtl_433\ version\ (.*?)\ branch.*/));
                const version = parts[1];
                const thisVer = parseFloat(version.split('-')[0]);
                const baseVer = 20.02;
                $('#rtl_433_version').val(parts[1]);
                if (baseVer > thisVer) $('#rtl_433_version').css('color', 'maroon');
            }
            if (M) M.updateTextFields();
            resolve();
        });
    });
}

async function getSystemConfig() {
    return new Promise((resolve,reject) => {
        socket.emit('getObject', 'system.config', function (err, res) {
            if (err) reject(err);
            resolve(res);
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
            [...$('.pIncludes:checkbox:checked')].forEach((item) => {
                options = [...options, '-R', item.id.replace('include','')];
            });
        }
        else {
            [...$('.pExcludes:checkbox:checked')].forEach((item) => {
                options = [...options, '-R', '-'+item.id.replace('exclude','')];
            });
        }
        // general options
        ['g','t','f','H','p','s','X','Y','C'].forEach(letter => {
            const arg = $(`#arg_${letter}`).val();
            if (arg !== '') {
                options = [...options, `-${letter}`, arg];
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
                    const serviced = false;
                    // tcp
                    let parts = device.match(/rtl_tcp:\/\/(.*)/);
                    if (parts) {
                        serviced = true;
                        $('#deviceType').val('tcp');
                        $('#tcpData').val(parts[1]);
                    }
                    // usb port
                    parts = device.match(/:(\/dev\/.*)/);
                    if (parts) {
                        serviced = true;
                        $('#deviceType').val('usb');
                        $('#usbData').val(parts[1]);
                    }
                    // device index
                    parts = device.match(/(\d*)/);
                    if (parts) {
                        serviced = true;
                        $('#deviceType').val('idx');
                        $('#idxData').val(parts[1]);
                    }
                    if (!serviced && device !== '') {
                        $('#deviceType').val('soa');
                        $('#idxData').val(device);
                    }

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
            if (['-g','-t','-f','-H','-p','-s','-X','-Y','-C'].includes(cmdArry[j])) {
                const cmd = cmdArry[j];
                if (cmdArry.length > j+1) {
                    j++;
                    const arg = cmdArry[j];
                    const id = `#arg_${cmd.substring(1)}`;
                    $(id).val(arg);
                    if (M) M.updateTextFields();
                    if (M && id === '#arg_C') M.FormSelect.init($(id), {});
                }
            }
        }
        fillDirection = null;
    }
    $('.arg').change(() => {forwardCmdLine()});
    $('#rtl_433_cmd').change(() => {reverseCmdline()});
    reverseCmdline();
}

function establishBoundsChecking() {
    // ip address verification 
    function validateIPAddress(address) {
        var expression = /((^\s*((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])):*\d*\s*$)|(^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?:*\d*\s*$))/;
        return expression.test(address.value);
    }
    $("#tcpData").keyup(function() {
        if (validateIPAddress(this)) {
            $("#tcpData").removeClass("invalid");
        }
        else {
            $("#tcpData").addClass("invalid");
            
        }
    });
    // integer verification
    function validateIteger(idx) {
        var expression = /^\d+$/;
        return expression.test(idx.value);
    }
    ['#idxData', '#arg_H', '#arg_p', '#arg_Y', '#killcheckinterval', '#lifetime'].forEach(id => {
        $(id).keyup(function() {
            if (validateIteger(this)) {
                $(id).removeClass("invalid");
            }
            else {
                $(id).addClass("invalid");
            }
        })
    });
    // integer plus verification
    function validateItegerPlus(idx) {
        var expression = /^\d+M{0,1}k{0,1}$/;
        return expression.test(idx.value);
    }
    ['#arg_f', '#arg_s'].forEach(id => {
        $(id).keyup(function() {
            if (validateItegerPlus(this)) {
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

async function initializeNonConfigData(settings) {
    const config = await getSystemConfig();
    await getComPorts();
    await getProtocols();
    await getVersion();
    await establishBoundsChecking();
    establishEvents();
    await establishCmdLineToOptionsRelation();
    updateConfig(settings,config);
}