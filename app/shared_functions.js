const { exec, execSync } = require('child_process');
const merge = require('merge');
const fs = require('fs');

const SharedManager = require('./shared_manager.js');
const Relays = require('./relays.js');

/*
 * Methods
 */

module.exports.loadServiceSettings = function(callback) {
	var serviceSettings = SharedManager.service.settings;
	
	callback(null, serviceSettings);
};

module.exports.saveServiceSettings = function(data, callback) {
	if (data != null) {
		SharedManager.writeServiceSettings(data);
		
		return callback(null, null);
	} else {
		return callback('missing_parameters', null);
	}
};

module.exports.relayOn = function(relayNumber, callback, callback2) {
	if (relayNumber != null) {
		if (relayNumber < SharedManager.service.settings.relays.length) {
			const relaySettings = SharedManager.service.settings.relays[relayNumber];
			
			switch (relaySettings.mode) {
				case 'on_and_off': 
					Relays.relayOn(relayNumber, function(error) {
						if (error) {
							callback(error, null);
						} else {
							callback(null, null);
						}
					});
				break;
				case 'trigger_on': 
					Relays.triggerRelayOn(relayNumber, function(error) {
						if (error) {
							callback(error, null);
						} else {
							callback(null, null);
						}
					}, function() {
						if (callback2 != null) {
							callback2();
						}
					});
				break;
				default:
					return callback('command_relay_mode_not_supported', null);
				break;
			}
		} else {
			return callback('wrong_relay_number', null);
		}
	} else {
		return callback('missing_parameters', null);
	}
};

module.exports.relayOff = function(relayNumber, callback, callback2) {
	if (relayNumber != null) {
		if (relayNumber < SharedManager.service.settings.relays.length) {
			const relaySettings = SharedManager.service.settings.relays[relayNumber];
			
			switch (relaySettings.mode) {
				case 'on_and_off': 
					Relays.relayOff(relayNumber, function(error) {
						if (error) {
							callback(error, null);
						} else {
							callback(null, null);
						}
					});
				break;
				case 'trigger_off': 
					Relays.triggerRelayOff(relayNumber, function(error) {
						if (error) {
							callback(error, null);
						} else {
							callback(null, null);
						}
					}, function() {
						if (callback2 != null) {
							callback2();
						}
					});
				break;
				default:
					return callback('command_relay_mode_not_supported', null);
				break;
			}
		} else {
			return callback('wrong_relay_number', null);
		}
	} else {
		return callback('missing_parameters', null);
	}
};