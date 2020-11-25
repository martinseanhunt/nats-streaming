import nats from 'node-nats-streaming'
import { randomBytes } from 'crypto'

import { TicketCreatedPublisher } from './events/TicketCreatedPublisher'

console.clear()

const stan = nats.connect(
  'nats-ticketing',
  `pub-${randomBytes(4).toString('hex')}`,
  {
    // Communicating with nats running on k8 using simple port forwarding
    url: 'http://localhost:4222',
  }
)

stan.on('connect', async () => {
  console.log('publisher connected to nats')

  const publisher = new TicketCreatedPublisher(stan)

  // Messages neeed to be strings
  const data = {
    id: '1234',
    title: 'sas new test',
    price: 25,
  }

  const publishResult = await publisher.publish(data)
  console.log(publishResult)
})
