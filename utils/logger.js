const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4,
};

class Logger {
  constructor() {
    this.logLevel = this.getLogLevel();
    this.isProduction = process.env.NODE_ENV === "production";
  }

  getLogLevel() {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    return LOG_LEVELS[envLevel] ?? LOG_LEVELS.INFO;
  }

  shouldLog(level) {
    return level <= this.logLevel;
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;

    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data, null, 2)}`;
    }
    return `${prefix} ${message}`;
  }

  error(message, data = null) {
    if (this.shouldLog(LOG_LEVELS.ERROR)) {
      console.error(this.formatMessage("ERROR", message, data));
    }
  }

  warn(message, data = null) {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      console.warn(this.formatMessage("WARN", message, data));
    }
  }

  info(message, data = null) {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      console.log(this.formatMessage("INFO", message, data));
    }
  }

  debug(message, data = null) {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      console.log(this.formatMessage("DEBUG", message, data));
    }
  }

  trace(message, data = null) {
    if (this.shouldLog(LOG_LEVELS.TRACE)) {
      console.log(this.formatMessage("TRACE", message, data));
    }
  }

  // Special method for payment-specific logging
  payment(message, data = null) {
    if (
      process.env.ENABLE_PAYMENT_LOGS === "true" ||
      this.shouldLog(LOG_LEVELS.DEBUG)
    ) {
      console.log(this.formatMessage("PAYMENT", message, data));
    }
  }

  // Special method for database logging
  db(message, data = null) {
    if (
      process.env.ENABLE_DB_LOGS === "true" ||
      this.shouldLog(LOG_LEVELS.DEBUG)
    ) {
      console.log(this.formatMessage("DB", message, data));
    }
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;
