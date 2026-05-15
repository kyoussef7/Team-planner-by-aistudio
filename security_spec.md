# Security Spec - Planning App

## Data Invariants
1. A WeekPlanning must have a valid `monday` date string.
2. The `data` array must contain exactly 7 Day objects.
3. Each Day object must have `shifts` matching the number of employees.
4. Only Managers can update the planning.

## The Dirty Dozen Payloads
1. **The Ghost Field**: Adding `isAdmin: true` to a planning document.
2. **The Employee Spoof**: An employee trying to update someone else's shift (or their own).
3. **The Date Poisoning**: Setting `monday` to a malicious string.
4. **The Empty Planning**: Submitting an empty `data` array.
5. **The Unauthorized Deletion**: An employee trying to delete a week.
6. **The Overwrite**: Overwriting `updatedAt` with a past date.
7. **The Multi-Week injection**: Trying to batch write multiple weeks without permission.
8. **The Schema Break**: Sending a Shift with a 1MB string instead of numbers.
9. **The Identity Theft**: Setting `managerEmail` field to someone else's.
10. **The Anonymous Write**: Trying to write without being signed in.
11. **The Forbidden Access**: Reading another company's planning (if we had companies).
12. **The Terminal State Lock**: Trying to edit a planning that was marked 'final' (if we had that).

## Test Runner (Draft)
I will implement a verification in the rules that only the authorized manager email can write.

```typescript
// firestore.rules.test.ts (Summary)
// Test 1: Anonymous read -> Deny
// Test 2: Authenticated read -> Allow
// Test 3: Authenticated write (non-manager) -> Deny
// Test 4: Manager write -> Allow
```
