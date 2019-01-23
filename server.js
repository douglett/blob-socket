// from:
// 	https://medium.com/@martin.sikora/node-js-websocket-simple-chat-tutorial-2def3a841b61
// 
"use strict";
process.title = "blob-socket";
const http = require('http');
const WebSocketServer = require('websocket').server;
const FinalHandler = require('finalhandler');
const ServeStatic = require('serve-static');


const PORT = process.env.PORT || 8080;
const clients = [];


function fdate() {
	const lead = (t) => t >= 10 ? t : `0${t}`;
	const d = new Date();
	const yy = d.getFullYear(),
		mm = lead(d.getMonth()+1),
		dd = lead(d.getDate()),
		h = lead(d.getHours()),
		m = lead(d.getMinutes()),
		s = lead(d.getSeconds());
	return `${yy}-${mm}-${dd} ${h}:${m}:${s}`;
}

function broadcast(mdata) {
	const msg = JSON.stringify(mdata);
	clients.forEach(client => client.sendUTF(msg));
}


// basic file server
const staticServer = ServeStatic("./");
const server = http.createServer((request, response) => {
	let done = FinalHandler(request, response);
	staticServer(request, response, done);
});
server.listen(PORT, () => console.log(`${fdate()}  Listening on port ${PORT}`));


// websocket server
var wsServer = new WebSocketServer({ httpServer: server });
wsServer.on('request', (request) => {
	console.log(`${fdate()}  Connection from origin: ${request.origin}`);
	const connection = request.accept(null, request.origin);
	clients.push(connection);

	connection.on('message', (message) => {
		// console.log(`${fdate()}  Peer ${connection.remoteAddress} connected`);
		if (!message.type === 'utf8') return;
		let mdata;
		try {
			mdata = JSON.parse(message.utf8Data);
		} catch(e) {
			return;
		}
		console.log(`${fdate()}  Message: ${mdata.text}`);
		broadcast({ text: 'hi!' });
	});

	connection.on('close', (connection) => {
		console.log(`${fdate()}  Peer ${connection.remoteAddress} disconnected`);
		clients.splice( clients.indexOf(connection), 1 );  // erase connection
	});
});