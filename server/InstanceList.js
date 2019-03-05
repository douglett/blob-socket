'use strict';
const fdate = require('./helpers.js').fdate;
const MapGen = require('./MapGen.js');

const colorList = [ 'red', 'green', 'blue', 'orange', 'gray' ];


// hold all instances
const InstanceList = module.exports = new function() {
	const list = [];
	
	this.generate = () => {
		const i = new Instance();
		list.push(i);
		return i;
	};
};



// handle the game instance
class Instance {
	constructor() {
		this.id = `game:${Math.random()*1000|0}`;
		this.clients = [];
		this.map = MapGen.generate(12347);
	}


	// handle connections
	register(connection) {
		const client = { connection: connection, id: Math.random()*10000|0, instance: this.id };
		this.clients.push(client);
		connection.on('message', message => this.onmessage(client, message));
		connection.on('close', connection => this.unregister(client));
		this.send(client, 'identity', { id: client.id, instance: client.instance });
	}
	unregister(client) {
		const i = this.clients.indexOf(client);
		this.clients.splice(i, 1);
	}
	onmessage(client, message) {
		// parse
		let msg = {};
		try {
			msg = JSON.parse(message.utf8Data);
		} catch (e) {
			return;
		}
		// handle
		console.log(`${fdate()}  Message recieved: ${msg.type}`);
		switch (msg.type) {
			case 'map':
				this.send(client, 'map', this.map);
				break;
			case 'move':
				this.move(msg.dir);
				this.broadcast('map', this.map);
				break;
		}
	}
	send(client, type, data) {
		client.connection.sendUTF(JSON.stringify({ type: type, data: data }));
	}
	broadcast(type, data) {
		this.clients.forEach(client => this.send(client, type, data));
	}


	// handle game instance
	getPlayer() {
		return this.map.mobs.find(mob => mob.type === '@');
	}
	move(dir) {
		const p = this.getPlayer();
		switch (dir) {
			case 'n':  if (!this.collide(p.x, p.y-1)) p.y--;  break;
			case 's':  if (!this.collide(p.x, p.y+1)) p.y++;  break;
			case 'e':  if (!this.collide(p.x+1, p.y)) p.x++;  break;
			case 'w':  if (!this.collide(p.x-1, p.y)) p.x--;  break;
			case '.':  break;
		}
	}
	collide(x, y) {
		if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) return 1;
		if (!(this.map.level[y][x] === '.' || this.map.level[y][x] === '*')) return 1;
		return 0;
	}
}