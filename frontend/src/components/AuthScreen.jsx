import { useState } from 'react'

function AuthScreen({ onLogin, onRegister, theme, setTheme }) {
  const [mode, setMode] = useState('login')
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(field, value) {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }))
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setErrorMessage('')
  }

  function validate() {
    const trimmedName = formState.name.trim()
    const trimmedEmail = formState.email.trim()
    const trimmedPassword = formState.password

    if (mode === 'register' && !trimmedName) {
      return 'Please enter your name.'
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return 'Please enter a valid email address.'
    }

    if (mode === 'register' && trimmedPassword.length < 6) {
      return 'Password must be at least 6 characters.'
    }

    if (mode === 'login' && !trimmedPassword) {
      return 'Please enter your password.'
    }

    return ''
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const validationError = validate()

    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage('')

      if (mode === 'register') {
        await onRegister({
          name: formState.name.trim(),
          email: formState.email.trim(),
          password: formState.password,
        })
      } else {
        await onLogin({
          email: formState.email.trim(),
          password: formState.password,
        })
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Authentication failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="auth-shell">
      <div className="auth-topbar">
        <div className="brand-block">
          <div className="brand-spark" aria-hidden="true">
            PL
          </div>
          <div className="brand-copy">
            <p className="brand-title">Phantom Load</p>
            <p className="brand-subtitle">Secure home energy audit</p>
          </div>
        </div>

        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
          <span className="theme-toggle-label">Theme</span>
          <strong>{theme === 'light' ? 'Light' : 'Dark'}</strong>
        </button>
      </div>

      <article className="auth-card panel">
        <div className="auth-copy">
          <p className="eyebrow">Authentication Required</p>
          <h1>{mode === 'login' ? 'Sign in to open your audit dashboard.' : 'Create your account to begin.'}</h1>
          <p className="section-copy">
            Only authenticated users can access the Phantom Load dashboard, inventory, simulator,
            and AI advisor.
          </p>
        </div>

        <div className="auth-toggle-row">
          <button
            type="button"
            className={`button ${mode === 'login' ? 'button-primary' : 'button-secondary'}`}
            onClick={() => switchMode('login')}
            disabled={isSubmitting}
          >
            Login
          </button>
          <button
            type="button"
            className={`button ${mode === 'register' ? 'button-primary' : 'button-secondary'}`}
            onClick={() => switchMode('register')}
            disabled={isSubmitting}
          >
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' ? (
            <label className="field-stack">
              <span className="field-label">Name</span>
              <input
                className="input"
                type="text"
                value={formState.name}
                onChange={(event) => updateField('name', event.target.value)}
                disabled={isSubmitting}
                autoComplete="name"
              />
            </label>
          ) : null}

          <label className="field-stack">
            <span className="field-label">Email</span>
            <input
              className="input"
              type="email"
              value={formState.email}
              onChange={(event) => updateField('email', event.target.value)}
              disabled={isSubmitting}
              autoComplete="email"
            />
          </label>

          <label className="field-stack">
            <span className="field-label">Password</span>
            <input
              className="input"
              type="password"
              value={formState.password}
              onChange={(event) => updateField('password', event.target.value)}
              disabled={isSubmitting}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
          </label>

          {errorMessage ? (
            <div className="auth-error" role="alert">
              {errorMessage}
            </div>
          ) : null}

          <button type="submit" className="button button-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : mode === 'register' ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p className="auth-note">
          {mode === 'register'
            ? 'Use a valid email and a password with at least 6 characters.'
            : 'Use the email and password saved in your backend user collection.'}
        </p>
      </article>
    </section>
  )
}

export default AuthScreen
