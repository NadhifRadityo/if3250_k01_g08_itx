import type { CollectionConfig } from 'payload'

export const AudioFiles = (): CollectionConfig => ({
  slug: 'audio-files',
  labels: {
    singular: 'Audio File',
    plural: 'Audio Files',
  },
  upload: {
    mimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg'],
  },
  fields: [],
})
