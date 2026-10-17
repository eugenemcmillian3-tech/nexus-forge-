# Synthetic backup/restore aggregate — 17 October 2026

Lab-local restore check: PASS. External retained archive: NOT VERIFIED.

| Check | Aggregate result |
| --- | --- |
| Capture UTC | 2026-10-17T16:37:54.873Z |
| ZIP actual bytes | 4677 |
| ZIP SHA-256 | fdede09f36f8a57a59acc5a94d0459bbc22c999cc0cf898b3f3c59aafb3658f1 |
| ZIP integrity | 14 entries decompressed; CRC and sizes checked |
| Restored user tables/documents | 5 / 8 |
| Original stored-file payload | 1 / 53 bytes |
| Table/document and storage re-export comparison | Exact canonical inventories matched |
| Record/file identities and ownership checks | Passed |
| Original source data | Unchanged |

The snapshot included file storage and was restored into a fresh isolated target. No production or managed Testing import occurred. The ZIP and local saved/re-read copy remain private inside the lab. Supported archive transfer to externally retained private files was unavailable through the connected tools; only the receipt was saved externally. This is not a fresh production recovery point or proof of independent disaster retention.

An optional archive-checking dependency stalled; the replacement built-in checker initially rejected ZIP64. ZIP64 support was tested against valid regular/ZIP64 and deliberately corrupted fixtures before the successful restore. Final lab state returned to verification-only mode and passed checks. No inference, delivery, payment activation or deletion occurred.

Full application restoration, managed-host loss, scheduled production backup freshness, retention targets and four-hour full-service RTO remain separate. Detailed receipt is private.
