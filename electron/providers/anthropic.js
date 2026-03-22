export const id = 'anthropic'
export const name = 'Claude (Anthropic)'
export const defaultModel = 'claude-sonnet-4-6'
export const models = [
  { id: 'claude-opus-4-6', label: 'Opus 4.6 (best)' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6 (fast)' },
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5 (cheapest)' }
]

export function buildContentBlocks(processedFiles) {
  const blocks = []
  for (const f of processedFiles) {
    if (f.textContent != null) {
      blocks.push({ type: 'text', text: `--- File: ${f.name} ---\n${f.textContent}` })
    } else if (f.isImage && f.buffer) {
      blocks.push({ type: 'image', source: { type: 'base64', media_type: f.mimeType, data: f.buffer.toString('base64') } })
    } else if (f.buffer) {
      blocks.push({ type: 'document', source: { type: 'base64', media_type: f.mimeType || 'application/pdf', data: f.buffer.toString('base64') } })
    }
  }
  return blocks
}

export function buildMessages(processedFiles, prompt, messages, systemPrompt) {
  const fileBlocks = buildContentBlocks(processedFiles)

  if (messages && messages.length > 0) {
    return messages.map((m, i) => {
      if (i === 0 && m.role === 'user' && fileBlocks.length > 0) {
        const existing = typeof m.content === 'string'
          ? [{ type: 'text', text: m.content }]
          : m.content
        return { role: 'user', content: [...fileBlocks, ...existing] }
      }
      return m
    })
  }
  return [{ role: 'user', content: [{ type: 'text', text: prompt }, ...fileBlocks] }]
}

export async function stream({ apiKey, model, messages, systemPrompt, onChunk }) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey })

  const streamParams = {
    model: model || defaultModel,
    max_tokens: 16000,
    messages
  }
  if (systemPrompt) streamParams.system = systemPrompt

  let fullText = ''
  const s = client.messages.stream(streamParams, { headers: { 'anthropic-beta': 'output-128k-2025-02-19' } })
  s.on('text', text => { fullText += text; onChunk(text) })
  await s.finalMessage()
  return { text: fullText }
}
