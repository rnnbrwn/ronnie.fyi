export function timeAgo(date: Date): string {
	const now = new Date();
	const seconds = Math.floor((now.valueOf() - date.valueOf()) / 1000);
	const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

	const units: [Intl.RelativeTimeFormatUnit, number][] = [
		['year', 60 * 60 * 24 * 365],
		['month', 60 * 60 * 24 * 30],
		['week', 60 * 60 * 24 * 7],
		['day', 60 * 60 * 24],
		['hour', 60 * 60],
		['minute', 60],
	];

	for (const [unit, value] of units) {
		const count = Math.floor(seconds / value);
		if (count >= 1) return rtf.format(-count, unit);
	}

	return rtf.format(0, 'second');
}
