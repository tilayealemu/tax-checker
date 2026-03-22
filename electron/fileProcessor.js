import path from 'path'
import fs from 'fs'

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp'])
const MIME_MAP = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' }

function hasReadableText(text) {
  if (text.length < 200) return false
  const useful = (text.match(/[a-zA-Z0-9$.,\-\s]/g) || []).length
  if (useful / text.length < 0.85) return false
  return /\d{3,}/.test(text)
}

export async function processFiles(filePaths, outputDir) {
  const { PDFParse } = await import('pdf-parse')
  const xlsxModule = await import('xlsx')
  const XLSX = xlsxModule.default || xlsxModule

  const processedFiles = []
  const fileMetadata = {}

  for (const filePath of (filePaths || [])) {
    if (!fs.existsSync(filePath)) continue
    const ext = path.extname(filePath).toLowerCase()
    const fileName = path.basename(filePath)
    const stem = path.basename(fileName, ext)

    if (IMAGE_EXTS.has(ext)) {
      processedFiles.push({
        name: fileName, ext, isImage: true,
        buffer: fs.readFileSync(filePath),
        mimeType: MIME_MAP[ext] || 'image/jpeg',
        textContent: null
      })
      fileMetadata[fileName] = { convertedToText: false }

    } else if (ext === '.pdf') {
      try {
        const buffer = fs.readFileSync(filePath)
        const parser = new PDFParse({ data: buffer })
        const { text } = await parser.getText()
        if (hasReadableText(text)) {
          const cleaned = text.split('\n').map(l => l.trimEnd()).filter(l => l.trim().length > 0).join('\n').replace(/\n{3,}/g, '\n\n')
          const generatedName = `${stem}-auto-generated.txt`
          const destDir = outputDir || path.dirname(filePath)
          fs.writeFileSync(path.join(destDir, generatedName), cleaned, 'utf8')
          processedFiles.push({ name: fileName, ext, isImage: false, buffer: null, mimeType: 'application/pdf', textContent: cleaned })
          fileMetadata[fileName] = { convertedToText: true, generatedFile: generatedName }
        } else {
          processedFiles.push({ name: fileName, ext, isImage: false, buffer: fs.readFileSync(filePath), mimeType: 'application/pdf', textContent: null })
          fileMetadata[fileName] = { convertedToText: false }
        }
      } catch {
        processedFiles.push({ name: fileName, ext, isImage: false, buffer: fs.readFileSync(filePath), mimeType: 'application/pdf', textContent: null })
        fileMetadata[fileName] = { convertedToText: false }
      }

    } else if (['.xlsx', '.xls'].includes(ext)) {
      try {
        const workbook = XLSX.readFile(filePath)
        const csvParts = workbook.SheetNames.map(name => {
          const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name])
          const trimmed = csv.split('\n').filter(row => row.replace(/,/g, '').trim().length > 0).join('\n')
          return `=== Sheet: ${name} ===\n${trimmed}`
        })
        const text = csvParts.join('\n\n')
        const generatedName = `${stem}-auto-generated.txt`
        const destDir = outputDir || path.dirname(filePath)
        fs.writeFileSync(path.join(destDir, generatedName), text, 'utf8')
        processedFiles.push({ name: fileName, ext, isImage: false, buffer: null, mimeType: 'text/plain', textContent: text })
        fileMetadata[fileName] = { convertedToText: true, generatedFile: generatedName }
      } catch {
        fileMetadata[fileName] = { convertedToText: false }
      }

    } else {
      try {
        const textContent = fs.readFileSync(filePath, 'utf8')
        processedFiles.push({ name: fileName, ext, isImage: false, buffer: null, mimeType: 'text/plain', textContent })
      } catch {
        processedFiles.push({ name: fileName, ext, isImage: false, buffer: fs.readFileSync(filePath), mimeType: 'application/octet-stream', textContent: null })
      }
      fileMetadata[fileName] = { convertedToText: false }
    }
  }

  return { processedFiles, fileMetadata }
}
