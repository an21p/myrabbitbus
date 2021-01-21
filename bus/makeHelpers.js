const util = require('util')
const uuid_1 = require("uuid")
const log = require('llog')
const debug = require("debug")("bus")

module.exports = function ({ options }) {
    const getNamespacedUniqueMessageId = function (uniqueMessageId) {
        return options.application !== undefined ? util.format('%s-%s', options.application, uniqueMessageId) : uniqueMessageId
      }
    
      const hasTooManyRetries = function (msg) {
        if (!options.failThreshold) throw new Error("Fail threshold required")
    
        const namespacedUniqueMessageId = getNamespacedUniqueMessageId(msg.guid)
        return new Promise((resolve, reject) => {
            options.store.increment(namespacedUniqueMessageId, function (err) {
                if (err) return reject(err)
    
                options.store.get(namespacedUniqueMessageId, function (err, count) {
                    if (err) return reject(err)
    
                    debug("Try %s out of %s",count, options.failThreshold)
                    if (count >= options.failThreshold) {
                        log.error(`[✗] Too many replays: `, { msg })
    
                        options.store.clear(namespacedUniqueMessageId, function (err) {
                            if (err) return reject(err)
                            return resolve(true)
    
                            })
    
                    } else {
                        if (count > 1) {
                            debug('retrying %s', namespacedUniqueMessageId)
                        } else {
                            debug('message %s', namespacedUniqueMessageId)
                        }
                        return resolve(false)
                    }
                })
            })
        })
      }
    
      const addMetasToPayload = function ({ 
        exchangeName, 
        type,
        routingKey, 
        data,
        cid
      }) {
        const guid = uuid_1.v4()
        let finalCid = cid
        if (type === 'command') finalCid = guid
        return Object.assign({ 
          ...data,
          guid,
          cid: finalCid,
          routingKey: routingKey, 
          application: options.application, 
          exchange: exchangeName,
          type,
          timestamp: Date.now(),
        })
      }

      return {
          addMetasToPayload,
          hasTooManyRetries
      }
}