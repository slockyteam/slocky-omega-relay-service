const fs = require('fs');
const { exec, execSync } = require('child_process');

const SharedManager = require('./app/shared_manager.js');
const WebSocket = require('./app/web_socket.js');
const LocalApiServer = require('./app/local_api_server/local_api_server.js');
const Relays = require('./app/relays.js');

require('console-stamp')(console, { pattern: 'dd/mm/yyyy HH:MM:ss.l Z' });

/*
 * Constants
 */

const ProcessFilePath = './process.json';

/*
 * Write process file
 */

const processJson = JSON.stringify({
	pid: process.pid
});  
fs.writeFileSync(ProcessFilePath, processJson);

/*
 * Start
 */

SharedManager.readDeviceSettings();

SharedManager.readBootloaderSettings();

SharedManager.readFirmwareSettings();

SharedManager.readServiceSettings();

SharedManager.findService();

Relays.init();

// Local api server
	
LocalApiServer.init();

// WebSocket

WebSocket.init();