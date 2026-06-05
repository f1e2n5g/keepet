/** 產生帶前綴的唯一 ID，例如 newId("task") -> "task_a1b2c3..." */
export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

export function now(): number {
  return Date.now();
}
