export type HumorStyle =
  | 'sarcastic'
  | 'relatable'
  | 'absurd'
  | 'wordplay'
  | 'dark'
  | 'wholesome'

export function classifyHumor(content: string): HumorStyle {
  const text = content.toLowerCase()

  // Sarcasm
  if (/\b(oh great|yeah right|as if|obviously|totally|sure|love that)\b/.test(text)) {
    return 'sarcastic'
  }

  // Relatable humor
  if (/\b(me when|that moment|my life|every time|when you|monday|exam|studying)\b/.test(text)) {
    return 'relatable'
  }

  // Wordplay and puns
  if (/\b(pun|punny|more like|what do you call|why did)\b/.test(text)) {
    return 'wordplay'
  }

  // Dark humor
  if (/\b(death|dead|grave|funeral|doom)\b/.test(text)) {
    return 'dark'
  }

  // Wholesome humor
  if (/\b(cute|adorable|sweet|love|friendship|heartwarming)\b/.test(text)) {
    return 'wholesome'
  }

  // Default category when no keywords match
  return 'absurd'
}
