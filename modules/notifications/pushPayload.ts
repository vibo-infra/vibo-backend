/**
 * `data.type` for FCM data payloads (all data values must be strings on the wire).
 * Use the same keys in-app when routing opened notifications.
 */
export const PushPayloadType = {
  general: 'general',
  eventReminder: 'event_reminder',
  eventPublished: 'event_published',
  sparksLow: 'sparks_low',
  verification: 'verification',
  groupBroadcast: 'group_broadcast',
} as const;

export type PushPayloadTypeName = (typeof PushPayloadType)[keyof typeof PushPayloadType];
