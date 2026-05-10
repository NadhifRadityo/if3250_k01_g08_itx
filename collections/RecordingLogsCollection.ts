import { CollectionConfig } from 'payload'

export const RecordingLogs = (): CollectionConfig => ({
  slug: 'recording-logs',
  admin: {
    // Updated to use the new field name for the display title
    useAsTitle: 'rawRecordingId',
    defaultColumns: ['rawRecordingId', 'date', 'officerName', 'apply', 'phoneNumber', 'duration'],
  },
  fields: [
    {
      // Renamed from 'recordingId' to 'rawRecordingId' to avoid 
      // collision with the 'recording' relationship field
      name: 'rawRecordingId', 
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'date',
      type: 'date',
      required: true,
    },
    {
      name: 'officerName',
      type: 'text',
      required: true,
    },
    {
      name: 'apply',
      label: 'Apply ID',
      type: 'relationship',
      relationTo: 'credit-applications',
      required: false,
    },
    {
      name: 'phoneNumber',
      type: 'text',
      required: true,
    },
    {
      name: 'duration',
      type: 'number',
      required: false,
      admin: {
        description: 'Duration in seconds',
      },
    },
    {
      // This field automatically creates a 'recording_id' column in the DB
      name: 'recording',
      type: 'upload',
      relationTo: 'audio-files',
      required: false,
    },
    {
      // This field automatically creates a 'speech_to_text_id' column in the DB
      name: 'speechToText',
      type: 'upload',
      relationTo: 'text-files',
      required: false,
    },
  ],
})
