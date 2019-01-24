// from:
// 	https://medium.com/@martin.sikora/node-js-websocket-simple-chat-tutorial-2def3a841b61
// 
"use strict";
process.title = "blob-socket";
const http = require('http');
const WebSocketServer = require('websocket').server;
const FinalHandler = require('finalhandler');
const ServeStatic = require('serve-static');


const PORT = process.env.PORT || 1337;


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


// basic file server
const staticServer = ServeStatic("./");
const server = http.createServer((request, response) => {
	let done = FinalHandler(request, response);
	staticServer(request, response, done);
});
server.listen(PORT, () => console.log(`${fdate()}  Listening on port ${PORT}`));


// manage list of connected clients
const clients = new function() {
	const fieldWidth = 50;
	const colorList = [ 'red', 'green', 'blue', 'orange', 'gray' ];
	const clientlist = [];

	this.register = (connection) => {
		clientlist.push({ 
			connection: connection, 
			data: {
				id: Math.random()*10000|0,
				color: colorList[ Math.random()*colorList.length|0 ],
				x: Math.random()*fieldWidth|0,
				y: Math.random()*fieldWidth|0
			} 
		});
		this.move(connection, '.');
	};
	this.unregister = (connection) => {
		const index = clientlist.findIndex(client => client.connection === connection);
		clientlist.splice(index, 1);
	};
	this.getData = (connection) => {
		let client = clientlist.find(client => client.connection === connection);
		return client ? client.data : {};
	};

	this.broadcast = (mdata) => {
		const msg = JSON.stringify(mdata);
		clientlist.forEach(client => client.connection.sendUTF(msg));
	};

	this.getState = () => {
		const state = [];
		clientlist.forEach(client => state.push(client.data));
		return state;
	};

	this.move = (connection, dir) => {
		const data = this.getData(connection);
		switch (dir) {
		case 'n':  if (data.y > 0) data.y--;  break;
		case 's':  if (data.y < fieldWidth-1) data.y++;  break;
		case 'e':  if (data.x < fieldWidth-1) data.x++;  break;
		case 'w':  if (data.x > 0) data.x--;  break;
		case '.':  break;
		// default:  return;
		}
		this.broadcast({ type: 'state', state: this.getState() });
	};
};


// websocket server
const wsServer = new WebSocketServer({ httpServer: server });
wsServer.on('request', (request) => {
	console.log(`${fdate()}  Connection from origin: ${request.origin}`);
	const connection = request.accept(null, request.origin);
	clients.register(connection);

	connection.on('message', (message) => {
		// get message data
		let mdata;
		try {
			if (!message.type === 'utf8') return;
			mdata = JSON.parse(message.utf8Data);
		} catch(e) { }
		// handle data
		console.log(`${fdate()}  Message recieved: ${mdata.type}`);
		switch (mdata.type) {
		case 'move':  clients.move(connection, mdata.dir);  break;
		}
		// clients.broadcast({ type: 'message', text: 'hi!' });
	});

	connection.on('close', (connection) => {
		console.log(`${fdate()}  Peer ${connection.remoteAddress} disconnected`);
		clients.unregister(connection);
	});
});