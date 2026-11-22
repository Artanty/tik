import { backendOrigin } from "../core/backend-origin.service";

export const setOriginMiddleware = (req: any, res: any, next: any) => {
  const origin = `${req.protocol}://${req.get('host')}`;
  backendOrigin.set(origin);
  next();
};