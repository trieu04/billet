/** Round-robin pool of API keys. Each call starts at the next key; `attempt` walks the pool. */
export class ApiKeyPool {
  private nextIndex = 0

  constructor(private readonly keys: readonly string[]) {
    if (keys.length === 0) throw new Error('ApiKeyPool requires at least one key')
  }

  get size(): number {
    return this.keys.length
  }

  /** Keys in the order one request should try them, starting at the rotating cursor. */
  order(): string[] {
    const start = this.nextIndex
    this.nextIndex = (this.nextIndex + 1) % this.keys.length
    return Array.from(
      { length: this.keys.length },
      (_, i) => this.keys[(start + i) % this.keys.length],
    )
  }
}
