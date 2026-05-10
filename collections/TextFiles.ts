import type { CollectionConfig } from 'payload'

export const TextFiles = (): CollectionConfig => ({
  slug: 'text-files',
  labels: {
    singular: 'Text File',
    plural: 'Text Files',
  },
  upload: {
    mimeTypes: ['text/plain'],
  },
  fields: [],
})
