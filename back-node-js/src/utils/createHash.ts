const crypto = require('crypto');

export const createHash = async (data1: any, data2: any) => {
	data1 = `${parseDigitsWithCustomMonths(data1)}${digitsToShiftedSymbolsUniversal(data1)}`
	data2 = `${parseDigitsWithCustomMonths(data2)}${digitsToShiftedSymbolsUniversal(data2)}`
	const encoder = new TextEncoder();
	const encodedData = encoder.encode(data1 + data2);
	const hashBuffer = await crypto.subtle.digest('SHA-256', encodedData);
	return Array.from(new Uint8Array(hashBuffer))
		.map(b => b.toString(16).padStart(2, '0')).join('');
}

function parseDigitsWithCustomMonths(input: any) {
	input = String(input)

	const numberWords = ['zero', 'one', 'two', 'three', 'four', 
		'five', 'six', 'seven', 'eight', 'nine'];
  
	const reversedMonths = [
		'November',    // 0
		'September',   // 1
		'August',      // 2
		'July',        // 3
		'June',        // 4
		'May',         // 5
		'April',       // 6
		'March',       // 7
		'February',    // 8
		'January'      // 9
	].map(month => month.split('').reverse().join(''));

	return input.replace(/\d/g, (digit: any) => {
		const num = parseInt(digit, 10);
		const word = numberWords[num];
		const monthPart = reversedMonths[num] || '';
    
		return `${word}${monthPart}`;
	});
}

function digitsToShiftedSymbolsUniversal(input: any) {
	input = String(input)

	const shiftedSymbols: any = {
		'0': ')', '1': '!', '2': '@', '3': '#', '4': '$',
		'5': '%', '6': '^', '7': '&', '8': '*', '9': '('
	};

	return input.replace(/\d/g, (digit: any) => {
		return shiftedSymbols[digit] || digit; // Fallback to original digit
	});
}

export function createShortHash(input: any) {
	return crypto.createHash('md5').update(input).digest('hex').substring(0, 16);
}