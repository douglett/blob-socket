'use strict';
const ttlog = require('./utils.js').ttlog;
const MapGen = require('./MapGen.js');

const colorList = [ 'red', 'green', 'blue', 'orange', 'gray' ];



// hold all instances
const InstanceList = module.exports = new function() {
	// instance list
	const list = [];
	// methods
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
	// routine cleanup
	setInterval(this.cleanup, 1000);
};



// handle the game instance
class Instance {
	constructor() {
		this.id = `game:${Math.random()*1000|0}`;
		this.clients = [];
		this.map = MapGen.generate(123456);
		ttlog(`Generated map:  id::${this.id}  seed::${this.map.seed}`);
		// player stats
		this.stats = {
			level: 1,
			str: 1,
			def: 1,
			xp: 0,
			gold: 0,
			maxhp: 5,
			hp: 5,
		};
		this.inventory = [
			{ name: 'potion', id: 123 },
			{ name: 'potion', id: 124 },
			{ name: 'potion', id: 125 },
		];
		// enemy stats
		this.map.mobs.forEach(mob => {
			mob.hp = 1;
			if (mob.type === 'g') mob.hp = 2;
		});
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
		if (i > -1) this.clients.splice(i, 1);
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
				// this.send(client, 'map', this.map);
				this.sendMap();
				break;
			case 'move':
				this.move(msg.dir);
				// this.send(client, 'status', { stats: this.stats, inventory: this.inventory });
				// this.send(client, 'map', this.map);
				this.sendFullStatus();
				break;
			case 'status':
				// this.send(client, 'status', { stats: this.stats, inventory: this.inventory });
				this.sendStatus();
				break;
			case 'item':
				this.useItem(msg.id);
				// this.send(client, 'status', { stats: this.stats, inventory: this.inventory });
				this.sendStatus();
				break;
		}
	}
	send(client, type, data) {
		client.connection.sendUTF(JSON.stringify({ type: type, data: data }));
	}
	broadcast(type, data) {
		this.clients.forEach(client => this.send(client, type, data));
	}



	// sending info
	sendStatus() {
		this.broadcast('status', { stats: this.stats, inventory: this.inventory });
	}
	sendMap() {
		this.broadcast('map', this.map);
	}
	sendFullStatus() {
		this.sendMap();
		this.sendStatus();
	}



	// utils
	getPlayer() {
		return this.map.mobs.find(mob => mob.type === '@');
	}
	getMob(x, y) {
		return this.map.mobs.find(mob => mob.x === x && mob.y === y);
	}
	collide(x, y) {
		// map geometry collision
		if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) return 1;
		if (this.map.level[y][x] === ' ' || this.map.level[y][x] === '#') return 1;
		// mob collision
		if (this.map.mobs.some(mob => mob.x === x && mob.y === y && ['g'].indexOf(mob.type) > -1)) return 2;
		// mob there, but no collision
		if (this.map.mobs.some(mob => mob.x === x && mob.y === y && mob.type === '$')) return 3;
		// player collision
		if (this.map.mobs.some(mob => mob.x === x && mob.y === y && mob.type === '@')) return 4;
		// nothing
		return 0;
	}
	clearDead() {
		this.map.mobs = this.map.mobs.filter(mob => mob.hp > 0);
	}



	// player actions
	die() {
		this.broadcast('message', `you die.`);
		this.sendFullStatus();
		this.clients.forEach(client => client.connection.close());
	}
	move(dir) {
		const p = this.getPlayer();
		let xx = p.x, yy = p.y;
		switch (dir) {
			case 'n':  yy--;  break;
			case 's':  yy++;  break;
			case 'e':  xx++;  break;
			case 'w':  xx--;  break;
			case '.':  break;
			default:   return false;
		}
		switch (this.collide(xx, yy)) {
			case 0:  p.x = xx, p.y = yy;  break;
			case 1:  return;  // no move
			case 2:  this.attack(this.getMob(xx, yy));  break;
			case 3:  this.activate(this.getMob(xx, yy));  p.x = xx, p.y = yy;  break;
			case 4:  break;  // player - just ignore
		}
		this.clearDead();
		this.moveAI();
		this.clearDead();
	}
	attack(defender) {
		if (defender.type === 'g') {
			defender.hp--;
			this.broadcast('message', `attacked goblin for 1 damage.`);
			if (defender.hp <= 0) {
				this.stats.xp += 5;
				this.broadcast('message', `goblin dies. gained 5 xp.`);
			}
		}
	}
	defend(attacker) {
		this.stats.hp -= 1;
		this.broadcast('message', `goblin attacked you for 1 damage.`);
		if (this.stats.hp <= 0) this.die();
	}
	activate(mob) {
		if (mob.type === '$') {
			mob.hp = 0;
			this.stats.gold += 3;
			this.broadcast('message', `gained 3 gold.`);
		}
	}
	useItem(id) {
		const item = this.inventory.find(i => i.id === id);
		if (!item) return;
		else if (item.name === 'potion') {
			this.stats.hp = Math.min(this.stats.hp + 5, this.stats.maxhp);
			this.inventory.splice(this.inventory.findIndex(i => i.id === id), 1);
			this.broadcast('message', `used potion. you gain 5 hp.`);
		}
	}



	// enemy actions
	moveAI() {
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
				const move = (mob, x, y) => {
					switch (this.collide(mob.x+x, mob.y+y)) {
						case 0:  mob.x += x, mob.y += y;  return true;
						case 1: case 2: case 3:  return false;
						case 4:  this.defend(mob);  return true;
					}
				};
				// try move
				if      (dy > 0 && move(mob, 0, +1)) ;
				else if (dy < 0 && move(mob, 0, -1)) ;
				else if (dx > 0 && move(mob, +1, 0)) ;
				else if (dx < 0 && move(mob, -1, 0)) ;
			}
		});
	}
}