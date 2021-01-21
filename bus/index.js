const amqp = require('amqplib')
const makePublish = require('./makePublish')
const makeSend = require('./makeSend')
const makeConsume = require("./makeConsume")
const makeHelpers = require('./makeHelpers')
const { RedisStore } = require("../lib/redisStore")
const log = require('llog')
const debug = require("debug")("bus")

let _instance = null;

const makeBus = async function (options) {
  if (!options.rabbitmq && !options.rabbitmq.url) throw new Error("connectionUrl is required")
  if (!options.application) throw new Error("application is required")
  if (!options.redis) throw new Error('redis is required')

  if (_instance) return _instance

  // const url = `${options.rabbitmq.url}?heartbeat=60`
  options.store = new RedisStore(options.redis)
  options.failThreshold = options.failThreshold || 3
  options.prefetch = options.failThreshold || 3
  options.replay = options.replay || false
  debug("options", options)

  // connect to Rabbit MQ and create a channel
  const connection = await amqp.connect(options.rabbitmq.url)
  const channel = await connection.createChannel()
  const pubChannel = await connection.createConfirmChannel()

  // handle connection closed
  connection.on("close", (err) => {
        log.error("Connection closed", err)
  });

  // handle errors
  connection.on("error", (err) => {
        log.error("Connection error", err)
  });
  
  const {
      addMetasToPayload,
      hasTooManyRetries
  } = makeHelpers({ options })

  const {
    publish,
    storeCommand,
    publishRejection
  } = makePublish({ options, channel: pubChannel, addMetasToPayload })
  
  const { 
    send 
  } = makeSend({ options, channel: pubChannel, addMetasToPayload })
  
  const {
    listen,
    subscribe
  } = makeConsume({ options, channel, storeCommand, publishRejection, hasTooManyRetries })

  _instance = Object.freeze({
    connection,
    publish,
    subscribe,
    send,
    listen,
  })

  return _instance
}
 
module.exports.makeBus = makeBus
