import { createServer } from 'vite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const expected = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'))
const address = 'http://127.0.0.1:1420'

// F5 与网页版任务共用同一个开发服务；只复用可确认属于本项目的 Vite 服务。
async function existingServer() {
  try {
    const response = await fetch(`${address}/package.json`, { signal: AbortSignal.timeout(1500) })
    const pkg = await response.json()
    const client = await fetch(`${address}/@vite/client`, { signal: AbortSignal.timeout(1500) })
    return response.ok && pkg.name === expected.name && pkg.version === expected.version && client.ok && (await client.text()).includes('vite')
  } catch { return false }
}

if (await existingServer()) {
  console.log(`Reusing KeyBoardTestUtility Vite server at ${address}`)
} else {
  let server
  try {
    server = await createServer({ root: fileURLToPath(root) })
    await server.listen()
    server.printUrls()
  } catch (error) {
    await server?.close()
    console.error('Cannot start the development server. Port 1420 may be used by another application.')
    console.error(error.message)
    process.exitCode = 1
  }
}
