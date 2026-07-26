const axios = require('axios')
const StaticMaps = require('staticmaps')
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

// NOTE ON LIMITS (read before scaling this to group-wide use):
// - OSRM public demo server (router.project-osrm.org) is for light/testing use only,
//   not production traffic. Heavy bot usage will get you rate-limited or blocked.
//   If this command gets popular, self-host an OSRM instance.
// - tile.openstreetmap.org is the free no-key tile source. OSM's usage policy caps
//   this at light, non-bulk use too — same story, self-host tiles (or pay for a
//   tile provider) if this scales past personal/dev use.

const PIN_PATH = path.join(__dirname, '..', 'assets', 'pin.png')

module.exports = {
    name: 'distance',
    alias: ['dist', 'directions', 'route'],
    desc: 'Get a map showing the route between two places, or from your location to a place',
    category: 'Tools',
    usage: '.distance <place A> | <place B>  OR  .distance <place>',

    execute: async (sock, m, { args, reply, prefix }) => {
        const raw = args.join(' ').trim()

        if (!raw) {
            return reply(`\`✘ Usage: ${prefix}distance <place A> | <place B>\`\n\`or: ${prefix}distance <place>\` (from your current location)`)
        }

        await sock.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })

        const parts = raw.split('|').map(p => p.trim()).filter(Boolean)
        const originQuery = parts.length >= 2 ? parts[0] : null
        const destQuery = parts.length >= 2 ? parts[1] : parts[0]

        try {
            const destPlace = await geocode(destQuery)
            if (!destPlace) {
                await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } })
                return reply(`\`✘ No location found for "${destQuery}"\``)
            }

            let origin, originLabel, usedFallback = false

            if (originQuery) {
                const originPlace = await geocode(originQuery)
                if (!originPlace) {
                    await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } })
                    return reply(`\`✘ No location found for "${originQuery}"\``)
                }
                origin = { lat: parseFloat(originPlace.lat), lon: parseFloat(originPlace.lon) }
                originLabel = shortenName(originPlace.display_name || originQuery)
            } else {
                const quotedLoc = extractQuotedLocation(m)
                if (quotedLoc) {
                    origin = quotedLoc
                    originLabel = 'Your shared location'
                } else {
                    origin = { lat: 6.5244, lon: 3.3792 }
                    originLabel = 'Your location (default — reply to a shared location for accuracy)'
                    usedFallback = true
                }
            }

            const dest = { lat: parseFloat(destPlace.lat), lon: parseFloat(destPlace.lon) }
            const destLabel = shortenName(destPlace.display_name || destQuery)

            // Get the real road route from OSRM
            const routeData = await getOsrmRoute(origin, dest)
            const routeCoords = routeData
                ? routeData.geometry.coordinates.map(([lon, lat]) => [lon, lat])
                : [[origin.lon, origin.lat], [dest.lon, dest.lat]] // straight fallback if OSRM fails

            const distanceKm = routeData ? routeData.distance / 1000 : haversineKm(origin.lat, origin.lon, dest.lat, dest.lon)
            const durationMin = routeData ? Math.round(routeData.duration / 60) : null
            const isRealRoute = !!routeData

            const distanceText = distanceKm < 1
                ? `${Math.round(distanceKm * 1000)} m`
                : `${distanceKm.toFixed(2)} km`

            await ensurePinImage()

            const map = new StaticMaps({ width: 800, height: 600 })

            map.addLine({
                coords: routeCoords,
                color: '#1E88E5CC',
                width: 5
            })

            map.addMarker({
                coord: [origin.lon, origin.lat],
                img: PIN_PATH,
                width: 32,
                height: 32,
                offsetX: 16,
                offsetY: 32
            })

            map.addMarker({
                coord: [dest.lon, dest.lat],
                img: PIN_PATH,
                width: 32,
                height: 32,
                offsetX: 16,
                offsetY: 32
            })

            await map.render()
            const buffer = await map.image.buffer('image/png')

            const durationText = durationMin !== null
                ? ` · ~${durationMin} min drive`
                : ''

            const routeNote = isRealRoute ? '' : '\n🚧 Route service unavailable — showing straight-line only.'
            const fallbackNote = usedFallback
                ? `\n🚧 No shared location found — used default fallback coords. Reply to a live/current location message with ${prefix}distance <place> for accuracy.`
                : ''

            const caption = `📏 *${distanceText}*${durationText}\n*From:* ${originLabel}\n*To:* ${destLabel}${routeNote}${fallbackNote}`

            await sock.sendMessage(m.chat, {
                image: buffer,
                caption
            }, { quoted: m })

            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } })

        } catch (err) {
            console.error('[DISTANCE ERROR]', err.message)
            await sock.sendMessage(m.chat, { react: { text: '💤', key: m.key } })
            reply('`✘ Failed to build route map`')
        }
    }
}

async function geocode(query) {
    const encodedQuery = encodeURIComponent(query)
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1`

    const response = await axios.get(url, {
        headers: {
            'User-Agent': 'CRYSNOVA-Bot/1.0',
            'Accept': 'application/json'
        },
        timeout: 15000
    })

    const results = response.data
    if (!results || results.length === 0) return null
    return results[0]
}

// Real road route via OSRM public demo server. Returns null on any failure
// so the caller can fall back to a straight line instead of crashing.
async function getOsrmRoute(origin, dest) {
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${dest.lon},${dest.lat}?overview=full&geometries=geojson`
        const response = await axios.get(url, { timeout: 15000 })

        if (response.data.code !== 'Ok' || !response.data.routes?.length) return null

        const route = response.data.routes[0]
        return {
            geometry: route.geometry, // { coordinates: [[lon,lat], ...] }
            distance: route.distance, // meters
            duration: route.duration  // seconds
        }
    } catch (err) {
        console.error('[OSRM ERROR]', err.message)
        return null
    }
}

function extractQuotedLocation(m) {
    const quoted = m.quoted || m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    if (!quoted) return null

    const locMsg = quoted.locationMessage || quoted.liveLocationMessage
    if (!locMsg) return null

    const lat = locMsg.degreesLatitude
    const lon = locMsg.degreesLongitude
    if (typeof lat !== 'number' || typeof lon !== 'number') return null

    return { lat, lon }
}

function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

function toRad(deg) {
    return deg * (Math.PI / 180)
}

function shortenName(name) {
    return name.length > 100 ? name.substring(0, 97) + '...' : name
}

// Generate a simple red pin PNG once, cached to disk, so StaticMaps has a
// marker image to use. Avoids shipping a binary asset in the repo.
async function ensurePinImage() {
    if (fs.existsSync(PIN_PATH)) return

    const dir = path.dirname(PIN_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    const svg = `
    <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <path d="M32 2C18 2 8 12 8 26c0 18 24 36 24 36s24-18 24-36C56 12 46 2 32 2z"
              fill="#E53935" stroke="#B71C1C" stroke-width="2"/>
        <circle cx="32" cy="26" r="10" fill="#FFFFFF"/>
    </svg>`

    await sharp(Buffer.from(svg)).png().toFile(PIN_PATH)
}
