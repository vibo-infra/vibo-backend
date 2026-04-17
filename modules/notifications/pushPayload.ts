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
  /** Soft-commit nudges (24h / 1h before start). */
  eventAttendeeNudge: 'event_attendee_nudge',
  /** ~1h after effective end — rating nudge. */
  eventRecap: 'event_recap',
  /** Someone else tapped "Might go" (momentum). */
  eventInterestMomentum: 'event_interest_momentum',
  /** New published listing within ~5km of user's last geo. */
  eventNearbyNew: 'event_nearby_new',
  /** Peer checked in ("people are here"). */
  eventCheckinPeer: 'event_checkin_peer',
} as const;

export type PushPayloadTypeName = (typeof PushPayloadType)[keyof typeof PushPayloadType];
