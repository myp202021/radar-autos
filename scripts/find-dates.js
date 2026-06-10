var BASE = "https://www.chileautos.cl"
var HEADERS = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" }

function findCards(obj, r) {
  r = r || []
  if (!obj || typeof obj !== "object") return r
  if (obj.type === "ListingCard") { r.push(obj); return r }
  if (Array.isArray(obj)) { for (var i = 0; i < obj.length; i++) findCards(obj[i], r) }
  else { var keys = Object.keys(obj); for (var k = 0; k < keys.length; k++) { if (typeof obj[keys[k]] === "object") findCards(obj[keys[k]], r) } }
  return r
}

fetch(BASE + "/vehiculos/toyota/hilux/", { headers: HEADERS }).then(function(r) { return r.text() }).then(function(html) {
  var idx = html.indexOf("__NEXT_DATA__")
  var start = html.indexOf("{", idx)
  var end = html.indexOf("</scr" + "ipt>", start)
  var data = JSON.parse(html.substring(start, end))
  var cards = findCards(data)

  console.log("Total cards:", cards.length)

  // Check card 3 for any date-related fields
  var card = cards[3]
  var json = JSON.stringify(card)

  // Search for date patterns
  var datePatterns = json.match(/"[^"]*(?:date|time|publish|created|listed|posted|ago|day|hour|fecha|updated|modified|new)[^"]*"\s*:\s*"[^"]*"/gi)
  console.log("\nDate-related key:value pairs:")
  if (datePatterns) datePatterns.forEach(function(f) { console.log("  " + f) })
  else console.log("  None found")

  // Search for relative time text
  var timeAgo = json.match(/"[^"]*(?:hace|ago|hour|day|dias|horas|minute|ayer|today|hoy|semana|week)[^"]*"/gi)
  console.log("\nRelative time text:")
  if (timeAgo) timeAgo.forEach(function(f) { console.log("  " + f) })
  else console.log("  None found")

  // Search for date format strings (2026-06, Jun, etc)
  var dateFormats = json.match(/2026[^"]{0,20}|"[^"]*(?:jun|jul|may|abr|apr|mar|feb|ene|jan)[^"]*"/gi)
  console.log("\nDate format strings:")
  if (dateFormats) dateFormats.forEach(function(f) { console.log("  " + f.substring(0, 60)) })
  else console.log("  None found")

  // Print ALL unique short strings to find any date indicator
  var allStrings = json.match(/"[^"]{2,60}"/g) || []
  var seen = {}
  var filtered = allStrings.filter(function(s) {
    if (seen[s]) return false
    seen[s] = 1
    if (/http|pxc|tracking\/|event\/|merlin|csnInsights|appXdmData|_carsales|searchResult|frontEnd|webInteraction|linkClicks|content_type|trksrc|searchTS|csnEventId|NavigateAction|ListingCard|showItemDetails/i.test(s)) return false
    return true
  })
  console.log("\nAll unique strings in card (filtered):")
  filtered.forEach(function(s) { console.log("  " + s) })
}).catch(function(e) { console.error(e) })
