// Game Map handler
// 
'use strict';

const MapGen = require('mapgen.js');


class Gmap {
	constructor(seed) {
		this.map = MapGen.generate(seed);	
	}

	collide(x, y) {
		if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) return 1;
		if (!(this.map.data[y][x] === '.' || this.map.data[y][x] === '*')) return 1;
		return 0;
	}

	getSpawn() {
		return this.map.mobs.find(mob => mob.type === '@');
	}
};


module.exports = Gmap;