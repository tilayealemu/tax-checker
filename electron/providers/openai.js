export const id = 'openai'
export const name = 'OpenAI'
export const defaultModel = 'gpt-4o'
export const models = [
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { id: 'o3-mini', label: 'o3 Mini' }
]

export function buildMessages(processedFiles, prompt, messages, systemPrompt) {
  const fileParts = []
  for (const f of processedFiles) {
    if (f.textContent != null) {
      fileParts.push({ type: 'text', text: `--- File: ${f.name} ---\n${f.textContent}` })
    } else if (f.isImage && f.buffer) {
      fileParts.push({ type: 'image_url', image_url: { url: `data:${f.mimeType};base64,${f.buffer.toString('base64')}` } })
    }
    // OpenAI doesn't support native PDF documents — text extracted by fileProcessor
  }

  const systemMsg = systemPrompt ? [{ role: 'system', content: systemPrompt }] : []

  if (messages && messages.length > 0) {
    const apiMessages = messages.map((m, i) => {
      if (i === 0 && m.role === 'user' && fileParts.length > 0) {
        const existing = typeof m.content === 'string'
          ? [{ type: 'text', text: m.content }]
          : m.content
        return { role: 'user', content: [...fileParts, ...existing] }
      }
      return m
    })
    return [...systemMsg, ...apiMessages]
  }

  const userContent = fileParts.length > 0
    ? [...fileParts, { type: 'text', text: prompt }]
    : prompt
  return [...systemMsg, { role: 'user', content: userContent }]
}

export async function stream({ apiKey, model, messages, onChunk }) {
  const { default: OpenAI } = await import('openai')
  const client = new OpenAI({ apiKey })

  const s = await client.chat.completions.create({
    model: model || defaultModel,
    messages,
    stream: true,
    max_tokens: 16000
  })

  let fullText = ''
  for await (const chunk of s) {
    const text = chunk.choices[0]?.delta?.content || ''
    if (text) { fullText += text; onChunk(text) }
  }
  return { text: fullText }
}
