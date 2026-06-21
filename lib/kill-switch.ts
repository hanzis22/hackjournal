import { EventEmitter } from 'events'

class KillSwitchEmitter extends EventEmitter {}

const globalRef = global as any
if (!globalRef.killSwitchEmitter) {
  globalRef.killSwitchEmitter = new KillSwitchEmitter()
}

export const killSwitchEmitter = globalRef.killSwitchEmitter
