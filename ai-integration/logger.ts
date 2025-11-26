// Simple, reliable logger without external dependencies
export const logger = console;

const stringifyArg = (arg: unknown): string => {
  try {
    if (arg === null) return "null";
    if (arg === undefined) return "undefined";
    
    // Handle Error objects specially
    if (arg instanceof Error) {
      return `${arg.name}: ${arg.message}${arg.stack ? `\n${arg.stack}` : ''}`;
    }
    
    // Handle other objects
    if (typeof arg === "object") {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (jsonError) {
        // If JSON.stringify fails, try to extract useful information
        if (arg && typeof arg === 'object') {
          const keys = Object.keys(arg);
          const values = keys.map(key => {
            try {
              return `${key}: ${String((arg as any)[key])}`;
            } catch {
              return `${key}: [unserializable]`;
            }
          });
          return `{${values.join(', ')}}`;
        }
        return String(arg);
      }
    }
    
    return String(arg);
  } catch (error) {
    return String(arg);
  }
};

export const logError = (...args: Parameters<typeof console.error>) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR:`, ...args.map(stringifyArg));
};

export const logDebug = (...args: Parameters<typeof console.debug>) => {
  const timestamp = new Date().toISOString();
  console.debug(`[${timestamp}] DEBUG:`, ...args.map(stringifyArg));
};

export const logSuccess = (...args: Parameters<typeof console.log>) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] SUCCESS:`, ...args.map(stringifyArg));
};

export const logWarning = (...args: Parameters<typeof console.warn>) => {
  const timestamp = new Date().toISOString();
  console.warn(`[${timestamp}] WARNING:`, ...args.map(stringifyArg));
};
