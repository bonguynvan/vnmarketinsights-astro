# Growth Experiments Playbook

This document defines a lightweight weekly loop for growing new users.

## Primary Acquisition Funnel

1. `landing_view` (implicit from GA page views)
2. `homepage_cta_click` / `topics_primary_cta_click` / `tools_primary_cta_click`
3. `tool_form_started`
4. `tool_submitted`
5. `tool_success`
6. `lead_capture_submit`
7. `lead_pending_confirmation`
8. `lead_confirmed`

## Event Taxonomy Implemented

- Navigation and discovery
  - `nav_click`
  - `topic_card_click`
  - `tools_hub_click`
  - `insight_click`
  - `search_open`
  - `search_query`
- Conversion actions
  - `homepage_cta_click`
  - `homepage_quickstart_click`
  - `tool_form_started`
  - `tool_submitted`
  - `tool_success`
  - `tool_error`
  - `first_value_received`
  - `lead_capture_submit`
  - `lead_pending_confirmation`
  - `lead_confirmed`
- Engagement depth
  - `tool_filter_used`
  - `tool_export`
  - `starter_flow_step_click`
  - `workspace_goal_added`
  - `workspace_goal_toggled`
  - `workspace_goal_removed`
  - `workspace_replay_started`
  - `tool_replay_item_success`
  - `tool_replay_item_error`
  - `tool_replay_completed`

## Weekly Operating Cadence

### Monday: Baseline and Hypothesis

- Pull last 7 days for:
  - `OrganicSessions`
  - `LandingToToolCTR`
  - `ToolStartRate`
  - `ToolSuccessRate`
  - `LeadCaptureRate`
- Pick one bottleneck and write one hypothesis.
- Example: "If homepage hero CTA points to `/snapshot`, `LandingToToolCTR` will improve."

### Tuesday-Wednesday: Ship One Change

- Implement only one meaningful variant per week.
- Prioritize:
  1. Hero/headline copy
  2. CTA wording and placement
  3. Tool input helper UX (examples, validation, friction removal)

### Thursday: QA and Annotation

- Verify all relevant events are firing.
- Add an annotation in GA4 with:
  - change date
  - pages affected
  - expected metric impact

### Friday: Decision

- Keep, iterate, or revert based on directional movement.
- Update this document's experiment log.

## Decision Rules

- Keep a change when both are true:
  - Primary metric improves by >= 10% week-over-week.
  - No severe regression in downstream conversion.
- If data volume is too low:
  - Run the same experiment for one more week before deciding.

## Experiment Log Template

Copy this block weekly:

```md
### Week of YYYY-MM-DD
- Hypothesis:
- Change shipped:
- Pages:
- Primary metric:
- Secondary metrics:
- Result:
- Decision (keep/iterate/revert):
```
