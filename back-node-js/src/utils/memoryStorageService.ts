import { dd } from "./dd";

export class MemoryStorageService {
	private static variables: Record<string, any> = {};

	// Check if a variable exists
	// static has(key: string): boolean {
	// 	return key in this.variables;
	// }

	// Get the value of a stored variable
	static get<T = any>(key: string): T | undefined {
		return this.variables[key];
	}

	// Set a new variable
	static set(key: string, value: any): void {
		this.variables[key] = value;
	}

	// Remove a variable
	// static delete(key: string): boolean {
	// 	if (this.has(key)) {
	// 		delete this.variables[key];
	// 		return true;
	// 	}
	// 	return false;
	// }

	// Clear all variables
	static clear(): void {
		this.variables = {};
	}
}