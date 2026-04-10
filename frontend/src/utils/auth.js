const AUTH_STORAGE_KEY = 'phantom-load:auth'

export function loadStoredAuth() {
  if (typeof window === 'undefined') {
    return { token: null, user: null }
  }

  try {
    const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY)

    if (!rawValue) {
      return { token: null, user: null }
    }

    const parsed = JSON.parse(rawValue)

    return {
      token: typeof parsed?.token === 'string' ? parsed.token : null,
      user:
        parsed?.user &&
        typeof parsed.user === 'object' &&
        typeof parsed.user._id === 'string' &&
        typeof parsed.user.email === 'string'
          ? parsed.user
          : null,
    }
  } catch {
    return { token: null, user: null }
  }
}

export function saveStoredAuth(authState) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState))
  } catch {
    // Ignore storage failures so auth flow can continue in memory.
  }
}

export function clearStoredAuth() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch {
    // Ignore storage cleanup failures.
  }
}
