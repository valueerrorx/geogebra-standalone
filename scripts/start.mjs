import { spawn } from 'child_process'
import electron from 'electron'
import { fileURLToPath } from 'url'
import path from 'path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(root)

await import('./build.mjs')

const { NODE_OPTIONS, ...envBase } = process.env
const env = { ...envBase }
delete env.VITE_DEV_SERVER_HOST
delete env.VITE_DEV_SERVER_PORT

const child = spawn(electron, ['.', '--geogebra-dist'], { stdio: 'inherit', env })
child.on('exit', (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0))
})
