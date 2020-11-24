import nats, { Message } from 'node-nats-streaming'
import { randomBytes } from 'crypto'

console.clear()

// param 2 (client id) needs to be unique so that when we have multiple instances
// of a service running each instance has it's own nats client
// all client ID's connected to the nats server needs to be unique

// for the sake of this simple app I'll just randomly generate the client Id's.
// in the real world we can use some k8s tools to do this properly!
const stan = nats.connect(
  'nats-ticketing',
  `lst-${randomBytes(4).toString('hex')}`,
  {
    url: 'http://localhost:4222',
  }
)

stan.on('connect', () => {
  console.log('listener conencted to nats')

  // listening for the close event (raised below) and telling nats server this instance is going away
  stan.on('close', () => {
    console.log('closing nats connection')
    process.exit()
  })

  // settign options for the listener
  const options = stan
    .subscriptionOptions()
    // stop NATS marking events as processed as soon as they are recieved. Otherwise if this service
    // errors at some point while processing the event, the event won't be re sent.
    // with this option we're telling NATS that WE will manually define, and tell it when an event has been
    // successfully processed.
    .setManualAckMode(true)
    // tells nats to deliver the entire event history for the channel when we subscribe to a channel
    .setDeliverAllAvailable()
    // sets this up as a  durable subscription witha name we provide.
    // Nats will then keep a record of whether this durable subscription has successfully received and
    // processed any event in the channel. That way when we're asking for nats to deliver all available above we're
    // really asking for all available tickets which haven't been processed by this subscription. So we will be getting
    // any events that may be backed up while this service was offline / unavailable but not anything we've
    // already processed, persisted to the database etc.

    // we still need to use setDeliverAllAvailable in conjunction because it tells the nats to send us everthing
    // the first time this subscription is ever connected to. So we can get the entire applicaiton history the first
    // time we boot up a new service / subscription and make sure that our data is up to date.

    // IMPORTANT - in order for this to work the way we want it to we need to use it in conjunction with a queue group.
    // Otherwise if the subscription / service goes offline nats assumes it's gone for good and gets rid of the durable
    // group so we'll get all the events when we boot back up. If we use a listener queue group the durable name
    // (and it's history of events that have been successfully processed) is
    // persisted and used for any service that joins or rejoins the group.
    .setDurableName('listener-service')

  // inside the channel we can create and subscribe to queue groups. These are groups that multiple
  // clients can join. NATS only ever sends the event to ONE of the subscriptions that join the group. This is
  // vital for services which may scale horizontally and have more than once instance. Stops us processsing a single
  // event multiple times

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

// listening for terminate and interrupt signasl so we can trigger
// a clase event which we can act upon in the listener defined above
process.on('SIGINT', () => stan.close())
process.on('SIGTERM', () => stan.close())
