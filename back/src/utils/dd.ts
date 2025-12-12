import dotenv from 'dotenv';

dotenv.config();

export const dd = (text: any, options?: any) => {
	const projectId = process.env.PROJECT_ID ?? 'UNKNOWN_PROJECT';
    
	// Simple caller info extraction
	const getCallerInfo = () => {
		const stack = new Error().stack?.split('\n') || [];
		// Look for the third line in stack (caller of this function)
		const callerFrame = stack[3] || '';
		const match = callerFrame.match(/([^\/\\]+):(\d+):(\d+)/);
		if (match) {
			return `${match[1]}:${match[2]}`;
		}
		return 'unknown:0';
	};
    
	const callerInfo = getCallerInfo();
	const prefix = `[${projectId}] ${callerInfo}`;
    
	// Check if we should use two-line format
	const useTwoLines = (input: any) => {
		if (input === null) return false;
		if (typeof input === 'object') return true;
        
		if (typeof input === 'string') {
			try {
				const parsed = JSON.parse(input);
				return typeof parsed === 'object' && parsed !== null;
			} catch {
				return false;
			}
		}
        
		return false;
	};
    
	if (useTwoLines(text)) {
		console.log(prefix);
        
		let payload = text;
		if (typeof text === 'string') {
			try {
				payload = JSON.parse(text);
			} catch {
				// Keep as string if parsing fails
			}
		}
        
		console.log(payload);
	} else {
		console.log(`${prefix} ${text}`);
	}
}