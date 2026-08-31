import os from "node:os"

/// Prisma 7 generated row ids with `cuid()`; Prisma 8 has no `cuid()` default
/// function, so the app mints them instead. This is cuid v1, byte-for-byte the
/// same shape Prisma 7 produced — `c` + timestamp + counter + fingerprint +
/// random, 25 chars — so new ids stay indistinguishable from the existing rows
/// and from the ids already baked into shared links.
const BASE = 36
const BLOCK = 4
const DISCRETE_VALUES = BASE ** BLOCK

function pad(value: string, size: number) {
  return `000000000${value}`.slice(-size)
}

function randomBlock() {
  return pad(Math.floor(Math.random() * DISCRETE_VALUES).toString(BASE), BLOCK)
}

/// Distinguishes concurrent processes, so two machines minting ids in the same
/// millisecond still collide only on the random blocks.
const fingerprint = (() => {
  const pid = pad(process.pid.toString(BASE), 2)
  const hostname = os.hostname()
  const hostSum = hostname
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), hostname.length + BASE)
  return pid + pad(hostSum.toString(BASE), 2)
})()

let counter = 0

export function newId(): string {
  counter = (counter + 1) % DISCRETE_VALUES
  const timestamp = Date.now().toString(BASE)
  const count = pad(counter.toString(BASE), BLOCK)
  return `c${timestamp}${count}${fingerprint}${randomBlock()}${randomBlock()}`
}
