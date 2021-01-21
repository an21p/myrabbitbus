const Promise = require("bluebird");

module.exports = function (promise) {
    return promise
        .then(result => ({ok: true, result}))
        .catch(error => Promise.resolve({ok: false, error}))
}