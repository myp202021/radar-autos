/**
 * Radar Autos — Scraper ChileAutos.cl
 *
 * Extrae listings del JSON embebido en __NEXT_DATA__ (Next.js SSR)
 * No necesita Apify ni proxy — fetch directo funciona.
 *
 * Test: Toyota Hilux 2020-2026
 *
 * Uso: node scripts/test-chileautos.js
 */

const BASE = 'https://www.chileautos.cl'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8',
}

function findCards(obj, results = []) {
  if (!obj || typeof obj !== 'object') return results
  if (obj.type === 'ListingCard') { results.push(obj); return results }
  if (Array.isArray(obj)) { for (const item of obj) findCards(item, results) }
  else { for (const val of Object.values(obj)) { if (typeof val === 'object') findCards(val, results) } }
  return results
}

function parseCard(card) {
  const t = card.action?.tracking?.additionalAttributes || {}
  const d = card.action?.data || {}
  return {
    id: t['tracking/item/networkId'] || card.id,
    marca: t['tracking/item/make'] || null,
    modelo: t['tracking/item/model'] || null,
    year: parseInt(t['tracking/item/year']) || null,
    precio_clp: parseInt(t['tracking/item/price']) || null,
    region: t['tracking/item/state'] || null,
    tipo_vendedor: t['tracking/item/adtype'] || null, // Particular | Dealer
    tipo_uso: t['tracking/form/search/type'] || null, // Nuevo | Usado
    url: d.url ? BASE + d.url.split('?')[0] : null,
    imagen: d.prefetchImage || null,
    titulo: d.prefetchTitle?.trim() || null,
  }
}

async function scrapePage(url) {
  console.log('  Scraping:', url)
  const res = await fetch(url, { headers: HEADERS, redirect: 'follow' })
  if (!res.ok) { console.log('  HTTP', res.status); return [] }

  const html = await res.text()
  const nextIdx = html.indexOf('__NEXT_DATA__')
  if (nextIdx === -1) { console.log('  No __NEXT_DATA__ encontrado'); return [] }

  const start = html.indexOf('{', nextIdx)
  const scriptEnd = html.indexOf('</script>', start)
  const data = JSON.parse(html.substring(start, scriptEnd))

  const cards = findCards(data)
  return cards.map(parseCard).filter(c => c.marca && c.precio_clp)
}

async function main() {
  console.log('=== Radar Autos — Test Toyota Hilux 2020+ ===\n')

  // URL de busqueda: Toyota Hilux (todas las variantes)
  const url = BASE + '/vehiculos/toyota/hilux/'

  const listings = await scrapePage(url)

  // Filtrar solo 2020+
  const filtered = listings.filter(l => l.year >= 2020)

  console.log('\n=== RESULTADOS ===')
  console.log('Total listings en pagina:', listings.length)
  console.log('Filtrados 2020+:', filtered.length)
  console.log('')

  // Ordenar por precio
  filtered.sort((a, b) => a.precio_clp - b.precio_clp)

  filtered.forEach((l, i) => {
    const precio = '$' + l.precio_clp.toLocaleString('es-CL')
    console.log(`${i + 1}. ${l.year} ${l.marca} ${l.modelo} — ${precio}`)
    console.log(`   Region: ${l.region} | Vendedor: ${l.tipo_vendedor}`)
    console.log(`   URL: ${l.url}`)
    console.log('')
  })

  // Resumen por año
  console.log('=== Resumen por año ===')
  const byYear = {}
  filtered.forEach(l => {
    if (!byYear[l.year]) byYear[l.year] = { count: 0, prices: [] }
    byYear[l.year].count++
    byYear[l.year].prices.push(l.precio_clp)
  })
  Object.keys(byYear).sort().forEach(y => {
    const d = byYear[y]
    const avg = Math.round(d.prices.reduce((a, b) => a + b, 0) / d.prices.length)
    const min = Math.min(...d.prices)
    const max = Math.max(...d.prices)
    console.log(`  ${y}: ${d.count} listings | Min $${min.toLocaleString('es-CL')} | Avg $${avg.toLocaleString('es-CL')} | Max $${max.toLocaleString('es-CL')}`)
  })
}

main().catch(e => { console.error(e); process.exit(1) })
