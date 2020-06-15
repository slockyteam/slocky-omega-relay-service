const ws = require('ws');
const fs = require('fs');
const { exec, execSync } = require('child_process');
const crypto = require('crypto');

const SharedManager = require('./shared_manager.js');
const SharedFunctions = require('./shared_functions.js');
const Relays = require('./relays.js');

/*
 * Variables
 */

var lastPongDate;
var webSocketConnection;
var timerUpdateData;

/*
 * Methods
 */

function startTimerUpdateData() {
	if (timerUpdateData != null) {
		clearInterval(timerUpdateData);
		timerUpdateData = null;
	}
	
	timerUpdateData = setInterval(function() {
		module.exports.sendUpdateData();
	}, SharedManager.serviceSettings.web_socket_update_data_interval);
};

function stopTimerUpdateData() {
	if (timerUpdateData != null) {
		clearInterval(timerUpdateData);
		timerUpdateData = null;
	}
};

module.exports.webSocketSend = function(json) {		
	if (webSocketConnection != null && webSocketConnection.readyState == ws.OPEN) {
		var cipher = crypto.createCipher('aes-256-cbc', SharedManager.firmwareSettings.crypto_key, SharedManager.firmwareSettings.crypto_iv);
		var encrypted = Buffer.concat([cipher.update(JSON.stringify(json)), cipher.final()]);
		
		webSocketConnection.send(encrypted.toString('hex'));
		
		return true;
	} else {
		return false;
	}
};

module.exports.init = function() {
	module.exports.connect();

	setInterval(function() {
		if (webSocketConnection != null && webSocketConnection.readyState == ws.OPEN) {
			module.exports.webSocketSend({
				command: 'service_ping',
				service_alias: SharedManager.service.service_alias,
				service_type: SharedManager.service.service_type,
				service_folder: SharedManager.service.service_folder,
			  	device_identifier: SharedManager.deviceSettings.device_identifier
			});
		}	
	}, SharedManager.serviceSettings.web_socket_ping_interval);
	
	setInterval(function() {
		if (lastPongDate != null) {
			const seconds = (((new Date()).getTime() - lastPongDate.getTime()) / 1000);
				
			if (seconds > 30) {
				lastPongDate = null;
				
				if (webSocketConnection != null) {
					webSocketConnection.terminate();
					webSocketConnection = null;
				}
			}
		}
	
		if (webSocketConnection == null) {
			module.exports.connect();
		}
	}, SharedManager.serviceSettings.web_socket_reconnect_interval);
};

