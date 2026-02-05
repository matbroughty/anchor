/**
 * AI-generated bio for a user's music profile.
 */
export interface Bio {
  text: string
  /** Unix timestamp (ms) when the bio was generated */
  generatedAt: number
  /** Unix timestamp (ms) when the user last edited the bio manually */
  editedAt?: number
}

/**
 * AI-generated caption for a single album on a user's profile.
 */
export interface Caption {
  albumId: string
  text: string
  /** Unix timestamp (ms) when the caption was generated */
  generatedAt: number
  /** Unix timestamp (ms) when the user last edited the caption manually */
  editedAt?: number
}

/**
 * Combined content payload returned by getContent().
 */
export interface ContentData {
  bio: Bio | null
  captions: Caption[]
}
