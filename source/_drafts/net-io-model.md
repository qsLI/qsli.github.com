---
title: 网络I/O模型总结
toc: true
typora-root-url: net-io-model
typora-copy-images-to: net-io-model
tags: net-io
category: tomcat
---

- 何为阻塞
  - connect阻塞
  - accept阻塞
  - read/write阻塞
  - 等待数据复制
    - 网卡复制到内核空间
    - 内核内存复制到用户空间
- 零拷贝
- DMA
- BIO
- NIO
- IO多路复用
  - LT/ET
  - select
  - poll
  - epoll
- Reactor模型
  - DougeLee
  - 



## 参考

- [Linux AIO](https://gohalo.me/post/linux-program-aio.html)
- [深入理解 epoll](https://mp.weixin.qq.com/s/_G9KRzIl7B7cPWKiMsZzOA)
- [11 | 答疑课堂：深入了解NIO的优化实现原理](https://time.geekbang.org/column/article/100861)

