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
	getMob(x, y) {
		return this.map.mobs.find(mob => mob.x === x && mob.y === y);
	}
	move(dir) {
		const p = this.getPlayer();
		let xx = p.x, yy = p.y;
		switch (dir) {
			case 'n':  yy--;  break;
			case 's':  yy++;  break;
			case 'e':  xx++;  break;
			case 'w':  xx--;  break;
			// case '.':  break;
			default:   return false;
		}
		switch (this.collide(xx, yy)) {
			case 0:  p.x = xx, p.y = yy;  break;
			case 1:  return;  // no move
			case 2:  this.attack(p, this.getMob(xx, yy));  break;
			case 3:  this.activate(this.getMob(xx, yy));  p.x = xx, p.y = yy;  break;
		}
		this.clearDead();
		this.moveAI();
		this.clearDead();
	}
	collide(x, y) {
		// map geometry collision
		if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) return 1;
		if (this.map.level[y][x] === ' ' || this.map.level[y][x] === '#') return 1;
		// mob collision
		if (this.map.mobs.some(mob => mob.x === x && mob.y === y && ['g', '@'].indexOf(mob.type) > -1)) return 2;
		// mob there, but no collision
		if (this.map.mobs.some(mob => mob.x === x && mob.y === y && mob.type === '$')) return 3;
		// nothing
		return 0;
	}
	attack(attacker, defender) {
		defender.dead = true;
		this.stats.xp += 5;
	}
	activate(mob) {
		mob.dead = true;
		this.stats.gold += 3;
	}
	clearDead() {
		this.map.mobs = this.map.mobs.filter(mob => !mob.dead);
	}
	moveAI() {
		let action = false;
		const p = this.getPlayer();
		this.map.mobs.forEach(mob => {
			// move goblin
			if (mob.type === 'g') {
				// ignore player if too far aways
				const dist = Math.sqrt((mob.x - p.x)**2 + (mob.y - p.y)**2);
				if (dist > 4) return;
				// find candidate move direction
				const dx = p.x - mob.x;
				const dy = p.y - mob.y;
				let xx = mob.x, yy = mob.y;
				// try move
				if      (dy > 0 && !this.collide(mob.x, mob.y+1)) mob.y++;
				else if (dy < 0 && !this.collide(mob.x, mob.y-1)) mob.y--;
				else if (dx > 0 && !this.collide(mob.x+1, mob.y)) mob.x++;
				else if (dx < 0 && !this.collide(mob.x-1, mob.y)) mob.x--;
			}
		});
		// filter dead
		this.map.mobs = this.map.mobs.filter(mob => !mob.dead);
		return action;
	}
}