const log = require('llog');

module.exports = function (options) {
  options = options || {};

  process.on('uncaughtException', function handleUncaughtException(err) {
    log.fatal('uncaughtException');

    if (err) {
      if (err.toString) {
        log.fatal(err.toString());
      }

      log.fatal(err.stack || err.message || err);
    } else {
      log.fatal(console.trace());
    }

    process.exit(1);
  });

  process.on('unhandledRejection', function handleUnhandledRejection(err, p) {
    log.fatal({ msg: 'unhandledRejection', promise:p });
    throw err;
  });

};
