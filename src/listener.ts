import nats, { Message } from 'node-nats-streaming'
import { randomBytes } from 'crypto'

console.clear()

// param 2 (client id) needs to be unique so that when we have multiple instances
// of a service running each instance has it's own nats client
// all client ID's connected to the nats server needs to be unique

// for the sake of this simple app I'll just randomly generate the client Id's.
// in the real world we can use some k8s tools to do this properly!
const stan = nats.connect('nats-ticketing', randomBytes(4).toString('hex'), {
  url: 'http://localhost:4222',
})

stan.on('connect', () => {
  console.log('listener conencted to nats')

  // settign options for the listener
  const options = stan
    .subscriptionOptions()
    // stop NATS marking events as processed as soon as they are recieved. Otherwise if this service
    // errors at some point while processing the event, the event won't be re sent.
    // with this option we're telling NATS that WE will manually define, and tell it when an event has been
    // successfully processed.
    .setManualAckMode(true)

  // inside the channel we can create and subscribe toqueue groups. These are groups that multiple
  // clients can join. NATS only ever sends the event to ONE of the clients that join the group. This is
  // vital for services which may scale horizontally and have more than once instance. Stops us processsing
  // multiple time

  // the second arg is the queue group. Makes sense to name these after the service listening
  const subscription = stan.subscribe(
    'item:created',
    'listenerQueueGroup',
    options
  )

  subscription.on('message', (msg: Message) => {
    console.log('message recieved: ' + msg.getSequence())

    const data = msg.getData()
    if (typeof data !== 'string') return

    console.log(JSON.parse(data))

    // acknowledge that the message has been processed successfully
    msg.ack()
  })
})
