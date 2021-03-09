---
title: Tomcat工作流程
toc: true
category: tomcat
abbrlink: 2774
date: 2017-01-21 00:59:55
tags:
---

StringManager


禁用DNS轮询，DNS的优化点？?


Windows 7下安装了Cygwin，发现没有telnet这个命令。在cygwin的搜索中也找不到telnet。
但是经常使用telnet这个小工具。Google了一下发现包含telnet的包是 inetutils。直接安装inetutils即可。


telnet localhost 8097 shutdown

➜  dev which telnet
/usr/bin/telnet
➜  dev telnet localhost 8005
Trying 127.0.0.1...
Connected to localhost.
Escape character is '^]'.
SHUTDOWN
Connection closed by foreign host.


## Connector

##  

## 线程池策略

场景1：接受一个请求，此时tomcat启动的线程数还没有达到corePoolSize(tomcat里头叫minSpareThreads)，tomcat会启动一个线程来处理该请求；
场景2：接受一个请求，此时tomcat启动的线程数已经达到了corePoolSize，tomcat把该请求放入队列(offer)，如果放入队列成功，则返回，放入队列不成功，则尝试增加工作线程，在当前线程个数<maxThreads的时候，可以继续增加线程来处理，超过maxThreads的时候，则继续往等待队列里头放，等待队列放不进去，则抛出RejectedExecutionException；

## JDK线程池策略

每次提交任务时，如果线程数还没达到coreSize就创建新线程并绑定该任务。所以第coreSize次提交任务后线程总数必达到coreSize，不会重用之前的空闲线程。
线程数达到coreSize后，新增的任务就放到工作队列里，而线程池里的线程则努力的使用take()从工作队列里拉活来干。
如果队列是个有界队列，又如果线程池里的线程不能及时将任务取走，工作队列可能会满掉，插入任务就会失败，此时线程池就会紧急的再创建新的临时线程来补救。
临时线程使用poll(keepAliveTime，timeUnit)来从工作队列拉活，如果时候到了仍然两手空空没拉到活，表明它太闲了，就会被解雇掉。
如果core线程数＋临时线程数 >maxSize，则不能再创建新的临时线程了，转头执行RejectExecutionHanlder。默认的AbortPolicy抛RejectedExecutionException异常，其他选择包括静默放弃当前任务(Discard)，放弃工作队列里最老的任务(DisacardOldest)，或由主线程来直接执行(CallerRuns).


CachedPool则把coreSize设成0，然后选用了一种特殊的Queue -- SynchronousQueue，只要当前没有空闲线程，Queue就会立刻报插入失败，让线程池增加新的临时线程，默认的KeepAliveTime是1分钟，而且maxSize是整型的最大值，也就是说只要有干不完的活，都会无限增增加线程数，直到高峰过去线程数才会回落。

## console 被tomcat 重定向到 catalina.out中


## 参考

requestProcess.pdf



Protocol只有一个， processor是每次new出来的

```java
// org.apache.coyote.AbstractProtocol.ConnectionHandler#process
                if (processor == null) {
                    processor = getProtocol().createProcessor();
                    register(processor);
                }
// org.apache.coyote.http11.AbstractHttp11Protocol#createProcessor
 @Override
    protected Processor createProcessor() {
        Http11Processor processor = new Http11Processor(getMaxHttpHeaderSize(),
                getAllowHostHeaderMismatch(), getRejectIllegalHeaderName(), getEndpoint(),
                getMaxTrailerSize(), allowedTrailerHeaders, getMaxExtensionSize(),
                getMaxSwallowSize(), httpUpgradeProtocols, getSendReasonPhrase(),
                relaxedPathChars, relaxedQueryChars);
        processor.setAdapter(getAdapter());
        processor.setMaxKeepAliveRequests(getMaxKeepAliveRequests());
        processor.setConnectionUploadTimeout(getConnectionUploadTimeout());
        processor.setDisableUploadTimeout(getDisableUploadTimeout());
        processor.setCompressionMinSize(getCompressionMinSize());
        processor.setCompression(getCompression());
        processor.setNoCompressionUserAgents(getNoCompressionUserAgents());
        processor.setCompressibleMimeTypes(getCompressibleMimeTypes());
        processor.setRestrictedUserAgents(getRestrictedUserAgents());
        processor.setMaxSavePostSize(getMaxSavePostSize());
        processor.setServer(getServer());
        processor.setServerRemoveAppProvidedValues(getServerRemoveAppProvidedValues());
        return processor;
    }
```



