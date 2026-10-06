            import { NextResponse } from 'next/server'
            import handler from "./manifest.ts"
            import { resolveRouteData } from
'next/dist/build/webpack/loaders/metadata/resolve-route-data'

            const contentType = "application/manifest+json"
            const cacheControl = "public, max-age=0, must-revalidate"
            const fileType = "manifest"

            if (typeof handler !== 'function') {
                throw new Error('Default export is missing in "./manifest.ts"')
            }

            export async function GET() {
              const data = await handler()
              const content = resolveRouteData(data, fileType)

              return new NextResponse(content, {
                headers: {
                  'Content-Type': contentType,
                  'Cache-Control': cacheControl,
                },
              })
            }

            export * from "./manifest.ts"
        