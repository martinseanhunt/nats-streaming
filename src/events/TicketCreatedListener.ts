import { Message } from 'node-nats-streaming'
import { Listener } from './Listener'

export class TicketCreatedListener extends Listener {
  // The channel name
  subject = 'ticket:created'
  queueGroupName = 'tickets-service'

  onMessage(data: any, msg: Message) {
    console.log(data)

    // acknowledge that the message has been processed successfully
    // if we error somewhere before this nats will know it needs to retry
    msg.ack()
  }
}
