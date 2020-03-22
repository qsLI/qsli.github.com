---
title: openzipkin
toc: true
typora-root-url: openzipkin
typora-copy-images-to: openzipkin
tags:
category:
---

# openzipkin



## 概念

### TraceId

### SpanId

### ParentSpanId

### Sampling

### Debug Flags

### Instrument

## 传递 b3-propagation

```bash
  Client Tracer                                                  Server Tracer     
┌───────────────────────┐                                       ┌───────────────────────┐
│                       │                                       │                       │
│   TraceContext        │          Http Request Headers         │   TraceContext        │
│ ┌───────────────────┐ │         ┌───────────────────┐         │ ┌───────────────────┐ │
│ │ TraceId           │ │         │ X-B3-TraceId      │         │ │ TraceId           │ │
│ │                   │ │         │                   │         │ │                   │ │
│ │ ParentSpanId      │ │ Inject  │ X-B3-ParentSpanId │ Extract │ │ ParentSpanId      │ │
│ │                   ├─┼────────>│                   ├─────-───┼>│                   │ │
│ │ SpanId            │ │         │ X-B3-SpanId       │         │ │ SpanId            │ │
│ │                   │ │         │                   │         │ │                   │ │
│ │ Sampling decision │ │         │ X-B3-Sampled      │         │ │ Sampling decision │ │
│ └───────────────────┘ │         └───────────────────┘         │ └───────────────────┘ │
│                       │                                       │                       │
└───────────────────────┘                                       └───────────────────────┘
```





![Trace Info propagation](https://raw.githubusercontent.com/spring-cloud/spring-cloud-sleuth/master/docs/src/main/asciidoc/images/trace-id.png)



# 参考

1. [b3-propagation/README.md at a546ce7e2d1afb4f28090871874c7d5a68265a8a · openzipkin/b3-propagation](https://github.com/openzipkin/b3-propagation/blob/a546ce7e2d1afb4f28090871874c7d5a68265a8a/README.md)
2. [Spring Cloud Sleuth](https://cloud.spring.io/spring-cloud-sleuth/single/spring-cloud-sleuth.html#_apache_httpclientbuilder_and_httpasyncclientbuilder)