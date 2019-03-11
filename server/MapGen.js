// Generate Random Maps
// 
'use strict';


const rand = new function() {
	// George Marsaglia's MWC generator (multiply with carry)
	const CONA = 36969, CONB = 18000, CONZ = 65535;
	const m_z = 0, m_w = 1, t = 2;
	const mem = new Uint32Array(5);
	mem[m_z] = 100, mem[m_w] = 200;
	const seed = (m) => {
		mem[t] = Math.max(m, 1);
		mem[m_z] = mem[t], mem[m_w] = mem[t]+1;
	};
	const rand = () => {
		mem[m_z] = CONA * (mem[m_z] & CONZ) + (mem[m_z] >> 16);
		mem[m_w] = CONB * (mem[m_w] & CONZ) + (mem[m_w] >> 16);
		mem[t] = ((mem[m_z] << 16) + mem[m_w]) / 2;
		return mem[t];
	};
	rand.seed = seed;
	return rand;
};



const MapGen = new function() {
	const width = 50;
	const height = 25;
	const density = 15;
	const defseed = 12345;
	let map = [];
	let mobs = [];
	let seed = defseed;


	// main generator
	this.generate = (nseed) => {
		seed = typeof nseed === 'number' ? nseed : defseed;
		// blank map
		map = [], mobs = [];
		for (let y = 0; y < height; y++) {
			let row = [];
			map.push(row);
			for (let x = 0; x < width; x++)
				row.push(' ');
		}
		// make random rooms
		const rooms = [];
		const mdensity = (height/5 * width/5 * density/100)|0; // room density
		rand.seed(seed);
		// rand.seed(123456);
		for (let j = 0; j < mdensity; j++) {
			let xx = (rand() %  (width/5|0)) * 5;
			let yy = (rand() % (height/5|0)) * 5;
			if (rooms.find(r => r.x === xx && r.y === yy))
				j--;
			else
				rooms.push({ x:xx, y:yy, w:1, h:1 });
		}
		// build rooms
		rooms.forEach(r => d_room(r.x, r.y));
		// connect rooms
		for (let i = 1; i < rooms.length; i++)
			d_connect(rooms[i-1].x+2, rooms[i-1].y+2, rooms[i].x+2, rooms[i].y+2);
		// draw walls
		d_walls();
		// spawning
		s_player();
		s_items();
		s_enemies();
		// return
		// this.show();
		return this.get();
	};

	// get
	this.get = () => {
		return {
			seed: seed,
			width: width,
			height: height,
			level: map.map(r => r.join('')),
			mobs: mobs
		};
	};
	// display
	this.show = () => {
		console.log(`::Generated map with seed ${seed}::`);
		console.log( map.map(r => r.join('')).join('\n') );
	};



	// getters
	const tileat = (x, y) => {
		if (x < 0 || x >= width || y < 0 || y >= height) return null;
		return map[y][x];
	};



	// draw into map object
	// rooms
	const d_room = (x, y) => {
		const size = 5;
		for (let i = 0; i < size; i++)
		for (let j = 0; j < size; j++) {
			const edge = i === 0 || i === size-1 || j === 0 || j === size-1;
			map[y+i][x+j] = edge ? '.' : '.';
		}
	};
	// connecting corridors
	const d_connect = (x1, y1, x2, y2) => {
		const setm = (x, y) => {
			const m = map[y][x];
			if (m === ' ' || m === '#') map[y][x] = '*'
		};
		while (x1 !== x2) {
			setm(x1, y1);
			x1 += Math.sign(x2 - x1);
		}
		while (y1 !== y2) {
			setm(x1, y1);
			y1 += Math.sign(y2 - y1);
		}
	};
	// walls around rooms
	const d_walls = () => {
		for (let y = 0; y < height; y++)
		for (let x = 0; x < width; x++) {
			// put wall next to map boundries
			if (x === 0 || y === 0 || x === width-1 || y === height-1) {
				if (map[y][x] === '.') map[y][x] = '#';
			}
			// 
			if (map[y][x] !== ' ') continue;
			// walls next to '.'
			for (let yy = -1; yy <= 1; yy++)
			for (let xx = -1; xx <= 1; xx++)
				if (tileat(x+xx, y+yy) === '.')
					map[y][x] = '#';
		}
	};



	// spawning
	const s_spawn = () => {
		let x, y, r = 0;
		while (true) {
			x = rand() % width;
			y = rand() % height;
			if (map[y][x] === '.') break;
			if (++r >= 1000) { x = y = 0; break; }
		}
		return { x:x, y:y };
	};
	// spawn player
	const s_player = () => {
		const p = s_spawn();
		p.type = '@';
		mobs.push(p);
	};
	// spawn items 
	const s_items = () => {
		const count = 3 + rand() % 10;
		for (let i = 0; i < count; i++) {
			const item = s_spawn();
			item.type = '$';
			mobs.push(item);
		}
	};
	// spawn enemies
	const s_enemies = () => {
		const count = 3 + rand() % 10;
		for (let i = 0; i < count; i++) {
			const e = s_spawn();
			e.type = 'g';
			mobs.push(e);
		}
	};
};


module.exports = MapGen;