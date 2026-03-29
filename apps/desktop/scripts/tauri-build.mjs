/**
 * Some environments (e.g. CI=1) set CI to a value the Tauri CLI rejects
 * (`--ci` only accepts true|false).
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

if (process.env.CI === '1') {
  process.env.CI = 'true'
}

const desktopRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const extraArgs = process.argv.slice(2)
const run = spawnSync('tauri', ['build', ...extraArgs], {
  cwd: desktopRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: process.env,
})

process.exit(run.status ?? 1)
