const log = require('llog');

module.exports = function (options) {
  options = options || {};

  process.on('uncaughtException', function handleUncaughtException(err) {
    log.fatal({ msg: 'uncaughtException' });

    if (err) {
      if (err.toString) {
        log.fatal(err.toString());
      }

      log.fatal({ msg: 'uncaughtException', error: err.message || err });

      console.fatal(err.stack);
    } else {
      console.fatal(console.trace());
    }

    process.exit(1);
  });

  process.on('unhandledRejection', function handleUnhandledRejection(err, p) {
    log.fatal({ msg: 'unhandledRejection', promise:p });
    throw err;
  });

};
