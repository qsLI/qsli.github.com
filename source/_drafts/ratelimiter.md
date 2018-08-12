---
title: 'Guava之ratelimiter,限流利器'
toc: true
tags: rate-limiter
category: guava
---

## 限流

### Semaphore

限制并发（concurrency）

### RateLimiter

限制rate

> Rate limiters are often used to restrict the rate at which some physical or logical resource
> is accessed. This is in contrast to {@link java.util.concurrent.Semaphore} which restricts the
> number of concurrent accesses instead of the rate (note though that concurrency and rate are
> closely related, e.g. see <a href="http://en.wikipedia.org/wiki/Little%27s_law">Little's
> Law</a>).

## 参考

1. [Little's law - Wikipedia](https://en.wikipedia.org/wiki/Little%27s_law)
