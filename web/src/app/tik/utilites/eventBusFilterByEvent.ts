import { BusEvent, EVENT_BUS_LISTENER, EVENT_BUS_PUSHER, HOST_NAME } from 'typlib';

export const eventBusFilterByEvent = (res: BusEvent, event: string) => {
  return res.event === `${event}`
}