import nats from 'node-nats-streaming'

const stan = nats.connect('nats-ticketing', 'abc', {
  // Communicating with nats running on k8 using simple port forwarding
  url: 'http://localhost:4222',
})

stan.on('connect', () => {
  console.log('publisher connected to nats')
})
