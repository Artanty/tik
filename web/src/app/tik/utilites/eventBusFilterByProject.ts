import { BusEvent, EVENT_BUS_LISTENER, EVENT_BUS_PUSHER, HOST_NAME } from 'typlib';

export const filterBusEventsByProject = (res: BusEvent) => {
  return res.to === `${process.env['PROJECT_ID']}@${process.env['NAMESPACE']}`
}