module.exports = {
    cmd:           {type: 'number',  role: 'value'},
    tristate:      {type: 'string',  role: 'value'},
    battery_ok:    {type: 'number',  role: 'value.battery'},   
    humidity:      {type: 'number',  role: 'value.humidity',  unit: '%'},
    temperature_C: {type: 'number',  role: 'value.temperature', unit: '°C'},
    temperature_F: {type: 'number',  role: 'value.temperature', unit: '°F'},
    pressure_inHg: {type: 'number',  role: 'value.pressure',  unit: 'inHg'},
    pressure_hPa:  {type: 'number',  role: 'value.pressure',  unit: 'P'},
    time:          {type: 'string',  role: 'info'},           
    channel:       {type: 'string',  role: 'value'},           
};
