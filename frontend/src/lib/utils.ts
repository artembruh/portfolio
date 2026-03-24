export function formatSupply(raw: string): string {
  try {
    return BigInt(raw).toLocaleString();
  } catch {
    return raw;
  }
}
