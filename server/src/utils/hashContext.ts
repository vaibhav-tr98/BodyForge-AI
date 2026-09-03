import { createHash } from "crypto";

/**
 * Recursively serialise a value with sorted object keys,
 * producing a stable JSON string regardless of key insertion order.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object" || value instanceof Date) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }
  const keys = Object.keys(value as object).sort();
  return (
    "{" +
    keys
      .map(
        (k) =>
          JSON.stringify(k) + ":" + stableStringify((value as Record<string, unknown>)[k])
      )
      .join(",") +
    "}"
  );
}

/**
 * Produce a deterministic SHA-256 hex digest of any serialisable value.
 * Object keys are sorted recursively so the hash is stable regardless
 * of the order properties were constructed.
 */
export function hashContext(context: unknown): string {
  return createHash("sha256").update(stableStringify(context)).digest("hex");
}
