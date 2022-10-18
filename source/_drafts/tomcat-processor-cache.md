---
title: tomcat-processor-cache
toc: true
typora-root-url: tomcat-processor-cache
typora-copy-images-to: tomcat-processor-cache
tags: tomcat
category: tomcat
---

## Tomcat Processor 是啥？

借用极客时间上的一个图：

![img](/309cae2e132210489d327cf55b284dcf.jpg)

从这个图上可以看到，有两个Processor

- SocketProcessor，主要是解析TCP协议的
- Processor就是负责处理应用协议的，比如常见的HTTP协议、AJP协议。Processor的输出经过Adapter的转换，就可以交给容器处理了。

我们今天的主角是应用层协议的Processor，对应到http协议就是`org.apache.coyote.http11.Http11Processor`, 这个Processor中包含了http的输入和输出流，是一个昂贵的对象，因此Tomcat会主动将其缓存起来。

## Tomcat Processor Cache

Tomcat Processor Cache就是tomcat用来缓存对应的Processor的，我们来跟下Processor的创建逻辑：

```java
// org.apache.coyote.http11.AbstractHttp11Protocol#createProcessor
@Override
protected Processor createProcessor() {
  Http11Processor processor = new Http11Processor(getMaxHttpHeaderSize(), getEndpoint(),
                                                  getMaxTrailerSize(), allowedTrailerHeaders, getMaxExtensionSize(),
                                                  getMaxSwallowSize(), httpUpgradeProtocols);
  processor.setAdapter(getAdapter());
  processor.setMaxKeepAliveRequests(getMaxKeepAliveRequests());
  processor.setConnectionUploadTimeout(getConnectionUploadTimeout());
  processor.setDisableUploadTimeout(getDisableUploadTimeout());
  processor.setCompressionMinSize(getCompressionMinSize());
  processor.setCompression(getCompression());
  processor.setNoCompressionUserAgents(getNoCompressionUserAgents());
  processor.setCompressableMimeTypes(getCompressableMimeTypes());
  processor.setRestrictedUserAgents(getRestrictedUserAgents());
  processor.setMaxSavePostSize(getMaxSavePostSize());
  processor.setServer(getServer());
  processor.setServerRemoveAppProvidedValues(getServerRemoveAppProvidedValues());
  return processor;
}

// org.apache.coyote.AbstractProtocol.ConnectionHandler#process
// 只看关键部分
if (processor == null) {
  // 先从cache中取
  processor = recycledProcessors.pop();
}
if (processor == null) {
  // 取不到再创建
  processor = getProtocol().createProcessor();
  // 注意这里要注册到JMX上，tomcat的一些机制依赖这个（有坑，后面会讲）
  register(processor);
}
```

如果当前的cache不够，创建很多Processor，这些Processor处理完之后，会进入到缓存吗？答案是不会！

```java
// org.apache.coyote.AbstractProtocol.ConnectionHandler#release(org.apache.coyote.Processor)
/**
         * Expected to be used by the handler once the processor is no longer
         * required.
         *
         * @param processor Processor being released (that was associated with
         *                  the socket)
         */
private void release(Processor processor) {
  if (processor != null) {
    // 重置相关的buffer
    processor.recycle();
    // After recycling, only instances of UpgradeProcessorBase will
    // return true for isUpgrade().
    // Instances of UpgradeProcessorBase should not be added to
    // recycledProcessors since that pool is only for AJP or HTTP
    // processors
    if (!processor.isUpgrade()) {
      // 缓存回收
      recycledProcessors.push(processor);
    }
  }
}

// org.apache.coyote.AbstractProtocol.RecycledProcessors#push
@SuppressWarnings("sync-override") // Size may exceed cache size a bit
@Override
public boolean push(Processor processor) {
  int cacheSize = handler.getProtocol().getProcessorCache();
  boolean offer = cacheSize == -1 ? true : size.get() < cacheSize;
  //avoid over growing our cache or add after we have stopped
  boolean result = false;
  if (offer) {
    result = super.push(processor);
    if (result) {
      size.incrementAndGet();
    }
  }
  if (!result) handler.unregister(processor);
  return result;
}
```



## 缓存的大小如何设置？

