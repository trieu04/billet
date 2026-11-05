const RETURNABLE = /^\/(admin|journal|stats|categories|settings)(\/|$)/

/** Where to go after signing in: back to the app page the user came from, else the journal. */
export function postLoginPath(state: unknown): string {
  const from =
    state && typeof state === 'object' && 'from' in state && typeof state.from === 'string'
      ? state.from
      : ''
  return RETURNABLE.test(from) ? from : '/journal'
}
