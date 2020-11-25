import { Message, Stan } from 'node-nats-streaming'
import { Subjects } from './Subjects'

// Create a generic event interface which will serve as the base type for individual events
interface Event {
  subject: Subjects
  data: any
}

// Abstract class (meaning instances of it can't be created directly. This class must be extended to be used)
// <T extends Event> means that when we extend the class we also have to pass an interface that extends the Event type
// which we'll use to provied all the properties that a given event can have.
// Now we can refer to the generic type T in this class which will refer to whatever is being passed in
export abstract class Listener<T extends Event> {
  // These abstract properties must be set by the extending class
  // subject is the channel / topic (so many interchangable terms!)
  // the subject provided when extending the classs should match
  // the specific subject we're listening for.
  abstract subject: T['subject']
  abstract queueGroupName: string

  // The function that will be called to process the incoming message
  // T['data'] means the data should be of type data from the specific lister class that extends this one
  abstract onMessage(parsedData: T['data'], msg: Message): void

  // must be defined here and only here
  private client: Stan

  // the sub class can set this property if it wants to
  protected ackWait: number = 5000

  constructor(client: Stan) {
    this.client = client
  }

  subscriptionOptions() {
    return (
      this.client
        .subscriptionOptions()
        // stop NATS marking events as processed as soon as they are recieved. Otherwise if this service
        // errors at some point while processing the event, the event won't be re sent.
        // with this option we're telling NATS that WE will manually define, and tell it when an event has been
        // successfully processed.
        .setManualAckMode(true)
        // tell nats how long it should wait before timing out
        .setAckWait(this.ackWait)
        // tells nats to deliver the entire event history for the channel when we subscribe to a channel
        .setDeliverAllAvailable()
        // sets this up as a  durable subscription witha name we provide.
        // Nats will then keep a record of whether this durable subscription has successfully received and
        // processed any event in the channel. That way when we're asking for nats to deliver all available above we're
        // really asking for all available tickets which haven't been processed by this subscription. So we will be
        // getting any events that may be backed up while this service was offline / unavailable but not anything we've
        // already processed, persisted to the database etc.

        // we still need to use setDeliverAllAvailable in conjunction because it tells the nats to send us everthing
        // the first time this subscription is ever connected to. So we can get the entire applicaiton history the first
        // time we boot up a new service / subscription and make sure that our data is up to date.

        // IMPORTANT - in order for this to work the way we want it to we need to use it in conjunction with a queue .
        // group Otherwise if the subscription / service goes offline nats assumes it's gone for good and gets rid of
        // the durable group so we'll get all the events when we boot back up. If we use a listener queue group the
        // durable name (and it's history of events that have been successfully processed) is
        // persisted and used for any service that joins or rejoins the group.

        // Makes sense to use the queue group name here also
        .setDurableName(this.queueGroupName)
    )
  }

  listen() {
    // Set up a subscription to a channel with our options

    // Within each channel we can create and subscribe to queue groups. These are groups that multiple
    // clients can join. NATS only ever sends the event to ONE of the subscriptions that join the group. This is
    // vital for services which may scale horizontally and have more than once instance. Stops us processsing a single
    // event multiple times
    const subscription = this.client.subscribe(
      this.subject,
      this.queueGroupName,
      this.subscriptionOptions()
    )

    // listen for incoming messages from the channel
    subscription.on('message', (msg: Message) => {
      console.log(
        `Message Recievied: ${this.subject} / ${
          this.queueGroupName
        } - ${msg.getSequence()}`
      )

      // Get the parsed data from the message
      const parsedData = this.parseMessage(msg)

      // Process the message with the function defined in the subclass. sending the msg along with
      // parsedData so we can call msg.ack() after processing and also incase there are any other
      // properties we need to accesss
      this.onMessage(parsedData, msg)
    })
  }

  parseMessage(msg: Message) {
    // The message data can be a buffer or a string. If it's a string we should
    // parse it.
    const data = msg.getData()
    return typeof data === 'string'
      ? JSON.parse(data)
      : JSON.parse(data.toString('utf8'))
  }
}
