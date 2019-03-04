// from:
// 	https://medium.com/@martin.sikora/node-js-websocket-simple-chat-tutorial-2def3a841b61
// 
"use strict";
process.title = "blob-socket";
const http = require('http');
const WebSocketServer = require('websocket').server;
const FinalHandler = require('finalhandler');
const ServeStatic = require('serve-static');

const fdate = require('./helpers').fdate;
const Clients = require('./clients');

const PORT = process.env.PORT || 1337;


// basic file server
const staticServer = ServeStatic('./');
const server = http.createServer((request, response) => {
	let done = FinalHandler(request, response);
	staticServer(request, response, done);
});
server.listen(PORT, () => console.log(`${fdate()}  Listening on port ${PORT}`));


// websocket server
const wsServer = new WebSocketServer({ httpServer: server });
wsServer.on('request', (request) => {
	console.log(`${fdate()}  Connection from origin: ${request.origin}`);
	const connection = request.accept(null, request.origin);
	Clients.register(connection);

	connection.on('message', (message) => {
		try {
			// get message data
			if (!message.type === 'utf8') return;
			const msg = JSON.parse(message.utf8Data);
			// handle data
			console.log(`${fdate()}  Message recieved: ${msg.type}`);
			switch (msg.type) {
			case 'map':    Clients.map(connection);  break;
			case 'state':  Clients.state(connection);  break;
			case 'move':   Clients.move(connection, msg.dir);  break;
			}
		} catch(e) {
			console.error(e);
		}
	});

	connection.on('close', (connection) => {
		console.log(`${fdate()}  Peer ${connection.remoteAddress} disconnected`);
		Clients.unregister(connection);
	});
});