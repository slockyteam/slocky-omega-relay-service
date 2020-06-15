const fs = require('fs');
const { exec, execSync } = require('child_process');
const checkInternetConnected = require('check-internet-connected');
const path = require('path');
const merge = require('merge');

/*
 * Constants
 */

module.exports.deviceSettingsFilePath = '/root/device_settings.json';
module.exports.bootloaderSettingsFilePath = '/root/bootloader/settings.json';
module.exports.firmwareSettingsFilePath = '/root/firmware/settings.json';
module.exports.serviceSettingsFilePath = 'settings.json';

/*
 * Variables
 */

var appDir = path.dirname(require.main.filename);
module.exports.serviceFolder = appDir.split(path.sep).pop();
				
/*
 * Methods
 */

module.exports.findService = function() {
	if (module.exports.deviceSettings != null) {
		module.exports.service = module.exports.deviceSettings.services.find(function(service) {
			if (service.service_folder == module.exports.serviceFolder) {
				return service;
			} else {
				return null;
			}
		});
	}
};

module.exports.checkInternetConnection = function(callback) {
    const config = {
    	timeout: 2000,
		retries: 3,
		domain: 'google.com'
	};
	
    checkInternetConnected(config).then(() => {
		callback();        
    }).catch((error) => {
		callback(error);
    });
};

module.exports.readDeviceSettings = function() {
	if (fs.existsSync(module.exports.deviceSettingsFilePath)) {
		try {
			const rawdata = fs.readFileSync(module.exports.deviceSettingsFilePath, 'utf8');
			module.exports.deviceSettings = (rawdata != null) ? JSON.parse(rawdata) : null;
		} catch (exception) {
		}
	}

	if (module.exports.deviceSettings == null) {
		throw new Error('Error reading device settings!');
	}
};

module.exports.readBootloaderSettings = function() {
	if (fs.existsSync(module.exports.bootloaderSettingsFilePath)) {
		try {
			const rawdata = fs.readFileSync(module.exports.bootloaderSettingsFilePath, 'utf8');
			module.exports.bootloaderSettings = (rawdata != null) ? JSON.parse(rawdata) : null;
		} catch (exception) {
		}
	}

	if (module.exports.bootloaderSettings == null) {
		throw new Error('Error reading bootloader settings!');
	}
};

module.exports.readFirmwareSettings = function() {
	if (fs.existsSync(module.exports.firmwareSettingsFilePath)) {
		try {
			const rawdata = fs.readFileSync(module.exports.firmwareSettingsFilePath, 'utf8');
			module.exports.firmwareSettings = (rawdata != null) ? JSON.parse(rawdata) : null;
		} catch (exception) {
		}
	}

	if (module.exports.firmwareSettings == null) {
		throw new Error('Error reading firmware settings!');
	}
};

module.exports.readServiceSettings = function() {
	if (fs.existsSync(module.exports.serviceSettingsFilePath)) {
		try {
			const rawdata = fs.readFileSync(module.exports.serviceSettingsFilePath, 'utf8');
			module.exports.serviceSettings = (rawdata != null) ? JSON.parse(rawdata) : null;
		} catch (exception) {
		}
	}

	if (module.exports.serviceSettings == null) {
		throw new Error('Error reading service settings!');
	}
};

module.exports.writeDeviceSettings = function(data) {
	module.exports.deviceSettings = merge(module.exports.deviceSettings, data);
	
	fs.writeFile(module.exports.deviceSettingsFilePath, JSON.stringify(module.exports.deviceSettings), function(error) {
		execSync('sync');
	});
};

module.exports.writeServiceSettings = function(data) {
	var deviceSettings = module.exports.deviceSettings;
		
	var newService = module.exports.service;
	newService.settings = merge(module.exports.service.settings, data);
	module.exports.service = newService;
	
	var services = deviceSettings.services;
	var index = null;
	
	for (var i = 0; i < services.length; i++) {
		if (services[i].service_folder == module.exports.service.service_folder) {
			index = i;
			break;
		}
	}
	
	if (index != null) {
		services.splice(index, 1);
		
		services.push(newService);
		
		deviceSettings.services = services;
		
		module.exports.writeDeviceSettings(deviceSettings);
		
		module.exports.readServiceSettings();
	}
};