// Game Map handler
// 
'use strict';

const MapGen = require('./MapGen');


const Gmap = new function() {
	let map = null;

	this.get = () => map;

	this.collide = (x, y) => {
		if (x < 0 || y < 0 || x >= map.width || y >= map.height) return 1;
		if (!(map.data[y][x] === '.' || map.data[y][x] === '*')) return 1;
		return 0;
	};

	this.getspawn = () => {
		return map.mobs.find(mob => mob.type === '@');
	};
	
	// generate
	map = MapGen.generate(1234);
};


module.exports = Gmap;