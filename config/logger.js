const winston = require('winston');

const logger = winston.createLogger({
  level: 'info', // Log 'info' level and above
  format: winston.format.json(),
  transports: [
    // -
    // - Write all logs with level `error` or less to `error.log`
    // - Write all logs with level `info` or less to `combined.log`
    // -
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

//
// If we're not in production, also log to the `console`
//
if (process.env.APP_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

module.exports = logger;