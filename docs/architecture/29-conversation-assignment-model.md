# Architecture 29 — Conversation Assignment Model

## Purpose

Track which human workspace member is responsible for a conversation. Enables routing, accountability, and filtered views.

## Design Decisions

1. **Append-only table**: assignments are never deleted, only their status changes.
2. **One active assignment per conversation**: enforced at service level.
3. **Transferred vs closed**: previous assignment is marked `transferred` (not `closed`) when re-assigned.
4. **Assignment is independent of handoff**: you can assign a conversation without requesting handoff and vice versa. They are related but separate concerns.

## waai_conversation_assignments

| Field         | Type           | Notes                                            |
|---------------|----------------|--------------------------------------------------|
| id            | uuid           | PK                                               |
| workspace_id  | uuid           | FK waai_workspaces                               |
| conversation_id | uuid         | FK waai_conversations                            |
| assigned_to   | uuid           | FK auth.users (the assignee)                     |
| assigned_by   | uuid           | FK auth.users (who assigned)                     |
| status        | text           | active | resolved | transferred | closed         |
| reason        | text           | Optional reason for assignment                   |
| created_at    | timestamptz    |                                                  |
| updated_at    | timestamptz    |                                                  |

## Service Logic

### ConversationAssignmentService.assign(conversationId, assignedTo, assignedBy, reason)
1. Validate assignedTo is active member of workspace
2. Find any current active assignment
3. If exists: update status to `transferred`
4. Create new assignment with `status: active`
5. Update conversation with assigned_to if tracked (optional, conversation table doesn't have this field — use assignment table as source of truth)

### ConversationAssignmentService.resolve(assignmentId, workspaceId)
1. Find assignment
2. Validate workspace_id matches
3. Update status to `resolved`

## API Route

```
POST /api/conversations/[conversationId]/assign
  Body: { assignedTo: uuid, reason?: string }
  Permissions: owner | admin | agent_manager
```

## RLS Policies

- Members can read assignments for their workspace
- Service-level inserts (always server-side)
- No deletes

## Integration with Dashboard

- Conversation detail shows current assignment
- ConversationAssignmentPanel component allows owner/admin/agent_manager to assign
- human_agent sees who is assigned (read-only)
