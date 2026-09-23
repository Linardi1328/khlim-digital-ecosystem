# ADR 0007 — Coach-Confirmed Attendance Is Authoritative

**Status:** Accepted

## Context

Attendance is operationally important and may trigger parent visibility, analytics, KHERO points, rewards, and future eligibility logic.

Possible collection methods include:
- coach manually marking the roster;
- player QR check-in;
- NFC/kiosk check-in;
- admin corrections.

A self-service scan can speed up check-in but does not always prove the athlete actually participated in training. Phones can be forgotten, QR codes can be shared, and connectivity can fail.

## Decision

For MVP, **authorized coach/staff confirmation is the authoritative source of official attendance**.

MVP workflow:

```text
Coach opens session roster
→ optional Mark All Present
→ edit late/absent/excused exceptions
→ review
→ Confirm Attendance
→ official Attendance records updated
→ AthleteAttendanceConfirmed events emitted
```

Supported statuses:
- present;
- late;
- absent;
- excused.

Corrections are auditable.

Future QR/NFC/kiosk mechanisms may record a separate draft `check-in` signal. They do not automatically award official attendance credit unless KHLIM deliberately adopts a different approved policy later.

## Consequences

### Positive

- Reliable fallback works without every athlete having a phone/network connection.
- Coach can handle exceptions and real-world context.
- Attendance-triggered rewards have a trusted authority.
- QR abuse does not directly become point/reward abuse.
- Future check-in methods can be added without replacing attendance truth.

### Tradeoffs

- Coach has a small administrative task each session.
- Large groups may benefit from later assisted check-in.
- Offline/sync behavior should eventually be considered for poor-connectivity venues.

## UX requirement

Attendance must be fast enough to use during real training. Bulk present marking plus exception editing is preferred over requiring several taps for every athlete.

## Future revisit

Revisit when:
- roster sizes make manual confirmation a measurable burden;
- KHLIM wants self-service check-in;
- NFC/kiosk hardware is justified;
- fraud/eligibility requirements change;
- reliable offline attendance becomes a priority.
