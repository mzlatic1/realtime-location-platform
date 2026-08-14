# Scaling

At 10K devices, use modest partitions, horizontally scaled consumers, one indexed Postgres
primary. At 1M, increase partitions/consumer batches, partition history, add replicas,
Redis cluster, object-store retention, candidate-bucket geofences, and a dedicated fanout
tier. At 10M+, regionalize ingestion and fence indexes, isolate hot partition keys, tier
history, consider a stream processor/specialized time-series store, and define cross-region
consistency/privacy controls. Connection and fanout budgets—not unlimited concurrency—bound each stage.
