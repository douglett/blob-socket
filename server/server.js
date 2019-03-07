// from:
// 	https://medium.com/@martin.sikora/node-js-websocket-simple-chat-tutorial-2def3a841b61
// 
"use strict";
process.title = "blob-socket";
const http = require('http');
const WebSocketServer = require('websocket').server;
const FinalHandler = require('finalhandler');
const ServeStatic = require('serve-static');

const fdate = require('./helpers.js').fdate;
const InstanceList = require('./InstanceList.js');

const PORT = process.env.PORT || 1337;


// basic file server
const staticServer = ServeStatic('./static');
const server = http.createServer((request, response) => {
	let done = FinalHandler(request, response);
	staticServer(request, response, done);
});
server.listen(PORT, () => console.log(`${fdate()}  Listening on port ${PORT}`));


// websocket server
const wsServer = new WebSocketServer({ httpServer: server });
wsServer.on('request', (request) => {
	// accept new connection
	console.log(`${fdate()}  Connection from origin: ${request.origin}`);
	const connection = request.accept(null, request.origin);
	// just generate new instance
	const instance = InstanceList.generate();
	instance.register(connection);
});
wsServer.on('error', (error) => {
	// report and squash errors
	console.log(`${fdate()}  Websocket error: ${error}`);
});