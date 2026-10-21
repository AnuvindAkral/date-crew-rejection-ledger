# Sourcing-channel scorecard: gating decision

Status: **excluded from this build.** The data does not support a channel-level comparison, and a polished scorecard on this data would be misleading.

## What was inspected

The synthetic dataset carries a `source` tag on every candidate: `internal_network`, `matrimonial`, `linkedin`, or `referral`. The candidate store, rejections and acceptances all record enough to attempt a channel-level view.

## Why the scorecard is excluded

The synthetic dataset is far too small to support a channel-level conclusion.

| Channel | Candidates | Rejections | Acceptances |
| --- | --- | --- | --- |
| internal_network | 5 | 1 | 0 |
| matrimonial | 3 | 2 | 0 |
| linkedin | 2 | 1 | 0 |
| referral | 2 | 0 | 1 |

Any "completed-meeting rate by source" or "rejection rate by dimension by source" computed from zero-to-two observations per cell is noise presented as insight. That is exactly the misleading dashboard this project was warned against.

A real channel-level scorecard needs real data: hundreds of profiles with `source` tagged at send time and outcomes tracked through to meeting. None of that is available in a synthetic prototype, and this project has no access to TDC's data.

## What is the correct first step instead

The interview protocol's question 3, "how do you know whether a disappointing profile came from poor sourcing, incomplete information, or a mismatch in expectations?", is the gate that comes before any scorecard. It establishes whether channel is even a meaningful axis to the people doing the work. A scorecard built before that question is answered optimises a dimension the matchmakers may not trust.

## What was preserved

The `source` field remains on every candidate, so the data model is ready if real data ever supports the comparison. No channel-level view is rendered in the prototype, and none is claimed.

## Decision

Build the acceptance debrief now. Defer the scorecard until either (a) the interviews show channel is a meaningful axis, or (b) real TDC data with channel provenance is available. Do not manufacture a dashboard to make the prototype look larger.
