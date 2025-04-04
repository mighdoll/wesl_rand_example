
export function mapKeys(
  o: Record<string, any>,
  fn: (s: string) => string
): typeof o {
  const newEntries = Object.entries(o).map(([k, v]) => [fn(k), v]);
  return Object.fromEntries(newEntries);
}
