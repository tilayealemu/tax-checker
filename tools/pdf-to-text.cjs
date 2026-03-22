const fs = require('fs')
const { PDFParse } = require('pdf-parse')

const filePath = process.argv[2]
if (!filePath) {
  console.error('Usage: node tools/pdf-to-text.cjs <file.pdf>')
  process.exit(1)
}

const buffer = fs.readFileSync(filePath)
const parser = new PDFParse({ data: buffer })

parser.getText().then(({ text }) => {
  const cleaned = text
    .split('\n')
    .map(l => l.trimEnd())
    .filter(l => l.trim().length > 0)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')

  console.log(cleaned)
}).catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
