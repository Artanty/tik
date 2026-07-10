import dotenv from 'dotenv';
dotenv.config();

export const thisProjectResProp = () => {
	return `${process.env['PROJECT_NAME']}@${process.env['NAMESPACE']}`
}

export const doroResProp = () => {
	return `doro@back`
}