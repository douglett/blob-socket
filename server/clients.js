// manage list of connected clients
const Clients = new function() {
	const fieldWidth = 50;
	const colorList = [ 'red', 'green', 'blue', 'orange', 'gray' ];
	const clientlist = [];


	// connection and client management
	this.register = (connection) => {
		const client = { 
			connection: connection, 
			data: {
				id: Math.random()*10000|0,
				color: colorList[ Math.random()*colorList.length|0 ],
				x: 1, // Math.random()*fieldWidth|0,
				y: 1, //Math.random()*fieldWidth|0
			} 
		};
		clientlist.push(client);
		// send player his own details
		this.send(connection, { type: 'identity', identity: client.data });
		// broadcast new players existance
		this.broadcastState();
		// return current client
		return client;
	};
	this.unregister = (connection) => {
		const index = clientlist.findIndex(client => client.connection === connection);
		clientlist.splice(index, 1);
		this.broadcastState();
	};
	this.getClient = (connection) => {
		let client = clientlist.find(client => client.connection === connection);
		return client ? client : {};
	};
	this.getState = () => {
		const state = [];
		clientlist.forEach(client => state.push(client.data));
		return state;
	};


	// general messaging
	this.send = (connection, msg) => {
		// const data = this.getClient(connection).data;
		const message = JSON.stringify(msg);
		connection.sendUTF(message);
	};
	this.broadcast = (msg) => {
		const message = JSON.stringify(msg);
		clientlist.forEach(client => client.connection.sendUTF(message));
	};
	this.broadcastState = () => {
		clientlist.forEach(client => this.state(client.connection));
	};


	// player commands
	this.state = (connection) => {
		this.send(connection, { type: 'state', state: this.getState() });
	};
	this.move = (connection, dir) => {
		const client = this.getClient(connection);
		const data = client.data;
		switch (dir) {
		case 'n':  if (!Gmap.collide(data.x, data.y-1)) data.y--;  break;
		case 's':  if (!Gmap.collide(data.x, data.y+1)) data.y++;  break;
		case 'e':  if (!Gmap.collide(data.x+1, data.y)) data.x++;  break;
		case 'w':  if (!Gmap.collide(data.x-1, data.y)) data.x--;  break;
		case '.':  break;  // null move - just broadcast client position
		default:  return;
		}
		// this.broadcastState();
		this.broadcast({ type: 'update', client: client.data });
	};
	this.map = (connection) => {
		this.send(connection, { type: 'map', map: Gmap.mapData });
	};
};


const Gmap = new function() {
	const width = 10;
	const height = 10;
	const map = [
		'##########',
		'#........#',
		'#........#',
		'#...##...#',
		'#........#',
		'#........#',
		'#........#',
		'#........#',
		'#........#',
		'##########',
	];

	this.mapData = {
		width: width,
		height: height,
		data: map
	};

	this.collide = (x, y) => {
		if (x < 0 || y < 0 || x >= width || y >= height) return 1;
		if (map[y][x] !== '.') return 1;
		return 0;
	};
};


module.exports = Clients;