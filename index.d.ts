/// <reference types="node" />

import {EventEmitter} from 'events'

declare interface Options {
  interval?: number
}

interface Status {
  current: number
  errors: number
  total: number
}

interface MBTiles2Abacus extends EventEmitter {
  // Operations
  shutdown(): void;

  // Listeners
  on(type: 'start', callback: (status: Status) => void): this;
  on(type: 'update', callback: (status: Status) => void): this;
  on(type: 'end', callback: (status: Status) => void): this;
}

declare function mbtiles2abacus(mbtiles: string, output: string, options?: Options): MBTiles2Abacus
declare namespace mbtiles2abacus {}
export = mbtiles2abacus