# Security Specification - SafeZone

## Data Invariants
1. A user cannot grant themselves ADMIN or STAFF roles.
2. Alerts must have a valid type, severity, and authorId matching the creator.
3. Assessments must be linked to a valid user and alert.
4. PII (email) is only visible to the owner or admins.
5. Reports must have a valid reporterId matching the current user and a non-empty reason.

## The Dirty Dozen Payloads (Target: Rejection)

1. **Role Escalation**: Student trying to set their role to ADMIN.
2. **Alert Spoofing**: Student trying to create an emergency alert.
3. **Identity Theft**: User A trying to update User B's profile.
4. **Invalid Severity**: Creating an alert with severity "EXTREME" (not in enum).
5. **Junk ID**: Creating a campus with 2KB string as ID.
6. **Past Timestamp**: Creating an alert with `createdAt` in the past (must be `request.time`).
7. **Social Engineering**: Updating an alert's `authorId` to a different user.
8. **PII Leak**: Non-admin user trying to list all users' emails.
9. **Fake Assessment**: Posting an assessment for a non-existent alert.
10. **Terminal Bypass**: Trying to update an "EMERGENCY" alert once it's marked as "INACTIVE" (if we lock it).
11. **Shadow Fields**: Adding `isVerified: true` to a profile update.
12. **Unverified Auth**: Write operation without verified email (if strictly enforced).
13. **Spam Report**: Sending a report with a 1MB string as the reason.
14. **Identity Fraud**: Reporting as another user.

## Rule Primitives
- `isAdmin()`: Check if UID is in an `admins` collection OR matches seed email.
- `isStaff()`: Check user role in `users` collection.
- `isValidAlert(data)`: Validate alert schema.
- `isOwner(userId)`: Check if `request.auth.uid == userId`.
