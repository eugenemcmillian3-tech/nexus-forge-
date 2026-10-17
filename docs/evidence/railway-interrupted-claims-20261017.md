# Isolated interrupted-work check — 17 October 2026

Result: PASS for a synthetic workload using three unchanged claim/effect helpers. Detailed receipt retained privately.

| Check | Aggregate observation |
| --- | --- |
| Interrupted job | One admission; zero completion effects; unresolved work remains blocked |
| Concurrent retry contenders | Four blocked |
| Stale effect and completion attempts | Rejected |
| Completed-result replay | Four matching replays; total original effect count remained one |
| Existing synthetic media | One record/file relationship; 53 bytes; digest unchanged |
| Customer payment/provider/delivery execution | None |

A test-harness JSON key-order comparison initially failed. Corrected semantic comparison passed while the exact persisted result remained unchanged. No product helper was changed to obtain a pass.

Fault injection was removed and final verification passed. Production and managed Testing data, existing backups and payments were unchanged. This is limited synthetic self-hosted evidence; full application/provider/delivery interruption, host-loss recovery and full-service RTO remain unverified.
