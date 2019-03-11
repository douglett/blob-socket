'use strict';
const ttlog = require('./helpers.js').ttlog;
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

	this.cleanup = () => {
		for (let i = list.length-1; i >= 0; i--)
			if (list[i].clients.length === 0) {
				ttlog(`Instance removed: ${list[i].id}`);
				list.splice(i, 1);
			}
	};

	setInterval(this.cleanup, 1000);
};



// handle the game instance
class Instance {
	constructor() {
		this.id = `game:${Math.random()*1000|0}`;
		this.clients = [];
		this.map = MapGen.generate(123456);
		this.stats = {
			level: 1,
			hp: 10,
			str: 1,
			def: 1,
			gold: 0,
			xp: 0,
		};
		ttlog(`Generated map:  id::${this.id}  seed::${this.map.seed}`);
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
		ttlog(`Message recieved: ${msg.type}`);
		switch (msg.type) {
			case 'map':
				this.send(client, 'map', this.map);
				break;
			case 'move':
				this.move(msg.dir);
				this.send(client, 'stats', this.stats);
				this.send(client, 'map', this.map);
				break;
			case 'stats':
				this.send(client, 'stats', this.stats);
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
		let dx = p.x, dy = p.y;
		switch (dir) {
			case 'n':  dy--;  break;
			case 's':  dy++;  break;
			case 'e':  dx++;  break;
			case 'w':  dx--;  break;
			case '.':  break;
			default:   return false;
		}
		if (this.collide(dx, dy)) 
			return false;
		else if (this.attack(dx, dy)) 
			this.moveAI();
		else {
			p.x = dx, p.y = dy;
			this.collect(dx, dy);
			this.moveAI();
		}
	}
	collide(x, y) {
		if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) return 1;
		if (!(this.map.level[y][x] === '.' || this.map.level[y][x] === '*')) return 1;
		return 0;
	}
	collect(x, y) {
		let action = false;
		// attempt to collect each mob
		this.map.mobs.forEach(mob => {
			if (mob.x !== x || mob.y !== y) return;
			if (mob.type === '$') {
				this.stats.gold += Math.random()*10+1|0;
				mob.dead = true;
				action = true;
			}
		});
		// filter dead
		this.map.mobs = this.map.mobs.filter(mob => !mob.dead);
		return action;
	}
	attack(x, y) {
		let action = false;
		// attempt to attack each mob
		this.map.mobs.forEach(mob => {
			if (mob.x !== x || mob.y !== y) return;
			if (mob.type === 'g') {
				this.stats.xp += 5;
				mob.dead = true;
				action = true;
			}
		});
		// filter dead
		this.map.mobs = this.map.mobs.filter(mob => !mob.dead);
		return action;
	}
	moveAI() {
		let action = false;
		const p = this.getPlayer();
		this.map.mobs.forEach(mob => {
			// move goblin
			if (mob.type === 'g') {
			}
		});
		// filter dead
		this.map.mobs = this.map.mobs.filter(mob => !mob.dead);
		return action;
	}
}