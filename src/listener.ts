import nats from 'node-nats-streaming'
import { randomBytes } from 'crypto'

import { TicketCreatedListener } from './events/TicketCreatedListener'

console.clear()
// open the nats connection
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

  // use our classes to create individual listeners
  new TicketCreatedListener(stan).listen()

  // listening for the close event (raised below) and telling nats server this instance is going away
  stan.on('close', () => {
    console.log('closing nats connection')
    process.exit()
  })
})

// listening for terminate and interrupt signasl so we can trigger
// a clase event which we can act upon in the listener defined above
process.on('SIGINT', () => stan.close())
process.on('SIGTERM', () => stan.close())
