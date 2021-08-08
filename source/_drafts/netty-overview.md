---
title: netty-overview
toc: true
typora-root-url: netty-overview
typora-copy-images-to: netty-overview
tags:
category:
---

```java
// sun.nio.ch.FileDispatcherImpl#pread0
static native int pread0(FileDescriptor fd, long address, int len,
                         long position) throws IOException;


// java.io.FileInputStream#read0
private native int read0() throws IOException;
```

