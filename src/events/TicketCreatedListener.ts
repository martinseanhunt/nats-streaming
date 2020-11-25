import { Message } from 'node-nats-streaming'

import { Listener } from './Listener'
import { TicketCreatedEvent } from './TicketCreatedEvent'
import { Subjects } from './Subjects'

export class TicketCreatedListener extends Listener<TicketCreatedEvent> {
  // The channel name
  // Typescript is able to validate this for us because we've set up the event Type in our Listener abstract class
  // We were having to annotate the type here so TS know's we're not going to try and change the value of
  // subject later since it's not a const and in the world of js could be reassigned to anything. Instead of annotating
  // we can use TS's readonly keyword which makes the property immutable
  readonly subject = Subjects.TicketCreated
  queueGroupName = 'tickets-service'

  // Now we can type check the incoming data so we can't reference non existing properties for this event type
  // because we're using the genereic class in Listener and passing the TicketCreatedEvent TS will make sure
  // that the type we assign here matches.
  onMessage(data: TicketCreatedEvent['data'], msg: Message) {
    console.log(data)

    // acknowledge that the message has been processed successfully
    // if we error somewhere before this nats will know it needs to retry
    msg.ack()
  }
}
