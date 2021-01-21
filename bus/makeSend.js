const Promise = require("bluebird")
const log = require('llog')
const util = require("util")
const debug = require("debug")("bus")

module.exports = function ({ options, channel, addMetasToPayload }) {
    const send = function({ 
      exchangeName = 'biz.direct',
      queueName,
      routingKey, 
      data,
      autoDelete = false, 
      meta = true
    } = {}) {
      return new Promise(async (resolve) => {
        if (options.replay) {
          debug(`Replay: Not sending a [${routingKey}] message with id [${data.guid}] and correlationId [${data.cid}]`)
          return resolve(true)
        }

        await channel.prefetch(options.prefetch)

        const finalQueueName = (queueName) ? queueName : routingKey

        await channel.assertExchange(exchangeName, 'direct', { durable: true, autoDelete: autoDelete })
        await channel.assertQueue(finalQueueName, { durable: true, autoDelete: autoDelete })
        await channel.bindQueue(finalQueueName, exchangeName, routingKey)

        let msgObj = data
        if (meta) msgObj = addMetasToPayload({ data, routingKey, exchangeName, type: 'command' })

        debug(`Sending a [${routingKey}] message with id [${msgObj.guid}] and correlationId [${msgObj.guid}]`)

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
      send
    }
}