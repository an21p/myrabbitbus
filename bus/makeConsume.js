const Promise = require("bluebird")
const util = require("util")
const log = require('llog')
const debug = require("debug")("bus")
const error = require("debug")("bus-error")

module.exports = function ({ options, channel, storeCommand, publishRejection, hasTooManyRetries }) {
  const listen = async function ({ 
    exchangeName = 'biz.direct',
    queueName,
    routingKey,
    autoDelete = false, 
    fn 
  } = {}) {
    return new Promise(async (resolve, reject) => {
      await channel.prefetch(options.prefetch)
  
      const finalQueueName = (queueName) ? queueName : routingKey

      await channel.assertExchange(exchangeName, 'direct', { durable: true, autoDelete: autoDelete })
      await channel.assertQueue(finalQueueName, { durable: true, autoDelete: autoDelete })
      await channel.bindQueue(finalQueueName, exchangeName, routingKey)
  
      channel.consume(finalQueueName, async function (msg) {
        try {
          // parse message
          let msgBody = msg.content.toString()
          let data = JSON.parse(msgBody)
          let { routingKey, guid, application, cid } = data
          debug(`Listen: Received [${routingKey}] message from [${application}] with id [${guid}] and correlationId [${cid}]`)
          
          storeCommand({ routingKey, data })
  
          // handle message
          tooMany = await hasTooManyRetries(data)
          if (tooMany) {
            publishRejection({ routingKey, data })
            throw new Error('Too many replays')
          }
  
          try {
            // process data
            await fn(data)                
            await channel.ack(msg)
            debug({ msg: `Processed ok` })
          } catch (err) { 
            await channel.reject(msg, true)
            debug({ msg: `Processing failed`, error: err })
          }
          } catch (err) {
          await channel.reject(msg, false)
          error({ msg: `Rejected`, error: err })
  
        }
      }, 
      function (err, ok) {
          if(err) {
            return reject(err)
          }
          return resolve(ok)
      })
    })
  
  }
  
  const subscribe = async function ({ 
    exchangeName = `biz.topic`, 
    queueName,
    routingKey,
    autoDelete = false, 
    fn 
  } = {}) {
    return new Promise(async (resolve, reject) => {
      await channel.prefetch(options.prefetch)
  
      const finalQueueName = util.format('%s-%s', options.application, (queueName) ? queueName : routingKey) 
      
      await channel.assertExchange(exchangeName, 'topic', { durable: true, autoDelete: autoDelete })
      await channel.assertQueue(finalQueueName, { durable: true, autoDelete: autoDelete })
      await channel.bindQueue(finalQueueName, exchangeName, routingKey)
  
      channel.consume(finalQueueName, async function (msg) {
        try {
          // parse message
          let msgBody = msg.content.toString()
          let data = JSON.parse(msgBody)
          let { routingKey, guid, application, cid } = data
          debug(`Subscribe: Received a [${routingKey}] message from [${application}] with id [${guid}] and correlationId [${cid}]`)
            
          // handle message
          tooMany = await hasTooManyRetries(data)
          if (tooMany) {
            throw new Error('Too many replays')
          }
  
          try {
            // process data
            await fn(data)                
            await channel.ack(msg)
            debug({ msg: `Processed ok` })
          } catch (err) { 
            await channel.reject(msg, true)
            debug({ msg: `Processing failed`, error: err })
          }
          } catch (err) {
          await channel.reject(msg, false)
          log.error({ msg: `Rejected`, error: err })
  
        }
      }, 
      function (err, ok) {
          if(err) {
            return reject(err)
          }
          return resolve(ok)
      })
    })
  
  }
  
  
  return {
    listen,
    subscribe
  }
}