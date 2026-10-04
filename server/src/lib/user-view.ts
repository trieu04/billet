// Shape a User row into a safe public object (never expose passwordHash).
export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  createdAt: Date;
}

export function toPublicUser(user: {
  id: string;
  username: string;
  displayName: string;
  createdAt: Date;
}): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    createdAt: user.createdAt,
  };
}
