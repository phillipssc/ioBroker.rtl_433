![Logo](admin/rtl_433.png)
# ioBroker.rtl_433

[![NPM version](http://img.shields.io/npm/v/iobroker.rtl_433.svg)](https://www.npmjs.com/package/iobroker.rtl_433)
[![Downloads](https://img.shields.io/npm/dm/iobroker.rtl_433.svg)](https://www.npmjs.com/package/iobroker.rtl_433)
<!-- ![Number of Installations (latest)](http://iobroker.live/badges/rtl_433-installed.svg)
![Number of Installations (stable)](http://iobroker.live/badges/rtl_433-stable.svg) -->
[![Dependency Status](https://img.shields.io/david/phillipssc/iobroker.rtl_433.svg)](https://david-dm.org/phillipssc/ioBroker.rtl_433)
[![Known Vulnerabilities](https://snyk.io/test/github/phillipssc/ioBroker.rtl_433/badge.svg)](https://snyk.io/test/github/phillipssc/ioBroker.rtl_433)

[![NPM](https://nodei.co/npm/iobroker.rtl_433.png?downloads=true)](https://nodei.co/npm/ioBroker.rtl_433/)

## rtl_433 adapter for ioBroker

rtl_433 adapter for ioBroker

This adapter allows you to integrate data from the airwaves into ioBroker using an inexpensive RTL-SDR USB stick.  These are built around chips originally used to tune in analog TV signals but are now used as software defined radios.  433 MHz is a common frequency as it is open in the US.  The software defined radio is capable of tuning in most of the open frequency bands, the parameters of this adapter allow you to configure the frequency you need.  Untested yet, but you should be able to use multiple USB sticks to monitor multiple frequencies using more than one instance of iobroker.rtl_433.

The reason for the 433 in the name is that the adapter requires the utility [rtl_433](https://github.com/merbanan/rtl_433) to be installed and runnable on the host computer.  The utility site shows all of the protocols it understands, all the remote sensors that can be integrated with this adapter. As is often the case with USB adapters the device might not be ready the first time it tries to start and may compain about LIB_USB or other USB errors, this is not to be generally worried about - it should start with a minute.

This is a work in progress.  I do not have a full set of keys that rtl_433 uses to generate its JSON but I have gone through the test cases on the project collecting most of the possible keys.  If a data type is not recognized it will simply be imported as string/value.  The keys of responses supported can easily be extended by modifying lib/datapoints.js.  Turning on verbose in the settings will show the JSON formatted data from the rtl_433 program.

Note: The meta-data includes an alive state.  This is only pertinent to devices that radio their data frequently like thermometers and not to be a cause for concern on devices that radio their data infrequently like contact sensors.

## Changelog

### 0.0.1
* (Sean Phillips) initial release
### 0.0.2
* initial functional release
### 0.0.3
* many fixes
### 0.1.0
* new schema for objects, signal data, concept of 'alive'
### 0.1.1
* more sensors supported, info.connection implemented, uptime formatted
### 0.1.2
* "include" feature to capture your own then stop the creation of new devices, other coniguration changes
### 0.1.3
* automatically add missing states to existing device, helps future proof the adapter.  Added protocol to INFO, can be used to know what the device is capable of. 
### 1.0.0
* Full package compliance and registration

## License
MIT License

Copyright (c) 2020 Sean Phillips <sean.c.phillips@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.