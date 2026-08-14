# Failure modes

Malformed/nonretryable records go directly to `location.dlq`; transient infrastructure
work has bounded attempts and jittered backoff at the operation boundary. Redis failure
logs degradation without aborting DB truth. DB/broker failures stop safe progress rather
than acknowledge loss. Slow WebSocket clients exceeding 1 MB buffered output close with 1013. The README lists the reproducible Redis and crash/replay demonstration.
