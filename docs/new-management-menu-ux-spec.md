# New Management Menu UX Specification (Based on User/Role Management)

Please see how User/Role management currently works. It has few features such as:
1. Relation viewer and relation navigation: relation values are clickable, can open relation summary, and can redirect to target management with relation filters applied.
2. Audit history drawer: request history is available from details drawer with access gating for auditor menu.
3. Delete confirmation dialog: delete action is confirmed and clearly states it creates a pending request.
4. Cancel confirmation dialog: cancel action is confirmed and explains request rollback behavior.
5. Column config card: supports show/hide columns, drag-and-drop reorder, reset, and local preference persistence.
6. Filter config card: supports multi-condition filtering, AND/OR combinator, per-column operators, and typed values (text/date/select/boolean).
7. Active filters summary: currently applied filters are summarized in compact chips.
8. Eligible detail trigger column: one visible column is selected as clickable trigger for details drawer.
9. Details drawer: full entry details, relation rendering, actions, and history access.
10. Form drawer (editor mode): create/edit request in drawer, with validation and save flow.
11. Review drawer (approver mode): compares last approved vs requested values and supports approve/reject.
12. Change preview drawer: read-only diff preview for request type and changed fields.
13. Mode-based request tables: viewer/editor/approver use the same table foundation with role-based actions.

Use User/Role management as the base implementation. Do not build this UX from scratch.

## Goal

Implement a new management menu that is behaviorally consistent with User Management and Role Management, including page structure, interaction model, and drawer/dialog flows.

## Primary Baseline

- `app/(app)/(dashboard)/user-management/layout.components.tsx`
- `app/(app)/(dashboard)/user-management/editor/page.tsx`
- `app/(app)/(dashboard)/user-management/approver/page.tsx`
- `app/(app)/(dashboard)/user-management/viewer/page.tsx`
- `app/(app)/(dashboard)/role-management/layout.components.tsx`
- `app/(app)/(dashboard)/role-management/editor/page.tsx`
- `app/(app)/(dashboard)/role-management/approver/page.tsx`
- `app/(app)/(dashboard)/role-management/viewer/page.tsx`
- Shared relation infra: `app/(app)/(dashboard)/relation-navigation.components.tsx`

For multi-valued relation click behavior, also reuse pattern from Team Management:
- `app/(app)/(dashboard)/team-management/layout.components.tsx`

## Mandatory UX Parity Requirements

### 1. Mode Structure and Page Composition

Implement these pages:
- Viewer page: read-only table, details drawer, change preview drawer, relation summary drawer.
- Editor page: viewer capabilities + add/edit form drawer + delete/cancel confirmation dialogs + editor actions.
- Approver page: viewer capabilities + review drawer + review action.

Each page must keep this order:
1. Page frame and toolbar
2. Filter card
3. Column config card
4. Active filter summary
5. Error alert (if any)
6. Main request table
7. Pagination
8. Drawers/dialogs mounted at page bottom

### 2. Relation Viewer and Navigation

For relation cell values and relation fields in details/review/change-preview:
- Render clickable relation values.
- Default click behavior:
  - If user has access to target management menu, navigate there and inject `relationFilters` into URL state.
  - Apply relation filter to target page automatically after navigation.
- Fallback behavior:
  - Open entry summary drawer when redirect target is unavailable.
- Alt-click behavior:
  - Open summary drawer directly instead of redirect.

Required implementation model:
- Use `useDashboardRelationNavigation` for `getTargetHrefBase`, `onRelationLinkClick`, `openSummary`.
- Use `consumePendingRelationFilterNavigation(...)` in target management filter hook hydration.
- Keep `RELATION_FILTER_QUERY_PARAM` sync with applied filters.

### 3. Multi-Valued Relation Support

New menu must support relation fields that may contain multiple relation IDs.

Behavior:
- Single relation value:
  - Open summary directly (or redirect with equals filter).
- Multiple relation values:
  - Redirect with `in` filter when redirect path is available.
  - For summary flow, show Relation Summary Picker drawer where user selects which relation entry to open.

Required base pattern:
- Reuse `RelationSummaryPickerDrawer` and the Team Management `openRelationSummary` pattern.
- Map display tokens to relation IDs when possible.
- Fall back to generated labels when value text and relation ID count do not align.

### 4. Table UX

Table must provide:
- Sortable headers for sortable columns.
- Skeleton row states while loading.
- Empty-state message.
- Optional actions column (`includeActions` false for viewer).
- Clickable detail trigger column chosen from visible columns via eligibility helper.

### 5. Column Configuration UX

Column config card must support:
- Show/hide with minimum one visible column guard.
- Drag-and-drop reordering.
- Reset to defaults.
- Visible count indicator.
- LocalStorage persistence for order + hidden columns.

### 6. Filter Configuration UX

