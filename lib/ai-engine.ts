import pool from '@/lib/db'

// Cosine similarity helper for local fallback calculations
function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0.0
  let normA = 0.0
  let normB = 0.0
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

// Generates a 1536-dimensional normalized deterministic embedding vector for offline testing
export function generateMockEmbedding(text: string): number[] {
  const embedding = new Array(1536).fill(0)
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i)
    const index = (i * 7 + charCode * 13) % 1536
    embedding[index] = Math.sin(charCode + i)
  }
  // Normalize vector
  let norm = 0
  for (const val of embedding) norm += val * val
  norm = Math.sqrt(norm)
  if (norm > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= norm
    }
  }
  return embedding
}

export async function generateEmbeddings(text: string): Promise<number[]> {
  const geminiKey = process.env.GEMINI_API_KEY
  const openAIKey = process.env.OPENAI_API_KEY

  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'models/text-embedding-004',
            content: { parts: [{ text }] }
          })
        }
      )
      if (res.ok) {
        const data = await res.json()
        if (data.embedding?.values) {
          return data.embedding.values
        }
      }
      console.warn('Gemini embedding response invalid, falling back...')
    } catch (err) {
      console.error('Gemini embedding failed', err)
    }
  }

  if (openAIKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAIKey}`
        },
        body: JSON.stringify({
          input: text,
          model: 'text-embedding-3-small'
        })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.data?.[0]?.embedding) {
          return data.data[0].embedding
        }
      }
      console.warn('OpenAI embedding response invalid, falling back...')
    } catch (err) {
      console.error('OpenAI embedding failed', err)
    }
  }

  // Fallback to offline mock embedding
  return generateMockEmbedding(text)
}

export async function generateAndStoreEmbedding(
  findingId: number,
  textToEmbed: string,
  teamId: number | null,
  isSystemTemplate: boolean
): Promise<boolean> {
  const pineconeKey = process.env.PINECONE_API_KEY
  const pineconeHost = process.env.PINECONE_INDEX_HOST

  const vector = await generateEmbeddings(textToEmbed)

  if (!pineconeKey || !pineconeHost) {
    console.log(`[AI Engine] Local Mode: Upserting vector simulated for finding ID ${findingId} (team_id: ${teamId}, is_system_template: ${isSystemTemplate})`)
    return true
  }

  try {
    const formattedHost = pineconeHost.startsWith('http') ? pineconeHost : `https://${pineconeHost}`
    const res = await fetch(`${formattedHost}/vectors/upsert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': pineconeKey
      },
      body: JSON.stringify({
        vectors: [
          {
            id: `finding_${findingId}`,
            values: vector,
            metadata: {
              finding_id: findingId,
              team_id: teamId,
              is_system_template: isSystemTemplate
            }
          }
        ]
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Pinecone upsert failed with status ${res.status}: ${errText}`)
    }

    return true
  } catch (err) {
    console.error('[Pinecone Upsert Error]', err)
    return false
  }
}

export async function semanticSearchLibrary(query: string, currentTeamId: number): Promise<number[]> {
  if (!currentTeamId || currentTeamId <= 0) {
    throw new Error('Missing or invalid currentTeamId parameter for semantic search')
  }

  const pineconeKey = process.env.PINECONE_API_KEY
  const pineconeHost = process.env.PINECONE_INDEX_HOST

  const queryVector = await generateEmbeddings(query)

  if (!pineconeKey || !pineconeHost) {
    // Local fallback semantic search (compute cosine similarity over all authorized db findings)
    console.log('[AI Engine] Local Mode: Running isolated in-memory similarity search fallback')
    try {
      const [rows]: any = await pool.query(
        `SELECT id, title, description, remediation 
         FROM findings_library 
         WHERE team_id = ? OR (team_id IS NULL AND is_system_template = 1)`,
        [currentTeamId]
      )
      if (rows.length === 0) return []

      const scored = rows.map((row: any) => {
        const textToEmbed = `${row.title}\n${row.description}\n${row.remediation}`
        const rowVector = generateMockEmbedding(textToEmbed)
        const score = cosineSimilarity(queryVector, rowVector)
        return { id: row.id, score }
      })

      // Sort descending by similarity score and pick top 3
      scored.sort((a: any, b: any) => b.score - a.score)
      return scored.slice(0, 3).map((item: any) => item.id)
    } catch (err) {
      console.error('Local fallback query search failed', err)
      return []
    }
  }

  try {
    const formattedHost = pineconeHost.startsWith('http') ? pineconeHost : `https://${pineconeHost}`
    const res = await fetch(`${formattedHost}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': pineconeKey
      },
      body: JSON.stringify({
        vector: queryVector,
        topK: 3,
        includeMetadata: true,
        filter: {
          $or: [
            { team_id: { $eq: currentTeamId } },
            { is_system_template: { $eq: true } }
          ]
        }
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Pinecone query failed with status ${res.status}: ${errText}`)
    }

    const data = await res.json()
    if (data.matches && Array.isArray(data.matches)) {
      return data.matches
        .filter((m: any) => m.metadata && m.metadata.finding_id)
        .map((m: any) => Number(m.metadata.finding_id))
    }

    return []
  } catch (err) {
    console.error('[Pinecone Query Error]', err)
    return []
  }
}
