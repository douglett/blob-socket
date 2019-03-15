// useful helper functions
'use strict';

// format date
const fdate = () => {
	const lead = (t) => t >= 10 ? t : `0${t}`;
	const d = new Date();
	const yy = d.getFullYear(),
		mm = lead(d.getMonth()+1),
		dd = lead(d.getDate()),
		h = lead(d.getHours()),
		m = lead(d.getMinutes()),
		s = lead(d.getSeconds());
	return `${yy}-${mm}-${dd} ${h}:${m}:${s}`;
};


const ttlog = (...args) => {
	console.log(`${fdate()}  ${args.join(' ')}`);
};


module.exports = {
	fdate: fdate,
	ttlog: ttlog
};