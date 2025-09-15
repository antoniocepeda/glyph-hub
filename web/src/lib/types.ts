export type Visibility = 'public' | 'unlisted' | 'private'

export type PromptStats = {
  views: number
  copies: number
  likes: number
}

export type PromptDoc = {
  id: string
  title: string
  body: string
  tags: string[]
  sourceUrl: string | null
  visibility: Visibility
  ownerId?: string
  forkOf?: string
  checksum?: string
  stats?: PromptStats
}

export type CollectionDoc = {
  id: string
  title: string
  visibility: 'public' | 'private'
  ownerId?: string
}


