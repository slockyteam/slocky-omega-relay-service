const { exec } = require('child_process');

const SharedManager = require('./shared_manager.js');

/*
 * Variables
 */

var timeoutTimer;
var relaysStates;

/*
 * Methods
 */

module.exports.init = function() {
	relaysStates = new Array(SharedManager.service.settings.relays.length);
	
	exec('fast-gpio set-output ' + String(SharedManager.service.settings.status_led_gpio_pin), (error, stdout, stderr) => {
	});
	exec('fast-gpio set ' + String(SharedManager.service.settings.status_led_gpio_pin) + ' 1', (error, stdout, stderr) => {
	});
	
	SharedManager.service.settings.relays.forEach(function(relaySettings, index) {
		exec('fast-gpio set-output ' + String(relaySettings.relay_gpio_pin), (error, stdout, stderr) => {
		});
		
		switch (relaySettings.mode) {
			case 'on_and_off':
				module.exports.setRelay(index, relaySettings.default_state);
			break;
			case 'trigger_on':
				module.exports.setRelay(index, false);
			break;
			case 'trigger_off':
				module.exports.setRelay(index, true);
			break;
			default:
			break;
		}
		
		if (relaySettings.feedback_enable == true) {
			exec('fast-gpio set-input ' + String(relaySettings.feedback_gpio_pin), (error, stdout, stderr) => {
			});
		}
	});
};

module.exports.setRelay = function(relayNumber, state) {
	const relaySettings = SharedManager.service.settings.relays[relayNumber];

	exec('fast-gpio set ' + String(relaySettings.relay_gpio_pin) + ' ' + (state == true ? String(relaySettings.gpio_true_value) : String(relaySettings.gpio_false_value)), (error, stdout, stderr) => {
	});
	
	relaysStates[relayNumber] = state;
	
	exec('fast-gpio set ' + String(SharedManager.service.settings.status_led_gpio_pin) + ' ' + (state == true ? '0' : '1'), (error, stdout, stderr) => {
	});
};

module.exports.readRelayFeedback = function(relayNumber, callback) {
	const relaySettings = SharedManager.service.settings.relays[relayNumber];
	
	exec('fast-gpio read ' + String(relaySettings.feedback_gpio_pin), (error, stdout, stderr) => {
		if (stdout == '1') {
			callback(true);
		} else {
			callback(false);
		}
	});
};

module.exports.relaysCurrentStates = function() {
	var array = new Array(SharedManager.service.settings.relays.length);
	
	SharedManager.service.settings.relays.forEach(function(relaySettings, index) {
		array[index] = {
			type: relaySettings.type,
			mode: relaySettings.mode,
			trigger_time: relaySettings.trigger_time,
			state: relaysStates[index]
		};
	});
	
	return array;
};

module.exports.relayOn = function(relayNumber, callback) {
	if (timeoutTimer != null) {
		clearInterval(timeoutTimer);
		timeoutTimer = null;
	}
	
	if (relaysStates[relayNumber] == false) {
		if (SharedManager.service.settings.relays[relayNumber].feedback_enable == false) {
			module.exports.setRelay(relayNumber, true);
			
			callback(null, null);
		} else {
			module.exports.readRelayFeedback(relayNumber, function(state) {
				const previousState = state;
				
				module.exports.setRelay(relayNumber, true);
				
				timeoutTimer = setTimeout(function() {
					module.exports.readRelayFeedback(relayNumber, function(state) {
						if (previousState != state) {
							callback(null, null);
						} else {
							module.exports.setRelay(relayNumber, false);
							
							callback('relay_feedback_error', null);
						}
					});
				}, SharedManager.service.settings.relays[relayNumber].feedback_timout);
			});
		}
	} else {
		callback('relay_already_on', null);
	}
};

module.exports.relayOff = function(relayNumber, callback) {
	if (timeoutTimer != null) {
		clearInterval(timeoutTimer);
		timeoutTimer = null;
	}
	
	if (relaysStates[relayNumber] == true) {
		if (SharedManager.service.settings.relays[relayNumber].feedback_enable == false) {
			module.exports.setRelay(relayNumber, false);
			
			callback(null, null);
		} else {
			module.exports.readRelayFeedback(relayNumber, function(state) {
				const previousState = state;
				
				module.exports.setRelay(relayNumber, false);
				
				timeoutTimer = setTimeout(function() {
					module.exports.readRelayFeedback(relayNumber, function(state) {
						if (previousState != state) {
							callback(null, null);
						} else {
							module.exports.setRelay(relayNumber, true);
							
							callback('relay_feedback_error', null);
						}
					});
				}, SharedManager.service.settings.relays[relayNumber].feedback_timout);
			});
		}
	} else {
		callback('relay_already_off', null);
	}
};

module.exports.triggerRelayOn = function(relayNumber, callbackOn, callbackOff) {
	module.exports.relayOn(relayNumber, function(error) {
		if (error) {
			callbackOn(error, null);
		} else {
			callbackOn(null, null);
			
			timeoutTimer = setTimeout(function() {
				module.exports.relayOff(relayNumber, function(error) {
					callbackOff(error);
				});
			}, SharedManager.service.settings.relays[relayNumber].trigger_time);
		}
	});
};

module.exports.triggerRelayOff = function(relayNumber, callbackOff, callbackOn) {
	module.exports.relayOff(relayNumber, function(error) {
		if (error) {
			callbackOff(error, null);
		} else {
			callbackOff(null, null);
			
			timeoutTimer = setTimeout(function() {
				module.exports.relayOn(relayNumber, function(error) {
					callbackOn(error);
				});
			}, SharedManager.service.settings.relays[relayNumber].trigger_time);
		}
	});
};