import { getAssetFromKV, mapRequestToAsset } from '@cloudflare/kv-asset-handler'

// Enables edge cdn - https://developers.cloudflare.com/workers/learning/how-the-cache-works/
const DEBUG = true
const ENABLE_ASSET_CACHE = false
const ENABLE_KEY_CACHE = true
const BACKEND_URL = 'https://unirep.tubby.cloud'

addEventListener('fetch', (event) => {
    event.respondWith(generateResponse(event))
})

async function generateResponse(event) {
    // https://www.npmjs.com/package/@cloudflare/kv-asset-handler#optional-arguments
    const url = new URL(event.request.url)
    if (url.pathname.startsWith('/build')) {
        // proxy to the backend
        if (ENABLE_KEY_CACHE) {
            const response = await caches.default.match(event.request.url)
            if (response) {
                return response
            }
        }
        const r = await fetch(`${BACKEND_URL}${url.pathname}`, {
            cacheTtl: 24 * 60 * 60,
            cacheEverything: true,
        })
        const newResponse = new Response(r.body, r)
        newResponse.headers.set('cache-control', 'public, max-age=86400')
        if (ENABLE_KEY_CACHE) {
            const [b1, b2] = r.body.tee()
            event.waitUntil(
                caches.default.put(
                    event.request.url,
                    new Response(b1, newResponse)
                )
            )
            return new Response(b2, newResponse)
        } else {
            return new Response(r.body, newResponse)
        }
    }
    const spaKeyModifier = (request) => {
        const _url = new URL(request.url)
        if (_url.pathname.indexOf('.') === -1) {
            // it's a SPA route
            _url.pathname = '/'
            return mapRequestToAsset(new Request(_url.toString(), request))
        } else {
            return mapRequestToAsset(request)
        }
    }
    const asset = await getAssetFromKV(event, {
        bypassCache: !ENABLE_ASSET_CACHE,
        mapRequestToAsset: spaKeyModifier,
    })
    let body = asset.body
    if (ENABLE_ASSET_CACHE) {
        // put the asset in the cache
        // split the response stream, give one to the cache
        if (DEBUG) {
            console.log('Stream split')
        }
        const [b1, b2] = asset.body.tee()
        // cause the script to stay alive until this promise resolves
        event.waitUntil(
            caches.default.put(event.request.url, new Response(b1, asset))
        )
        body = b2
    }
    // build response from body
    const response = new Response(body, asset)
    response.headers.set('Referrer-Policy', 'unsafe-url')
    return response
}
