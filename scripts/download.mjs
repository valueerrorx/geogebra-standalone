import https from 'https'
import http from 'http'
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { pipeline } from 'stream/promises'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DOWNLOAD_URL = 'https://download.geogebra.org/package/geogebra-math-apps-bundle'
const ZIP_PATH = path.join(ROOT, 'geogebra-bundle.zip')
const EXTRACT_DIR = path.join(ROOT, 'packages', 'renderer', 'public', 'geogebra')

const httpsAgent = new https.Agent({ keepAlive: false })
const httpAgent = new http.Agent({ keepAlive: false })

function resolveRedirect(base, location) {
    if (location.startsWith('http://') || location.startsWith('https://')) return location
    const u = new URL(base)
    return `${u.protocol}//${u.host}${location}`
}

function get(url) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http
        const agent = url.startsWith('https') ? httpsAgent : httpAgent
        lib.get(url, { agent }, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                get(resolveRedirect(url, res.headers.location)).then(resolve, reject)
            } else if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`))
            } else {
                resolve(res)
            }
        }).on('error', reject)
    })
}

async function download(url, dest) {
    console.log(`Downloading ${url} ...`)
    const res = await get(url)
    const total = parseInt(res.headers['content-length'] || '0', 10)
    let received = 0
    let lastPercent = -1

    res.on('data', (chunk) => {
        received += chunk.length
        if (total > 0) {
            const percent = Math.floor((received / total) * 100)
            if (percent !== lastPercent && percent % 5 === 0) {
                process.stdout.write(`\r  ${percent}% (${(received / 1024 / 1024).toFixed(1)} / ${(total / 1024 / 1024).toFixed(1)} MB)`)
                lastPercent = percent
            }
        }
    })

    await pipeline(res, fs.createWriteStream(dest))
    console.log('\n  Done.')
}

// Minimal ZIP parser using Node built-ins
// Reads End of Central Directory, then Central Directory, then extracts entries
async function unzip(zipPath, destDir) {
    console.log(`Extracting to ${destDir} ...`)

    if (fs.existsSync(destDir)) {
        fs.rmSync(destDir, { recursive: true, force: true })
    }

    const buf = fs.readFileSync(zipPath)

    // Find End of Central Directory signature (0x06054b50)
    let eocdOffset = -1
    for (let i = buf.length - 22; i >= 0; i--) {
        if (buf.readUInt32LE(i) === 0x06054b50) {
            eocdOffset = i
            break
        }
    }
    if (eocdOffset === -1) throw new Error('Invalid ZIP: EOCD not found')

    const cdCount = buf.readUInt16LE(eocdOffset + 8)
    let cdOffset = buf.readUInt32LE(eocdOffset + 16)

    for (let i = 0; i < cdCount; i++) {
        if (buf.readUInt32LE(cdOffset) !== 0x02014b50) throw new Error('Invalid ZIP: Central Directory entry signature mismatch')

        const compression   = buf.readUInt16LE(cdOffset + 10)
        const fileNameLen   = buf.readUInt16LE(cdOffset + 28)
        const extraLen      = buf.readUInt16LE(cdOffset + 30)
        const commentLen    = buf.readUInt16LE(cdOffset + 32)
        const localOffset   = buf.readUInt32LE(cdOffset + 42)
        const fileName      = buf.toString('utf8', cdOffset + 46, cdOffset + 46 + fileNameLen)

        cdOffset += 46 + fileNameLen + extraLen + commentLen

        if (fileName.endsWith('/')) continue  // directory entry

        // Read local file header
        const lfhOffset     = localOffset
        if (buf.readUInt32LE(lfhOffset) !== 0x04034b50) throw new Error('Invalid ZIP: Local File Header signature mismatch')
        const lfhFileNameLen = buf.readUInt16LE(lfhOffset + 26)
        const lfhExtraLen    = buf.readUInt16LE(lfhOffset + 28)
        const compressedSize = buf.readUInt32LE(lfhOffset + 18)
        const dataOffset     = lfhOffset + 30 + lfhFileNameLen + lfhExtraLen

        const compressedData = buf.subarray(dataOffset, dataOffset + compressedSize)

        // Strip leading directory component if all files share one root folder
        const outRelPath = fileName
        const outPath = path.join(destDir, outRelPath)
        fs.mkdirSync(path.dirname(outPath), { recursive: true })

        if (compression === 0) {
            // Stored (no compression)
            fs.writeFileSync(outPath, compressedData)
        } else if (compression === 8) {
            // Deflate
            const decompressed = zlib.inflateRawSync(compressedData)
            fs.writeFileSync(outPath, decompressed)
        } else {
            throw new Error(`Unsupported compression method: ${compression}`)
        }
    }

    // Flatten single top-level directory if present
    const entries = fs.readdirSync(destDir)
    if (entries.length === 1 && fs.statSync(path.join(destDir, entries[0])).isDirectory()) {
        const subDir = path.join(destDir, entries[0])
        for (const entry of fs.readdirSync(subDir)) {
            fs.renameSync(path.join(subDir, entry), path.join(destDir, entry))
        }
        fs.rmdirSync(subDir)
        console.log(`  Flattened top-level directory: ${entries[0]}`)
    }

    console.log('  Extraction complete.')
}

async function main() {
    try {
        await download(DOWNLOAD_URL, ZIP_PATH)
        await unzip(ZIP_PATH, EXTRACT_DIR)
        fs.unlinkSync(ZIP_PATH)
        console.log(`\nGeoGebra bundle ready at:\n  ${EXTRACT_DIR}`)
    } catch (err) {
        console.error('\nError:', err.message)
        if (fs.existsSync(ZIP_PATH)) fs.unlinkSync(ZIP_PATH)
        process.exit(1)
    }
}

main()
