// Game Map handler
// 
'use strict';

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


module.exports = Gmap;