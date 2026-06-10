/**
 * Radar Autos — Scraper ChileAutos solo PARTICULARES
 * Filtra automotoras, solo muestra vende-dueño
 * Output: JSON con listings para el dashboard
 */

var BASE = 'https://www.chileautos.cl'
var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'es-CL,es;q=0.9',
}

function findCards(obj, r) {
  r = r || []
  if (!obj || typeof obj !== 'object') return r
  if (obj.type === 'ListingCard') { r.push(obj); return r }
  if (Array.isArray(obj)) { for (var i = 0; i < obj.length; i++) findCards(obj[i], r) }
  else { var keys = Object.keys(obj); for (var k = 0; k < keys.length; k++) { if (typeof obj[keys[k]] === 'object') findCards(obj[keys[k]], r) } }
  return r
}

function parseCard(c) {
  var t = (c.action && c.action.tracking && c.action.tracking.additionalAttributes) || {}
  var d = (c.action && c.action.data) || {}
  return {
    id: t['tracking/item/networkId'] || '',
    marca: t['tracking/item/make'] || '',
    modelo: t['tracking/item/model'] || '',
    year: parseInt(t['tracking/item/year']) || 0,
    precio_clp: parseInt(t['tracking/item/price']) || 0,
    region: t['tracking/item/state'] || '',
    tipo_vendedor: t['tracking/item/adtype'] || '',
    tipo_uso: t['tracking/form/search/type'] || '',
    url: d.url ? BASE + d.url.split('?')[0] : '',
    imagen: d.prefetchImage || '',
    titulo: (d.prefetchTitle || '').trim(),
    ubicacion: (d.prefetchLocation || '').trim(),
  }
}

async function scrapePage(url) {
  var res = await fetch(url, { headers: HEADERS, redirect: 'follow' })
  if (!res.ok) return []
  var html = await res.text()
  var idx = html.indexOf('__NEXT_DATA__')
  if (idx === -1) return []
  var start = html.indexOf('{', idx)
  var end = html.indexOf('</script>', start)
  try {
    var data = JSON.parse(html.substring(start, end))
    return findCards(data).map(parseCard).filter(function(c) { return c.marca && c.precio_clp })
  } catch(e) { return [] }
}

async function main() {
  var marca = process.argv[2] || 'toyota'
  var modelo = process.argv[3] || 'hilux'
  var yearMin = parseInt(process.argv[4]) || 2020

  console.error('Scraping ' + marca + ' ' + modelo + ' ' + yearMin + '+...')

  var url = BASE + '/vehiculos/' + marca.toLowerCase() + '/' + modelo.toLowerCase() + '/'
  var all = await scrapePage(url)

  // Solo particulares + año mínimo
  var filtered = all.filter(function(l) {
    return l.tipo_vendedor === 'Particular' && l.year >= yearMin
  })

  filtered.sort(function(a, b) { return a.precio_clp - b.precio_clp })

  console.error('Total: ' + all.length + ' | Particulares ' + yearMin + '+: ' + filtered.length)

  // Output JSON limpio a stdout
  console.log(JSON.stringify(filtered, null, 2))
}

main().catch(function(e) { console.error(e); process.exit(1) })
