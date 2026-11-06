export const DELETE_CONFIRMATION_WORD = 'Delete'

export function isDeleteConfirmed(input: string) {
  return input.trim() === DELETE_CONFIRMATION_WORD
}
