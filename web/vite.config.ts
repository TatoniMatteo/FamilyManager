import type {ProxyOptions} from 'vite'
import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {execFileSync} from 'node:child_process'
import {existsSync, mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

const certificateDirectory = join(tmpdir(), 'familymanager-vite-tls')
const certificate = join(certificateDirectory, 'localhost.pem')
const privateKey = join(certificateDirectory, 'localhost-key.pem')

function ensureDevelopmentCertificate() {
    if (existsSync(certificate) && existsSync(privateKey)) return
    mkdirSync(certificateDirectory, {recursive: true})
    execFileSync('openssl', [
        'req', '-x509', '-nodes', '-days', '3650', '-newkey', 'rsa:3072',
        '-keyout', privateKey, '-out', certificate, '-subj', '/CN=localhost',
        '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1',
    ], {stdio: 'ignore'})
}

const backendProxy: ProxyOptions = {
    target: 'http://localhost:8080',
    changeOrigin: true,
    configure(proxy) {
        proxy.on('proxyReq', (proxyRequest, request) => {
            proxyRequest.setHeader('X-Forwarded-Proto', 'https')
            proxyRequest.setHeader('X-Forwarded-Host', request.headers.host?.toString() ?? 'localhost:5173')
        })
    },
}

// In development, send API requests through Vite to the local Spring Boot service.
export default defineConfig(({command}) => {
    if (command === 'serve') ensureDevelopmentCertificate()
    return {
        plugins: [react()],
        server: {
            https: command === 'serve' ? {cert: certificate, key: privateKey} : undefined,
            proxy: {
                '/api': {
                    ...backendProxy,
                },
                '/oauth2': {...backendProxy},
                '/login/oauth2': {...backendProxy},
            },
        },
    }
})
