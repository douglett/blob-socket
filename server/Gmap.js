// Game Map handler
// 
'use strict';

const MapGen = require('./MapGen');


const Gmap = new function() {
	let width = 10;
	let height = 10;
	let map = [
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

	this.get = () => ({
		width: width,
		height: height,
		data: map
	});

	this.collide = (x, y) => {
		if (x < 0 || y < 0 || x >= width || y >= height) return 1;
		if (!(map[y][x] === '.' || map[y][x] === '*')) return 1;
		return 0;
	};

	this.getspawn = () => {
		let x, y, r = 0;
		while (true) {
			x = Math.random()*width|0;
			y = Math.random()*height|0;
			if (map[y][x] === '.') break;
			if (++r >= 1000) { x = y = 0; break; }
		}
		return { x:x, y:y };
	};

	// generate
	const generate = () => {
		map = MapGen.generate(1234);
		height = map.length;
		width = map[0].length;
	};
	generate();
};


module.exports = Gmap;