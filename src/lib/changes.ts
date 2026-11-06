// Comparing and merging the plain JSON-shaped values a character is made of.

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value != null && !Array.isArray(value)

/**
 * Whether two values hold the same data: arrays item by item, objects key by key. A key holding
 * undefined matches a missing one, as JSON (how characters are stored) does not keep it.
 */
export function isSameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, i) => isSameValue(item, b[i]))
  if (isPlainObject(a) && isPlainObject(b)) {
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].every((key) => isSameValue(a[key], b[key]))
  }
  return false
}

/**
 * `target` with only what differs between `before` and `after` applied to it. An object present in
 * all three is merged key by key, so a change to one of its keys leaves the others as they are in
 * `target`; anything else that changed (a value, an array) is replaced by its `after` value.
 */
export function applyChanges<T extends object>(target: T, before: object, after: object): T {
  const live = target as Record<string, unknown>
  const was = before as Record<string, unknown>
  const now = after as Record<string, unknown>
  const result: Record<string, unknown> = { ...live }
  for (const key of new Set([...Object.keys(was), ...Object.keys(now)])) {
    if (isSameValue(was[key], now[key])) continue
    result[key] = isPlainObject(was[key]) && isPlainObject(now[key]) && isPlainObject(live[key])
      ? applyChanges(live[key], was[key], now[key])
      : now[key]
  }
  return result as T
}

/** The given fields of `source`, as a new object. */
export function pickFields<T extends object, K extends keyof T>(source: T, fields: readonly K[]): Pick<T, K> {
  return Object.fromEntries(fields.map((field) => [field, source[field]])) as Pick<T, K>
}