Filter card must support:
- Multiple filters.
- AND/OR combinator between filters.
- Column-specific operators.
- Typed values by column definition:
  - text
  - select (with async searchable select)
  - boolean
  - date (date + time)
- `exists`, `in`, `not_in` behavior.
- Add/remove list values for list operators.
- Clear filter action.

Filter state rules:
- Hydrate from relation navigation pending state or URL query param.
- Keep URL in sync with applied filters.
- Expose `isFilterStateReady` before first query.

### 7. Active Filter Summary UX

Show compact summary of current applied filters:
- Combinator chip (`AND`/`OR`) for non-first items.
- Human-readable column label + operator label + normalized value label.

### 8. Details Drawer UX

Details drawer must include:
- Full column-by-column value display.
- Relation value rendering with relation navigation behavior.
- Action buttons area.
- History button (visible only when user can access history).
- Loading, error, and empty states.

### 9. Audit History UX

History is opened as nested right drawer from details drawer.

Requirements:
- Access check query before showing history content.
- Unauthorized message when user lacks auditor permission.
- Timeline entries with changed fields:
  - changed timestamp
  - changed count badge
  - per-field from/to values
- Loading, error, empty states.

### 10. Confirmation Dialog UX

Editor mode must include:
- Delete confirmation dialog:
  - Explicitly states delete creates a pending request (soft-delete style), not hard delete.
- Cancel confirmation dialog:
  - Explicitly states cancel keeps approved version unchanged.

### 11. Form Drawer UX (Editor)

Form drawer requirements:
- Add and edit flows in one component.
- Field validation before submit.
- Async searchable relation selects if needed.
- Inline form error alert.
- Save/cancel footer actions.
- On success: close drawer + invalidate management query.

### 12. Review Drawer UX (Approver)

Review drawer requirements:
- Load and render review diff (last approved vs requested).
- Show request type and changed count.
- Per-field changed/unchanged badge.
- Optional review reason textarea.
- Approve and reject actions.
- Inline error handling.

### 13. Change Preview Drawer UX

Read-only diff drawer used by clicking request type links.

Requirements:
- Request type summary and changed count.
- Same field-level previous/requested comparison layout.
- Relation references clickable to summary drawer.

## Implementation Blueprint

## 1. Create `layout.actions.ts` for new menu

Include:
- Query action for each scope (viewer/editor/approver wrappers).
- Relation resolver action for visible relation columns.
- Search actions for select filters.
- Upsert/create/update request action(s).
- Delete/cancel/restore request actions (if applicable).
- Review action + diff action.
- Details action + history action.
- History access check action (`canAccess...HistoryAction`).

## 2. Create `layout.components.tsx` for new menu

Port and adapt these patterns from User/Role:
- typed filter model + filter helpers
- table column model + defaults + eligibility helper
- active filter summary component
- column config card
- filter card
- request table component
- details drawer
- history drawer
- form/review/change-preview drawers
- delete/cancel dialogs
- cell renderer hook
- column preferences hook
- filter column config hook
- query state hook
- relations hook
- request filters hook (with relation filter hydration)
- requests query hook

## 3. Create mode pages

- `viewer/page.tsx`: read-only list + details + change preview
- `editor/page.tsx`: add form drawer + delete/cancel dialogs + editor actions
- `approver/page.tsx`: review drawer + approver actions

All pages must wire `useDashboardRelationNavigation` and mount `EntrySummaryDrawer`.

## 4. Add multi-valued relation support

If any relation column can hold multiple IDs:
- Use Team-style `renderTeamRelationValue` approach (adapt to new menu types).
- Mount `RelationSummaryPickerDrawer` from shared relation navigation components.
- Provide drawer both from details view and cell renderer path when needed.

## Acceptance Checklist

A new management menu is complete only if all items are true:
- [ ] Viewer/editor/approver pages exist and behave as expected.
- [ ] Toolbar + filter + columns + summary + table + pagination layout is consistent.
- [ ] Relation click can redirect with filters to target management.
- [ ] Relation click can open summary drawer fallback.
- [ ] Multi-valued relation path works (picker drawer and/or `in` filter redirect).
- [ ] Details drawer and nested history drawer implemented with access checks.
- [ ] Delete and cancel confirmation dialogs implemented.
- [ ] Form drawer implemented with validation and save mutation.
- [ ] Review drawer implemented with approve/reject.
- [ ] Change preview drawer implemented.
- [ ] Column preferences persist and can be reset.
- [ ] Filter state hydrates from URL/pending relation nav and syncs back to URL.
- [ ] Query invalidation and loading/error states are handled in all mutations.

## Strong Recommendation

Start by copying User Management or Role Management module skeleton and then adapt types, fields, actions, and labels.

Do not redesign the UX contract. Treat User/Role Management as the authoritative base behavior for all new management menus.
