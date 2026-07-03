const TOKEN_KEY = 'lobby_token';

export function getAuthToken(): string {
  return sessionStorage.getItem(TOKEN_KEY) || '';
}

export function setAuthToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}
