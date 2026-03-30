type LogLevel = "debug" | "info" | "warn" | "error";

const isDebugEnabled =
  process.env.DEBUG === "true" || process.env.DEBUG === "1";

function write(level: LogLevel, message: string, ...args: unknown[]): void {
  if (level === "debug" && !isDebugEnabled) {
    return;
  }

  const prefix = `[${level.toUpperCase()}]`;
  const out = level === "error" ? console.error : console.log;
  out(prefix, message, ...args);
}

export const logger = {
  debug: (message: string, ...args: unknown[]) =>
    write("debug", message, ...args),
  info: (message: string, ...args: unknown[]) =>
    write("info", message, ...args),
  warn: (message: string, ...args: unknown[]) =>
    write("warn", message, ...args),
  error: (message: string, ...args: unknown[]) =>
    write("error", message, ...args),
};