```java
// org.apache.coyote.AbstractProtocol.ConnectionHandler#process 
// Associate the processor with the connection
                connections.put(socket, processor);

// org.apache.coyote.AbstractProtocol.AsyncTimeout


// org.apache.coyote.AbstractProtocol#start
 @Override
    public void start() throws Exception {
        if (getLog().isInfoEnabled()) {
            getLog().info(sm.getString("abstractProtocolHandler.start", getName()));
        }

        endpoint.start();

        // Start async timeout thread
        asyncTimeout = new AsyncTimeout();
        Thread timeoutThread = new Thread(asyncTimeout, getNameInternal() + "-AsyncTimeout");
        int priority = endpoint.getThreadPriority();
        if (priority < Thread.MIN_PRIORITY || priority > Thread.MAX_PRIORITY) {
            priority = Thread.NORM_PRIORITY;
        }
        timeoutThread.setPriority(priority);
        timeoutThread.setDaemon(true);
        timeoutThread.start();
    }

// org.apache.coyote.AbstractProcessor#timeoutAsync
    @Override
    public void timeoutAsync(long now) {
        if (now < 0) {
            doTimeoutAsync();
        } else {
            long asyncTimeout = getAsyncTimeout();
            if (asyncTimeout > 0) {
                long asyncStart = asyncStateMachine.getLastAsyncStart();
                if ((now - asyncStart) > asyncTimeout) {
                    doTimeoutAsync();
                }
            }
        }
    }

// org.apache.tomcat.util.net.AbstractEndpoint#processSocket
public boolean processSocket(SocketWrapperBase<S> socketWrapper, SocketEvent event, boolean dispatch) {
        try {
            if (socketWrapper == null) {
                return false;
            } else {
                SocketProcessorBase<S> sc = (SocketProcessorBase)this.processorCache.pop();
                if (sc == null) {
                    sc = this.createSocketProcessor(socketWrapper, event);
                } else {
                    sc.reset(socketWrapper, event);
                }

                Executor executor = this.getExecutor();
                if (dispatch && executor != null) {
                    executor.execute(sc);
                } else {
                    sc.run();
                }

                return true;
            }
        } catch (RejectedExecutionException var6) {
            this.getLog().warn(sm.getString("endpoint.executor.fail", new Object[]{socketWrapper}), var6);
            return false;
        } catch (Throwable var7) {
            ExceptionUtils.handleThrowable(var7);
            this.getLog().error(sm.getString("endpoint.process.fail"), var7);
            return false;
        }
    }





  
  
  
  
  
onTimeout:27, AppAsyncListener (com.air.async)
fireOnTimeout:44, AsyncListenerWrapper (org.apache.catalina.core)
timeout:136, AsyncContextImpl (org.apache.catalina.core)
asyncDispatch:153, CoyoteAdapter (org.apache.catalina.connector)
dispatch:236, AbstractProcessor (org.apache.coyote)
process:53, AbstractProcessorLight (org.apache.coyote)
process:800, AbstractProtocol$ConnectionHandler (org.apache.coyote)
doRun:1471, NioEndpoint$SocketProcessor (org.apache.tomcat.util.net)
run:49, SocketProcessorBase (org.apache.tomcat.util.net)
runWorker:1149, ThreadPoolExecutor (java.util.concurrent)
run:624, ThreadPoolExecutor$Worker (java.util.concurrent)
run:61, TaskThread$WrappingRunnable (org.apache.tomcat.util.threads)
run:748, Thread (java.lang)
				^  
  			|
  			| 
processSocket:1048, AbstractEndpoint (org.apache.tomcat.util.net)  ---> 向线程池提交任务： executor.execute(sc);
processSocket:712, SocketWrapperBase (org.apache.tomcat.util.net)
processSocketEvent:744, AbstractProcessor (org.apache.coyote)
doTimeoutAsync:617, AbstractProcessor (org.apache.coyote)
timeoutAsync:606, AbstractProcessor (org.apache.coyote)
run:1149, AbstractProtocol$AsyncTimeout (org.apache.coyote)
run:748, Thread (java.lang)
  
  
  

org.apache.catalina.core.AsyncContextImpl#start
    public void start(Runnable run) {
        if (log.isDebugEnabled()) {
            this.logDebug("start      ");
        }

        this.check();
        Runnable wrapper = new AsyncContextImpl.RunnableWrapper(run, this.context, this.request.getCoyoteRequest());
        this.request.getCoyoteRequest().action(ActionCode.ASYNC_RUN, wrapper);
    }

  case ASYNC_RUN:
            this.asyncStateMachine.asyncRun((Runnable)param);
            break;

org.apache.coyote.AsyncStateMachine#asyncRun
this.processor.getExecutor().execute(runnable);

```



1. [Java-Latte: Architecture of Apache Tomcat](http://java-latte.blogspot.kr/2014/10/introduction-to-architecture-of-apache-tomcat-with-server.xml.html)

2. [Tomcat 系统架构与设计模式，第 1 部分: 工作原理](https://www.ibm.com/developerworks/cn/java/j-lo-tomcat1/)

3. [Guidewire, SAP, Oracle, UNIX, Genesys Technology Blog: Tomcat shutdown port 8005 - Remote Shutdown](http://singcheong.blogspot.kr/2012/10/tomcat-shutdown-port-8005-remote.html)

4. [tomcat线程池策略 - xixicat - SegmentFault](https://segmentfault.com/a/1190000008052008)

5. [Java ThreadPool的正确打开方式 | 江南白衣](http://calvin1978.blogcn.com/articles/java-threadpool.html)

6. [Tomcat线程池，更符合大家想象的可扩展线程池 | 江南白衣](http://calvin1978.blogcn.com/articles/tomcat-threadpool.html)

7. [Tomcat 架构探索 | 一派胡言](http://threezj.com/2016/06/25/Tomcat%20%E6%9E%B6%E6%9E%84%E6%8E%A2%E7%B4%A2/index.html)


