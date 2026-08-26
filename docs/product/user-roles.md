# User Roles and Permission Model

**Status:** Accepted current planning baseline

Role checks alone are insufficient. Access is constrained by explicit family relationships, programme/team assignments, financial/admin scope, and server-side authorization.

A single account may hold multiple legitimate roles, for example a coach who is also a parent.

## Parent / Guardian

A guardian may manage multiple athletes; an athlete may have multiple authorized guardians.

### Can
- manage approved parts of their own profile;
- manage/select linked children;
- view programmes and eligible Programme Offerings;
- create memberships for linked athletes where allowed;
- review/accept membership and recurring-payment terms;
- initiate secure payment checkout through approved providers;
- view their own/linked-family membership and payment history appropriate to their role;
- view upcoming training/schedules for linked active memberships;
- later register linked children for tournaments/camps and receive eligible member pricing;
- choose their own preferred locale.

### Cannot
- access unlinked athletes;
- modify authoritative price/payment/membership state directly;
- view another family's financial information;
- view internal coach notes;
- edit official coach evaluations/attendance.

## Player / Athlete

Basketball UI may use **Player** while the internal identity is **Athlete**.

For the first website MVP, young athletes do not need to own the commercial workflow; guardians normally manage membership/payment. Athlete self-service may expand with age/policy.

### Can, where age/policy allows
- view approved profile/membership/programme information;
- view schedule and later attendance/development/event history;
- choose preferred locale for their own account if they have one;
- later use KHERO/rewards and Super App features.

### Cannot
- alter official payment/membership state;
- edit official attendance/evaluations;
- access other athletes' private data;
- access guardian financial data merely because they are linked.

## Coach

Coach access is scoped to assigned sports, programmes/teams, sessions, and athletes.

### Can
- view assigned sessions/rosters;
- later record/confirm attendance;
- later create official athlete evaluations/development notes within scope;
- maintain approved coach profile/service information;
- view operational event/team information relevant to assignments.

### Cannot by default
- view family payment methods/transaction details or finance dashboards;
- change Membership Plan prices;
- grant themselves broader athlete/programme access;
- modify points/financial state outside explicit authorized workflows.

## Administrative/staff roles

Administrative access should be granular rather than one universal admin role. A small team may initially assign multiple scopes to the same person, while the authorization model preserves separation.

### Super Admin

High-privilege technical/organizational administration. Manages roles/permissions and sensitive system configuration. Strong authentication/MFA required.

### Management

Broad business/operational oversight including programme/membership/revenue reporting where authorized, without automatically inheriting every technical permission.

### Finance / Admin

Can, within policy:
- view payment/installment/failed-payment operational data;
- manage approved billing/member support workflows;
- perform authorized refunds/manual adjustments with audit/reason requirements where implemented;
- view membership status and billing-relevant family information.

Cannot automatically view internal coaching notes unless separately granted.

### Academy Admin

Can manage:
- families/athletes;
- Programmes/Programme Offerings;
- Membership Plans where commercial permission is granted;
- Memberships;
- Venues/Courts;
- schedules/capacity;
- operational communication.

Financial visibility may be limited depending on scope.

### Head Coach / Coach

Own coaching operations and athlete-development access according to assignments. Head Coach may have broader sport/programme oversight but does not automatically gain finance privileges.

### Event Staff — later

Can manage authorized tournament/camp/event operations without receiving unrelated academy finance or internal-development access.

## Permission principles

1. **Deny by default.** Access exists only when a policy explicitly allows it.
2. **Enforce on the server.** Hidden UI is not a security boundary.
3. **Relationship-aware.** Guardian access depends on active GuardianAthleteLink; Coach access depends on active assignments.
4. **Least privilege.** Finance, coaching, academy operations, and high-level administration remain distinguishable.
5. **Payment privacy.** Coaches/event staff do not receive sensitive family financial data without explicit need/permission.
6. **Backend-authoritative mutations.** Users cannot alter price, membership, payment, entitlement, attendance, or evaluation truth by changing frontend payloads.
7. **Audit sensitive actions.** Role changes, family links, financial adjustments, membership overrides, attendance corrections, and similar actions should be attributable.
8. **Separate shared/internal coaching data.** Family-visible progress and internal notes use distinct policies.
9. **Age-aware evolution.** The model supports future age-based self-service/consent rules without replacing family relationships.
10. **Locale is presentation, not authorization.** Language never changes access.
11. **One identity across KHLIM.** Academy, tournaments, camps, teams, future coaching/commerce reuse the same user/family identities.

## Relationship model

```text
Guardian ──< GuardianAthleteLink >── Athlete

Sport ──< Programme ──< ProgrammeOffering ──< Membership >── Athlete

Sport ──< Team ──< TeamMembership >── Athlete

Coach ──< Assignment >── Sport / Programme / Team / Session

User ──< StaffRole/Permission scope
```
