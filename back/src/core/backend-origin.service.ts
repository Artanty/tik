let cachedOrigin: string | null = null;

export const backendOrigin = {
  set: (origin: string): void => {
    cachedOrigin = origin;
  },
  
  get: (): string => {
    if (!cachedOrigin) {
      throw new Error('Backend origin not set. Call set() first.');
    }
    return cachedOrigin;
  },
};