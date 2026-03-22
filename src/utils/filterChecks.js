// filterChecks.js
// Parses <!-- meta: key=value ... --> annotations from tax-checks.md and filters
// out checks that definitely don't apply to the given extracted tax data.
// Conservative: when a field is missing/null/undefined, the check is INCLUDED.

function getVal(obj, path) {
  if (!obj || !path) return undefined
  return path.split('.').reduce((o, k) => (o != null ? o[k] : undefined), obj)
}

function coerceVal(val) {
  if (val === 'true') return true
  if (val === 'false') return false
  const n = Number(val)
  return isNaN(n) ? val : n
}

// Evaluate a single condition like "income.agi<68000" or "deductions.type=itemized"
function evalSingleCond(cond, data) {
  cond = cond.trim()
  if (!cond) return true

  if (cond === 'hasDependents') {
    const deps = getVal(data, 'dependents')
    return Array.isArray(deps) && deps.length > 0
  }

  const opMatch = cond.match(/^([^><=!]+)(>=|<=|!=|>|<|=)(.+)$/)
  if (!opMatch) return true  // unknown format → include conservatively

  const [, rawPath, op, rawVal] = opMatch
  const actual = getVal(data, rawPath.trim())
  if (actual === undefined || actual === null) return true  // missing field → include

  const expected = coerceVal(rawVal.trim())

  switch (op) {
    case '=':  return String(actual).toLowerCase() === String(expected).toLowerCase()
    case '!=': return String(actual).toLowerCase() !== String(expected).toLowerCase()
    case '>':  return Number(actual) > Number(expected)
    case '<':  return Number(actual) < Number(expected)
    case '>=': return Number(actual) >= Number(expected)
    case '<=': return Number(actual) <= Number(expected)
    default:   return true
  }
}

// A single condition clause may use || for OR between sub-conditions
function evalCond(cond, data) {
  return cond.split('||').some(part => evalSingleCond(part.trim(), data))
}

// requires value is comma-separated AND list; each element can have || for OR
function evalRequires(requiresVal, data) {
  return requiresVal.split(',').every(clause => evalCond(clause.trim(), data))
}

// Parse <!-- meta: key=value key2=value2 --> — values must be space-free
function parseMeta(line) {
  const m = line.match(/<!--\s*meta:\s*(.*?)\s*-->/)
  if (!m) return null
  const meta = {}
  const re = /\b(\w+)=(\S+)/g
  let match
  while ((match = re.exec(m[1])) !== null) {
    meta[match[1]] = match[2]
  }
  return Object.keys(meta).length > 0 ? meta : null
}

const FILING_ABBR = {
  MFJ: 'married filing jointly',
  MFS: 'married filing separately',
  S:   'single',
  HOH: 'head of household',
  QW:  'qualifying widow',
}

function matchesFiling(metaFiling, filingStatus) {
  if (!metaFiling || metaFiling === 'ALL') return true
  if (!filingStatus) return true

  const fs = filingStatus.toLowerCase()

  if (metaFiling.startsWith('NOT:')) {
    const code = metaFiling.slice(4).toUpperCase()
    const normalized = FILING_ABBR[code] || code.toLowerCase()
    return !fs.includes(normalized)
  }

  const normalized = FILING_ABBR[metaFiling.toUpperCase()] || metaFiling.toLowerCase()
  return fs.includes(normalized)
}

// state values use | as separator (e.g. state=TX|FL), not comma
function matchesState(metaState, residenceState) {
  if (!metaState || metaState === 'ALL') return true
  if (!residenceState) return true

  const state = String(residenceState).toUpperCase().trim()
  const allowed = metaState.split('|').map(s => s.trim().toUpperCase())
  return allowed.includes(state)
}

function matchesTaxYear(metaTaxYear, taxYear) {
  if (!metaTaxYear) return true
  if (taxYear === undefined || taxYear === null) return true

  const year = Number(taxYear)
  if (isNaN(year)) return true

  const m = metaTaxYear.match(/^(>=|<=|>|<|!=)?(\d{4})$/)
  if (!m) return true

  const op = m[1] || '='
  const v = Number(m[2])

  switch (op) {
    case '=':  return year === v
    case '!=': return year !== v
    case '>':  return year > v
    case '<':  return year < v
    case '>=': return year >= v
    case '<=': return year <= v
    default:   return true
  }
}

function shouldInclude(meta, data) {
  if (!meta) return true
  if (!matchesState(meta.state, data?.residenceState)) return false
  if (!matchesFiling(meta.filing, data?.filingStatus)) return false
  if (!matchesTaxYear(meta.taxYear, data?.taxYear)) return false
  return true
}

/**
 * Filter tax-checks.md markdown, removing checks that don't apply to the
 * given extracted tax data. Returns the filtered markdown string.
 *
 * Each ### check section may have a <!-- meta: ... --> annotation line.
 * Supported keys:
 *   state=NY|TX        - pipe-separated state codes; ALL means any state
 *   filing=MFJ         - required filing status; NOT:MFS to exclude one
 *   taxYear=>=2025     - tax year constraint
 *   requires=path>val  - field conditions, comma=AND, ||=OR within each clause
 */
export function filterChecks(markdown, extractedData) {
  const lines = markdown.split('\n')
  const output = []
  let inCheck = false
  let currentMeta = null
  let currentLines = []

  function flushCheck() {
    if (!inCheck) return
    if (shouldInclude(currentMeta, extractedData)) {
      for (const ln of currentLines) {
        if (!ln.match(/<!--\s*meta:/)) output.push(ln)
      }
    }
    inCheck = false
    currentMeta = null
    currentLines = []
  }

  for (const line of lines) {
    if (line.startsWith('### ')) {
      flushCheck()
      inCheck = true
      currentLines = [line]
      currentMeta = null
    } else if (line.startsWith('## ') || line.startsWith('# ') || line === '---') {
      flushCheck()
      output.push(line)
    } else if (inCheck) {
      const meta = parseMeta(line)
      if (meta) {
        currentMeta = meta
        currentLines.push(line)  // stored but stripped from output
      } else {
        currentLines.push(line)
      }
    } else {
      output.push(line)
    }
  }
  flushCheck()

  return output.join('\n')
}
