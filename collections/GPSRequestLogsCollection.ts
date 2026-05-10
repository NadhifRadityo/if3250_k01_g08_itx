import type { CollectionConfig } from 'payload'

export const GPSRequestLogs = (): CollectionConfig => ({
  slug: 'gps-request-logs',

  labels: {
    singular: 'GPS Request Log',
    plural: 'GPS Request Logs',
  },

  admin: {
    useAsTitle: 'apply',
    defaultColumns: ['officerName', 'teamName', 'time', 'applyId', 'ip', 'gpsCoordinate.latitude', 'gpsCoordinate.longitude'],
  },

  fields: [
    {
      name: 'officerName',
      label: 'Officer Name',
      type: 'text',
      required: true,
    },
    {
      name: 'teamName',
      label: 'Team Name',
      type: 'text',
      defaultValue: '-',
    },
    {
      name: 'time',
      label: 'Time',
      type: 'date',
      required: true,
      defaultValue: () => new Date(),
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'apply',
      label: 'Apply ID',
      type: 'relationship',
      relationTo: 'credit-applications',
      required: true,
    },
    {
      name: 'gpsCoordinate',
      label: 'GPS Coordinate',
      type: 'group',
      fields: [
        {
          name: 'latitude',
          label: 'Latitude',
          type: 'number',
          required: true,
        },
        {
          name: 'longitude',
          label: 'Longitude',
          type: 'number',
          required: true,
        },
      ],
    },
    {
      name: 'ip',
      label: 'IP Address',
      type: 'text',
    },
  ],
})
