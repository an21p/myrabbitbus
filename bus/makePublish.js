const Promise = require("bluebird")
const util = require('util')
const log = require('llog')
const debug = require("debug")("bus")

module.exports = function ({ options, channel, addMetasToPayload }) {

  const storeCommand = function ({
    routingKey,
    data
  }) {    
    publish({
      exchangeName: 'commands.topic',
      routingKey,
      data,
      meta: false
    })
  }
  
  const publishRejection = function ({
    routingKey,
    data
  }) {
    publish({
      cid: data.guid,
      routingKey: util.format("%s.rejected", routingKey),
      data
    })
  }
  
  const publish = function({ 
    exchangeName = 'biz.topic', 
    routingKey, 
    data,
    cid,
    autoDelete = false, 
    meta = true
  } = {}) {
    return new Promise(async (resolve) => {
      if (options.replay) {
          debug(`Replay: Not publishing a [${routingKey}] message with id [${data.guid}] and correlationId [${cid}]`)
          return resolve(true)
      }

      await channel.prefetch(options.prefetch)

      await channel.assertExchange(exchangeName, 'topic', { durable: true, autoDelete: autoDelete })

      let msgObj = data
      if (meta) msgObj = addMetasToPayload({ cid, data, routingKey, exchangeName, type: 'event' })

      debug(`Publishing a [${routingKey}] message with id [${msgObj.guid}] and correlationId [${cid}]`)

      channel.publish(
        exchangeName, 
        routingKey, 
        Buffer.from(JSON.stringify(msgObj), 'utf-8'), 
        { persistent: true }, 
        function (err, ok) {
          if (err) {
            return resolve(err)
          }

          return resolve(ok)
        })
      })
    }

    return {
      publish,
      storeCommand,
      publishRejection
    }
}