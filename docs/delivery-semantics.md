# Delivery semantics

Redpanda provides at-least-once processing. Offset commits follow DB work. A crash between
them redelivers: event PK blocks history duplication, conditional state prevents regression,
and transition uniqueness blocks repeated ENTER/EXIT. Broker order is partition order;
sequence is producer order; event time is business time; received time is ingress time.
