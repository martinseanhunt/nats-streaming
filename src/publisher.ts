import nats from 'node-nats-streaming'
import { randomBytes } from 'crypto'

console.clear()

const stan = nats.connect(
  'nats-ticketing',
  `pub-${randomBytes(4).toString('hex')}`,
  {
    // Communicating with nats running on k8 using simple port forwarding
    url: 'http://localhost:4222',
  }
)

stan.on('connect', () => {
  console.log('publisher connected to nats')

  // Messages neeed to be strings
  const data = JSON.stringify({
    id: '1234',
    title: 'sas new test',
    price: 25,
  })

  // item created is our channel which can be listened to to recieve events
  stan.publish('ticket:created', data, () => {
    console.log('event published')
  })
})
