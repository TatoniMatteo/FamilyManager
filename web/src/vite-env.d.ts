/// <reference types="vite/client" />

declare module '*.docs?raw' {
    const content: string
    export default content
}

declare module '*.docs' {
    const content: string
    export default content
}
