declare module 'z32' {
  export function encode(buf: Uint8Array): string
  export function decode(s: string): Uint8Array
  const z32: { encode: typeof encode; decode: typeof decode }
  export default z32
}
declare module 'hyperdht' {
  const DHT: any
  export default DHT
}
declare module 'hyperswarm' {
  const Hyperswarm: any
  export default Hyperswarm
}
declare module 'corestore' {
  const Corestore: any
  export default Corestore
}
declare module 'autobase' {
  const Autobase: any
  export default Autobase
}
