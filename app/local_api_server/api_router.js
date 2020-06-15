const express = require('express');
const expressListEndpoints = require('express-list-endpoints');
const { exec, execSync } = require('child_process');

const SharedManager = require('./../shared_manager.js');
const SharedFunctions = require('./../shared_functions.js');
const WebSocket = require('./../web_socket.js');
const Relays = require('./../relays.js');

/**
 * Variables
 */

var router = express.Router();

/**
 * Router
 */

// Home page

router.get('/', function(req, res) {
	return res.status(200).send(expressListEndpoints(router));
});

router.get('/service_info', function(req, res) {
	var results = {
		status: WebSocket.isConnected() ? 'online' : 'offline',
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
	};
	
	return res.status(200).send(results);
});

router.get('/relays', function(req, res) {
	return res.status(200).send(Relays.relaysCurrentStates());
});

router.put('/relay_on', function(req, res) {
	var relayNumber = 0;
	
	if (req.query.relay_number != null || req.body.relay_number != null) {
		relayNumber = parseInt(req.query.relay_number || req.body.relay_number);
	}
	
	SharedFunctions.relayOn(relayNumber, function(error) {
		if (error) {
			res.status(500).send({
				error: error
			});
		} else {
			const currentObject = Relays.relaysCurrentStates()[relayNumber];
			
			res.status(200).send({
				type: currentObject.type,
				relay_number: relayNumber,
				mode: currentObject.mode,
				trigger_time: currentObject.trigger_time,
				state: currentObject.state
			});
		}
		
		WebSocket.sendUpdateData();
		
		var commandUserId = null;
		
		if (req.query.command_user_id != null || req.body.command_user_id != null) {
			commandUserId = req.query.command_user_id || req.body.command_user_id;
		}
		
		WebSocket.webSocketSend({
			command: 'save_log',
			log: {
				type: (error != null ? 'error' : 'success'),
				description_localization_key: 'relay_on',
				command_user_id: commandUserId,
				error: error
			}
		});
	});
});

router.put('/relay_off', function(req, res) {
	var relayNumber = 0;
	
	if (req.query.relay_number != null || req.body.relay_number != null) {
		relayNumber = parseInt(req.query.relay_number || req.body.relay_number);
	}
	
	SharedFunctions.relayOff(relayNumber, function(error) {
		if (error) {
			res.status(500).send({
				error: error
			});
		} else {
			const currentObject = Relays.relaysCurrentStates()[relayNumber];
			
			res.status(200).send({
				type: currentObject.type,
				relay_number: relayNumber,
				mode: currentObject.mode,
				trigger_time: currentObject.trigger_time,
				state: currentObject.state
			});
		}
		
		WebSocket.sendUpdateData();
		
		var commandUserId = null;
		
		if (req.query.command_user_id != null || req.body.command_user_id != null) {
			commandUserId = req.query.command_user_id || req.body.command_user_id;
		}
		
		WebSocket.webSocketSend({
			command: 'save_log',
			log: {
				type: (error != null ? 'error' : 'success'),
				description_localization_key: 'relay_off',
				command_user_id: commandUserId,
				error: error
			}
		});
	});
});

router.get('/service_settings', function(req, res) {
	SharedFunctions.loadServiceSettings(function(error, results) {
		if (error) {
			return res.status(500).send({
				error: error
			});
		} else {
			return res.status(200).send(results);
		}
	});
});

router.post('/service_settings', function(req, res) {
	SharedFunctions.saveServiceSettings(req.body, function(error) {
		if (error) {
			return res.status(500).send({
				error: error
			});
		} else {
			return res.status(200).send();
		}
	});
});

/**
 * Module exports
 */

module.exports = router;
