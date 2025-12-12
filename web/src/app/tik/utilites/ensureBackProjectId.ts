export const ensureBackProjectId = (projectId: string): string => {
	const namespace = projectId.split('@')[1];
	if (!namespace) {
		return projectId.concat('@back')
	} else if (namespace !== 'back') {
		throw new Error('namespace !== "back"')
	} else {
		return projectId;
	}
}