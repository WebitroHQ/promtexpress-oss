import { NextResponse } from 'next/server'
import { default as handler } from "./opengraph-image.tsx"

if (typeof handler !== 'function') {
    throw new Error('Default export is missing in "./opengraph-image.tsx"')
}

export async function GET(_, ctx) {
    return handler({ params: ctx.params })
}

export * from "./opengraph-image.tsx"
