export const isEmptyConfig = (data: any): boolean => {
	return typeof data.config === 'string'
}