module.exports.connect = function() {
	function webSocketConnect() {		
		webSocketConnection = new ws(SharedManager.deviceSettings.web_socket_url, {
			origin: SharedManager.deviceSettings.api_server_url
		});
		
		webSocketConnection.on('open', function() {
			console.log('WebSocket: connected to server.');
			
			module.exports.webSocketSend({
				command: 'service_connect',
				service_alias: SharedManager.service.service_alias,
				service_type: SharedManager.service.service_type,
				service_folder: SharedManager.service.service_folder,
			  	device_identifier: SharedManager.deviceSettings.device_identifier,
			  	service_version: SharedManager.serviceSettings.service_version,
			  	manufacturer: SharedManager.service.manufacturer,
			  	local_api_server_port: SharedManager.service.local_api_server_port,
			  	data: {
					relays: Relays.relaysCurrentStates()
				}
			});
			
			lastPongDate = new Date();
			
			startTimerUpdateData();
		});
	
		webSocketConnection.on('close', function(error) {
			if (error == 3001) {
				console.error('WebSocket: service already exists.');
			} else if (error == 3002) {
				console.error('WebSocket: error adding service.');
			} else {
				console.error('WebSocket: closed.');
			}
			
			webSocketConnection = null;
			
			stopTimerUpdateData();
		});
		
		webSocketConnection.on('error', function(error) {
		    console.error('WebSocket: ' + error);
		});
	
		webSocketConnection.on('message', function(message) {
		 	var json;
			
			try {
				var decipher = crypto.createDecipher('aes-256-cbc', SharedManager.firmwareSettings.crypto_key, SharedManager.firmwareSettings.crypto_iv);
				var decrypted = Buffer.concat([decipher.update(Buffer.from(message, 'hex')), decipher.final()]);
				
				json = JSON.parse(decrypted.toString());
			} catch (error) {
			}

	 		if (json != null) {
				if (command = json.command) {
					json.device_identifier = SharedManager.deviceSettings.device_identifier;
					json.service = SharedManager.serviceSettings.service;
					
					switch (command) {
						case 'pong': {
							console.log('pong');
							
							lastPongDate = new Date();
							break;
						}
						case 'save_service_settings': {
							SharedFunctions.saveServiceSettings(json.data, function(error, results) {
								if (error) {
									json.error = error;
								
									module.exports.webSocketSend(json);
								} else {
									json.data =  null;
								
									module.exports.webSocketSend(json);
									
									Relays.init();
									
									module.exports.sendUpdateData();
								}
							});
							break;
						}
						case 'load_service_settings': {
							SharedFunctions.loadServiceSettings(function(error, results) {
								if (error) {
									json.error = error;
								
									module.exports.webSocketSend(json);
								} else {
									json.results =  results;
								
									module.exports.webSocketSend(json);
								}
							});
							break;
						}
						case 'relay_on': {
							var relayNumber = 0;
	
							if (json.relay_number != null && typeof(json.relay_number) == 'number') {
								relayNumber = json.relay_number;
							}
							
							SharedFunctions.relayOn(relayNumber, function(error) {
								if (error) {
									json.error = error;
								
									module.exports.webSocketSend(json);
								} else {
									const currentObject = Relays.relaysCurrentStates()[relayNumber];
			
									json.results = {
										relay_number: relayNumber,
										mode: currentObject.mode,
										trigger_time: currentObject.trigger_time,
										state: currentObject.state
									};
			
									module.exports.webSocketSend(json);
								}
								
								module.exports.sendUpdateData();
							}, function() {
								module.exports.sendUpdateData();
							});
							break;
						}
						case 'relay_off': {
							var relayNumber = 0;
	
							if (json.relay_number != null && typeof(json.relay_number) == 'number') {
								relayNumber = json.relay_number;
							}
							
							SharedFunctions.relayOff(relayNumber, function(error) {
								if (error) {
									json.error = error;
								
									module.exports.webSocketSend(json);
								} else {
									const currentObject = Relays.relaysCurrentStates()[relayNumber];
			
									json.results = {
										type: currentObject.type,
										relay_number: relayNumber,
										mode: currentObject.mode,
										trigger_time: currentObject.trigger_time,
										state: currentObject.state
									};
									
									module.exports.webSocketSend(json);
								}
								
								module.exports.sendUpdateData();
							}, function() {
								module.exports.sendUpdateData();
							});
							break;
						}
						default: {
							module.exports.webSocketSend(json);
							break;
						}
					}
				}
			}
		});
	};
	
	SharedManager.checkInternetConnection(function(error) {
		if (error == null) {
			webSocketConnect();
		} else {
			console.log(error);
			
			webSocketConnection == null;
		}
	});
};

module.exports.closeConnection = function() {
	if (webSocketConnection != null && webSocketConnection.readyState == ws.OPEN) {
		webSocketConnection.close();
		webSocketConnection = null;
		
		stopTimerUpdateData();
	}
};

module.exports.sendUpdateData = function() {
	module.exports.webSocketSend({
		command: 'update_service_data',
		data: {
			relays: Relays.relaysCurrentStates()
		}
	});
};

module.exports.isConnected = function() {
	if (webSocketConnection != null && webSocketConnection.readyState == ws.OPEN) {
		return true;
	} else {
		return false;
	}
};