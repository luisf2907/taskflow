type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

// Buffer para batch logging em producao (evita I/O sincrono a cada log)
const LOG_BUFFER_SIZE = 20;
const LOG_FLUSH_INTERVAL = 5_000;
let buffer: LogEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function formatLog(entry: LogEntry): string {
  if (process.env.NODE_ENV === "production") {
    return JSON.stringify(entry);
  }
  const prefix = `[${entry.level.toUpperCase()}]${entry.context ? ` [${entry.context}]` : ""}`;
  const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : "";
  return `${prefix} ${entry.message}${dataStr}`;
}

function flushBuffer() {
  if (buffer.length === 0) return;
  const toFlush = buffer;
  buffer = [];

  // Agrupar por level para minimizar chamadas
  const errors = toFlush.filter((e) => e.level === "error");
  const warns = toFlush.filter((e) => e.level === "warn");
  const infos = toFlush.filter((e) => e.level === "info");

  if (errors.length > 0) console.error(errors.map(formatLog).join("\n"));
  if (warns.length > 0) console.warn(warns.map(formatLog).join("\n"));
  if (infos.length > 0) console.info(infos.map(formatLog).join("\n"));
}

function log(level: LogLevel, message: string, context?: string, data?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    context,
    data,
    timestamp: new Date().toISOString(),
  };

  // Em dev, log imediato para DX
  if (process.env.NODE_ENV !== "production") {
    const formatted = formatLog(entry);
    switch (level) {
      case "error": console.error(formatted); break;
      case "warn": console.warn(formatted); break;
      default: console.info(formatted);
    }
    return;
  }

  // Em producao, errors sempre imediatos, rest vai pro buffer
  if (level === "error") {
    console.error(formatLog(entry));
    return;
  }

  buffer.push(entry);
  if (buffer.length >= LOG_BUFFER_SIZE) {
    flushBuffer();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushBuffer();
    }, LOG_FLUSH_INTERVAL);
  }
}

export const logger = {
  info: (message: string, context?: string, data?: Record<string, unknown>) =>
    log("info", message, context, data),
  warn: (message: string, context?: string, data?: Record<string, unknown>) =>
    log("warn", message, context, data),
  error: (message: string, context?: string, data?: Record<string, unknown>) =>
    log("error", message, context, data),
};
