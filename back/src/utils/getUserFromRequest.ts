import { Request } from 'express';

export const getUserFromRequest = (req: Request): string => {
	const userHeader = req.headers['x-user-handler'];
    
	if (!userHeader) {
		throw new Error("Missing 'x-user-handler' header");
	}
    
	return String(userHeader);
};