import { Stan } from 'node-nats-streaming'
import { Subjects } from './Subjects'

// See Listener for detailed comments on TS stuff
interface Event {
  subject: Subjects
  data: any
}

export abstract class Publisher<T extends Event> {
  // the channel we're posting to
  abstract subject: T['subject']

  // the connected nats client
  private client: Stan

  constructor(client: Stan) {
    this.client = client
  }

  // Send out the data and make sure it's of the correct event data type as defined
  // when extending this class and creating a specific Publisher
  publish(data: T['data']): Promise<string> {
    return new Promise((resolve, reject) => {
      this.client.publish(this.subject, JSON.stringify(data), (err) => {
        if (err) return reject(err)
        resolve('event published')
      })
    })
  }
}
