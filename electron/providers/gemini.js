export const id = 'gemini'
export const name = 'Google Gemini'
export const defaultModel = 'gemini-2.0-flash'
export const models = [
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (fast)' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (best)' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (cheap)' }
]

export function buildContents(processedFiles, prompt, messages) {
  const fileParts = []
  for (const f of processedFiles) {
    if (f.textContent != null) {
      fileParts.push({ text: `--- File: ${f.name} ---\n${f.textContent}` })
    } else if (f.buffer) {
      fileParts.push({ inlineData: { mimeType: f.mimeType || 'application/pdf', data: f.buffer.toString('base64') } })
    }
  }

  if (messages && messages.length > 0) {
    return messages.map((m, i) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: i === 0 && m.role === 'user'
        ? [...fileParts, { text: typeof m.content === 'string' ? m.content : m.content.map(c => c.text || '').join('') }]
        : [{ text: typeof m.content === 'string' ? m.content : m.content.map(c => c.text || '').join('') }]
    }))
  }

  return [{ role: 'user', parts: [...fileParts, { text: prompt }] }]
}

export async function stream({ apiKey, model, processedFiles, prompt, messages, systemPrompt, onChunk }) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genAI = new GoogleGenerativeAI(apiKey)

  const modelConfig = { model: model || defaultModel }
  if (systemPrompt) modelConfig.systemInstruction = systemPrompt

  const genModel = genAI.getGenerativeModel(modelConfig)
  const contents = buildContents(processedFiles, prompt, messages)

  // Gemini uses chat or generateContentStream
  const result = await genModel.generateContentStream({ contents })

  let fullText = ''
  for await (const chunk of result.stream) {
    const text = chunk.text()
    if (text) { fullText += text; onChunk(text) }
  }
  return { text: fullText }
}
