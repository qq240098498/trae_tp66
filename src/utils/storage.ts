export const storage = {
  get: <T>(key: string, defaultValue?: T): T | undefined => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: <T>(key: string, value: T): void => {
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove: (key: string): void => {
    localStorage.removeItem(key);
  },
  clear: (): void => {
    localStorage.clear();
  },
};
