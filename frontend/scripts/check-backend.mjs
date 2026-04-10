import { loadEnv } from 'vite'

const DEFAULT_API_BASE_URL = 'http://localhost:3001'
const mode = process.env.NODE_ENV || 'development'
const env = loadEnv(mode, process.cwd(), '')
const apiBaseUrl = (env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '')
const healthUrl = `${apiBaseUrl}/api/health`

async function main() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4000)

  try {
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      console.warn(`[Phantom Load] Backend responded with ${response.status} at ${healthUrl}`)
      if (data) {
        console.warn('[Phantom Load] Response body:', data)
      }
      return
    }

    console.log(`[Phantom Load] Backend connected at ${apiBaseUrl}`)
    if (data) {
      console.log('[Phantom Load] Health response:', data)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.warn(`[Phantom Load] Backend not reachable at ${apiBaseUrl}`)
    console.warn(`[Phantom Load] Reason: ${message}`)
  } finally {
    clearTimeout(timeout)
  }
}

await main()
