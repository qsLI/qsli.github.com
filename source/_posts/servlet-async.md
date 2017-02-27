title: 异步Servlet及Spring对其的支持
tags: servlet
category: spring
toc: true
date: 2017-02-28 01:47:22
---


## 测试

限定 tomcat的连接池个数为50，并发为200（>> 线程池大小），时异步具有很大的优势。

如果并发量小于线程池大小，异步的反倒比同步的时间长了很久。

```xml
<Connector port="8080" protocol="HTTP/1.1"
            maxThreads="50"
            connectionTimeout="20000"
            redirectPort="8443" URIEncoding="UTF-8"/>
```

完整的测试代码地址： [](https://github.com/qsLI/Java_Tutorial/blob/master/web/src/main/java/com/air/async/AsyncRequestProcessor.java)

### async ab测试

```
$ ab -n 10000 -c 200 http://localhost:8080/async
This is ApacheBench, Version 2.3 <$Revision: 655654 $>
Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
Licensed to The Apache Software Foundation, http://www.apache.org/

Benchmarking localhost (be patient)
Completed 1000 requests
Completed 2000 requests
Completed 3000 requests
Completed 4000 requests
Completed 5000 requests
Completed 6000 requests
Completed 7000 requests
Completed 8000 requests
Completed 9000 requests
Completed 10000 requests
Finished 10000 requests


Server Software:        Apache-Coyote/1.1
Server Hostname:        localhost
Server Port:            8080

Document Path:          /async
Document Length:        40 bytes

Concurrency Level:      200
Time taken for tests:   1000.284 seconds
Complete requests:      10000
Failed requests:        47
   (Connect: 0, Receive: 0, Length: 47, Exceptions: 0)
Write errors:           0
Non-2xx responses:      47
Total transferred:      1530740 bytes
HTML transferred:       506980 bytes
Requests per second:    10.00 [#/sec] (mean)
Time per request:       20005.686 [ms] (mean)
Time per request:       100.028 [ms] (mean, across all concurrent requests)
Transfer rate:          1.49 [Kbytes/sec] received

Connection Times (ms)
              min  mean[+/-sd] median   max
Connect:        0    0   5.0      0     501
Processing:     2 19810 1683.3  20001   20560
Waiting:        1 19810 1683.4  20000   20558
Total:          2 19811 1683.0  20001   20560

Percentage of the requests served within a certain time (ms)
  50%  20001
  66%  20001
  75%  20002
  80%  20002
  90%  20004
  95%  20009
  98%  20020
  99%  20035
 100%  20560 (longest request)
```

测试过程中出的异常：

```
一月 21, 2017 1:05:32 上午 org.apache.catalina.core.StandardWrapperValve invoke
严重: Servlet.service() for servlet [com.air.async.AsyncServlet] in context with path [] threw exception
java.util.concurrent.RejectedExecutionException: Task com.air.async.AsyncRequestProcessor@3caec762 rejected from java.util.concurrent.ThreadPoolExecutor@64db0f23[Running, pool size = 100, active threads = 100, queued tasks = 100, completed tasks = 9726]
  at java.util.concurrent.ThreadPoolExecutor$AbortPolicy.rejectedExecution(ThreadPoolExecutor.java:2048)
  at java.util.concurrent.ThreadPoolExecutor.reject(ThreadPoolExecutor.java:821)
  at java.util.concurrent.ThreadPoolExecutor.execute(ThreadPoolExecutor.java:1372)
  at com.air.async.AsyncServlet.doGet(AsyncServlet.java:25)
  at javax.servlet.http.HttpServlet.service(HttpServlet.java:621)
  at javax.servlet.http.HttpServlet.service(HttpServlet.java:728)
  at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:305)
  at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:210)
  at org.apache.tomcat.websocket.server.WsFilter.doFilter(WsFilter.java:51)
  at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:243)
  at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:210)
  at org.apache.catalina.core.StandardWrapperValve.invoke(StandardWrapperValve.java:222)
  at org.apache.catalina.core.StandardContextValve.invoke(StandardContextValve.java:123)
  at org.apache.catalina.authenticator.AuthenticatorBase.invoke(AuthenticatorBase.java:502)
  at org.apache.catalina.core.StandardHostValve.invoke(StandardHostValve.java:171)
  at org.apache.catalina.valves.ErrorReportValve.invoke(ErrorReportValve.java:100)
  at org.apache.catalina.valves.AccessLogValve.invoke(AccessLogValve.java:953)
  at org.apache.catalina.core.StandardEngineValve.invoke(StandardEngineValve.java:118)
  at org.apache.catalina.connector.CoyoteAdapter.service(CoyoteAdapter.java:408)
  at org.apache.coyote.http11.AbstractHttp11Processor.process(AbstractHttp11Processor.java:1041)
  at org.apache.coyote.AbstractProtocol$AbstractConnectionHandler.process(AbstractProtocol.java:603)
  at org.apache.tomcat.util.net.AprEndpoint$SocketProcessor.doRun(AprEndpoint.java:2430)
  at org.apache.tomcat.util.net.AprEndpoint$SocketProcessor.run(AprEndpoint.java:2419)
  at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1145)
  at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:615)
  at java.lang.Thread.run(Thread.java:745)
```

有47个失败的case，是队列满了，然后丢掉了请求。

#### sync ab测试

```
$ ab -n 10000 -c 200 http://localhost:8080/hello
This is ApacheBench, Version 2.3 <$Revision: 655654 $>
Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
Licensed to The Apache Software Foundation, http://www.apache.org/

Benchmarking localhost (be patient)
Completed 1000 requests
Completed 2000 requests
Completed 3000 requests
Completed 4000 requests
Completed 5000 requests
Completed 6000 requests
Completed 7000 requests
Completed 8000 requests
Completed 9000 requests
Completed 10000 requests
Finished 10000 requests


Server Software:        Apache-Coyote/1.1
Server Hostname:        localhost
Server Port:            8080

Document Path:          /hello
Document Length:        12 bytes

Concurrency Level:      200
Time taken for tests:   2002.151 seconds
Complete requests:      10000
Failed requests:        0
Write errors:           0
Total transferred:      1340000 bytes
HTML transferred:       120000 bytes
Requests per second:    4.99 [#/sec] (mean)
Time per request:       40043.028 [ms] (mean)
Time per request:       200.215 [ms] (mean, across all concurrent requests)
Transfer rate:          0.65 [Kbytes/sec] received

Connection Times (ms)
              min  mean[+/-sd] median   max
Connect:        0    0   0.4      0       8
Processing: 10002 39740 2686.3  40005   50319
Waiting:    10002 39740 2686.4  40004   50319
Total:      10002 39741 2686.3  40005   50319

Percentage of the requests served within a certain time (ms)
  50%  40005
  66%  40009
  75%  40014
  80%  40022
  90%  40122
  95%  40316
  98%  40449
  99%  40483
 100%  50319 (longest request)
```

### 结论

异步的servle在高并发的情况下可以使用较少的连接线程实现较大的吞吐。

## 实现

```java
 /**
     * Puts this request into asynchronous mode, and initializes its
     * {@link AsyncContext} with the original (unwrapped) ServletRequest
     * and ServletResponse objects.
     *
     * <p>Calling this method will cause committal of the associated
     * response to be delayed until {@link AsyncContext#complete} is
     * called on the returned {@link AsyncContext}, or the asynchronous
     * operation has timed out.
     *
     * <p>Calling {@link AsyncContext#hasOriginalRequestAndResponse()} on
     * the returned AsyncContext will return <code>true</code>. Any filters
     * invoked in the <i>outbound</i> direction after this request was put
     * into asynchronous mode may use this as an indication that any request
     * and/or response wrappers that they added during their <i>inbound</i>
     * invocation need not stay around for the duration of the asynchronous
     * operation, and therefore any of their associated resources may be
     * released.
     *
     * <p>This method clears the list of {@link AsyncListener} instances
     * (if any) that were registered with the AsyncContext returned by the
     * previous call to one of the startAsync methods, after calling each
     * AsyncListener at its {@link AsyncListener#onStartAsync onStartAsync}
     * method.
     *
     * <p>Subsequent invocations of this method, or its overloaded 
     * variant, will return the same AsyncContext instance, reinitialized
     * as appropriate.
     *
     * @return the (re)initialized AsyncContext
     * 
     * @throws IllegalStateException if this request is within the scope of
     * a filter or servlet that does not support asynchronous operations
     * (that is, {@link #isAsyncSupported} returns false),
     * or if this method is called again without any asynchronous dispatch
     * (resulting from one of the {@link AsyncContext#dispatch} methods),
     * is called outside the scope of any such dispatch, or is called again
     * within the scope of the same dispatch, or if the response has
     * already been closed
     *
     * @see AsyncContext#dispatch()
     * @since Servlet 3.0
     */
        public AsyncContext startAsync() throws IllegalStateException;
```

//挖坑，待填

## Spring 对异步Servlet的支持

web.xml中需要的配置：

```xml
    <!--spring encoding filter-->
    <filter>
        <filter-name>CharacterEncodingFilter</filter-name>
        <filter-class>org.springframework.web.filter.CharacterEncodingFilter</filter-class>
        <init-param>
            <param-name>encoding</param-name>
            <param-value>utf-8</param-value>
        </init-param>
        <async-supported>true</async-supported>
    </filter>

        <!--servlet-->
    <servlet>
        <servlet-name>dispatcherServlet</servlet-name>
        <servlet-class>org.springframework.web.servlet.DispatcherServlet</servlet-class>
        <init-param>
            <param-name>contextConfigLocation</param-name>
            <param-value>
                classpath:spring/mvc/mvc-app.xml
            </param-value>
        </init-param>
        <load-on-startup>1</load-on-startup>
        <async-supported>true</async-supported>
    </servlet>
```

如果有filter的话也必须配置上异步的支持

### Callable 方式

```java
    @RequestMapping("/async")
    @PostMapping
    public Callable<String> asyncProcess() {
        return new Callable<String>() {
            @Override
            public String call() throws Exception {
                return "index";
            }
        };
    }
```

这种方式返回一个`Callable`，Spring在线程池中执行`Callable`并获取到结果然后进行后续的处理。

TaskExecutor 自定义线程池：

```xml
  <!-- ================================== -->  
  <!-- 0. Set up task executor for async  -->
  <!-- ================================== -->
  <mvc:annotation-driven> 
    <mvc:async-support default-timeout="30000" task-executor="taskExecutor"/>
  </mvc:annotation-driven>
  <!-- modify the parameters of thread pool -->
  <bean id="taskExecutor" class="org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor">
    <property name="corePoolSize" value="5"/>
    <property name="maxPoolSize" value="50"/>
    <property name="queueCapacity" value="10"/>
    <property name="keepAliveSeconds" value="120"/>
  </bean>
```



### DeferredResult 方式

```java
 @RequestMapping("/asyncV2")
    public DeferredResult<String> aysncProcess2() {
        final DeferredResult<String> stringDeferredResult = new DeferredResult<>();
        MoreExecutors.directExecutor().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    Thread.sleep(30000);
                    stringDeferredResult.setResult("index");
                } catch (InterruptedException e) {
                    stringDeferredResult.setErrorResult("error");
                }
            }
        });
        return stringDeferredResult;
    }
```

这种方式返回的是`DeferredResult`，计算的逻辑可以在业务线程池中计算，当计算完成后，

直接向`DeferredResult`中set数据即可，会触发后续的处理，并返回给客户端。

### 实现细节

`RequestMappingHandlerAdapter`

```java
/**
   * Invoke the {@link RequestMapping} handler method preparing a {@link ModelAndView}
   * if view resolution is required.
   * @since 4.2
   * @see #createInvocableHandlerMethod(HandlerMethod)
   */
  protected ModelAndView invokeHandlerMethod(HttpServletRequest request,
      HttpServletResponse response, HandlerMethod handlerMethod) throws Exception {

    ServletWebRequest webRequest = new ServletWebRequest(request, response);
    try {
      WebDataBinderFactory binderFactory = getDataBinderFactory(handlerMethod);
      ModelFactory modelFactory = getModelFactory(handlerMethod, binderFactory);

      ServletInvocableHandlerMethod invocableMethod = createInvocableHandlerMethod(handlerMethod);
      invocableMethod.setHandlerMethodArgumentResolvers(this.argumentResolvers);
      invocableMethod.setHandlerMethodReturnValueHandlers(this.returnValueHandlers);
      invocableMethod.setDataBinderFactory(binderFactory);
      invocableMethod.setParameterNameDiscoverer(this.parameterNameDiscoverer);

      ModelAndViewContainer mavContainer = new ModelAndViewContainer();
      mavContainer.addAllAttributes(RequestContextUtils.getInputFlashMap(request));
      modelFactory.initModel(webRequest, mavContainer, invocableMethod);
      mavContainer.setIgnoreDefaultModelOnRedirect(this.ignoreDefaultModelOnRedirect);

      //创建异步请求
      AsyncWebRequest asyncWebRequest = WebAsyncUtils.createAsyncWebRequest(request, response);
      asyncWebRequest.setTimeout(this.asyncRequestTimeout);

      //下面的代码设置了Callable执行的线程池，以及拦截器还有DeferredResult的拦截器
      WebAsyncManager asyncManager = WebAsyncUtils.getAsyncManager(request);
      asyncManager.setTaskExecutor(this.taskExecutor);
      asyncManager.setAsyncWebRequest(asyncWebRequest);
      asyncManager.registerCallableInterceptors(this.callableInterceptors);
      asyncManager.registerDeferredResultInterceptors(this.deferredResultInterceptors);

      if (asyncManager.hasConcurrentResult()) {
        Object result = asyncManager.getConcurrentResult();
        mavContainer = (ModelAndViewContainer) asyncManager.getConcurrentResultContext()[0];
        asyncManager.clearConcurrentResult();
        if (logger.isDebugEnabled()) {
          logger.debug("Found concurrent result value [" + result + "]");
        }
        invocableMethod = invocableMethod.wrapConcurrentResult(result);
      }

      invocableMethod.invokeAndHandle(webRequest, mavContainer);
      if (asyncManager.isConcurrentHandlingStarted()) {
        return null;
      }

      return getModelAndView(mavContainer, modelFactory, webRequest);
    }
    finally {
      webRequest.requestCompleted();
    }
  }
```

#### Callable 的处理

`Callable`的处理是在`CallableMethodReturnValueHandler`中的，这个接口最终继承了`HandlerMethodReturnValueHandler`, 也就是对Controller方法返回值的后处理。

```java
public class CallableMethodReturnValueHandler implements AsyncHandlerMethodReturnValueHandler {
  //省略...
  @Override
  public void handleReturnValue(Object returnValue, MethodParameter returnType,
      ModelAndViewContainer mavContainer, NativeWebRequest webRequest) throws Exception {

    if (returnValue == null) {
      mavContainer.setRequestHandled(true);
      return;
    }

    Callable<?> callable = (Callable<?>) returnValue;
    WebAsyncUtils.getAsyncManager(webRequest).startCallableProcessing(callable, mavContainer);
  }
}
```

最终是调用了`WebAsyncManager`的`startCallableProcessing`进行处理

`WebAsyncManager`中的关键代码：

```java
public void startCallableProcessing(Callable<?> callable, Object... processingContext) throws Exception {
    Assert.notNull(callable, "Callable must not be null");
    startCallableProcessing(new WebAsyncTask(callable), processingContext);
  }

  public void startCallableProcessing(final WebAsyncTask<?> webAsyncTask, Object... processingContext) throws Exception {
    Assert.notNull(webAsyncTask, "WebAsyncTask must not be null");
    Assert.state(this.asyncWebRequest != null, "AsyncWebRequest must not be null");

    //超时
    Long timeout = webAsyncTask.getTimeout();
    if (timeout != null) {
      this.asyncWebRequest.setTimeout(timeout);
    }
    //线程池
    AsyncTaskExecutor executor = webAsyncTask.getExecutor();
    if (executor != null) {
      this.taskExecutor = executor;
    }
    //拦截器
    List<CallableProcessingInterceptor> interceptors = new ArrayList<CallableProcessingInterceptor>();
    interceptors.add(webAsyncTask.getInterceptor());
    interceptors.addAll(this.callableInterceptors.values());
    interceptors.add(timeoutCallableInterceptor);

    final Callable<?> callable = webAsyncTask.getCallable();
    final CallableInterceptorChain interceptorChain = new CallableInterceptorChain(interceptors);

    //超时处理
    this.asyncWebRequest.addTimeoutHandler(new Runnable() {
      @Override
      public void run() {
        logger.debug("Processing timeout");
        Object result = interceptorChain.triggerAfterTimeout(asyncWebRequest, callable);
        if (result != CallableProcessingInterceptor.RESULT_NONE) {
          setConcurrentResultAndDispatch(result);
        }
      }
    });

    //成功的回调，会触发拦截器的拦截
    this.asyncWebRequest.addCompletionHandler(new Runnable() {
      @Override
      public void run() {
        interceptorChain.triggerAfterCompletion(asyncWebRequest, callable);
      }
    });

    //拦截
    interceptorChain.applyBeforeConcurrentHandling(this.asyncWebRequest, callable);
    startAsyncProcessing(processingContext);
    try {
      this.taskExecutor.submit(new Runnable() {
        @Override
        public void run() {
          Object result = null;
          try {
            //拦截
            interceptorChain.applyPreProcess(asyncWebRequest, callable);
            result = callable.call();
          }
          catch (Throwable ex) {
            result = ex;
          }
          finally {
            //拦截
            result = interceptorChain.applyPostProcess(asyncWebRequest, callable, result);
          }
          setConcurrentResultAndDispatch(result);
        }
      });
    }
    catch (RejectedExecutionException ex) {
      Object result = interceptorChain.applyPostProcess(this.asyncWebRequest, callable, ex);
      setConcurrentResultAndDispatch(result);
      throw ex;
    }
  }
```

#### DeferredResult 的处理

DeferredResult的返回时机就是有数据的时候，顺藤摸瓜:

```java
public boolean setResult(T result) {
    return setResultInternal(result);
  }

  private boolean setResultInternal(Object result) {
    // Immediate expiration check outside of the result lock
    if (isSetOrExpired()) {
      return false;
    }
    DeferredResultHandler resultHandlerToUse;
    synchronized (this) {
      // Got the lock in the meantime: double-check expiration status
      if (isSetOrExpired()) {
        return false;
      }
      // At this point, we got a new result to process
      this.result = result;
      resultHandlerToUse = this.resultHandler;
      if (resultHandlerToUse == null) {
        // No result handler set yet -> let the setResultHandler implementation
        // pick up the result object and invoke the result handler for it.
        return true;
      }
      // Result handler available -> let's clear the stored reference since
      // we don't need it anymore.
      this.resultHandler = null;
    }
    // If we get here, we need to process an existing result object immediately.
    // The decision is made within the result lock; just the handle call outside
    // of it, avoiding any deadlock potential with Servlet container locks.
    resultHandlerToUse.handleResult(result);
    return true;
  }
```

`DeferredResultHandler`是什么鬼？我们new的时候没有设置啊？？其实这个也是由`HandlerMethodReturnValueHandler`来实现的，有个对应的`DeferredResultMethodReturnValueHandler`

```java
  @Override
  public void handleReturnValue(Object returnValue, MethodParameter returnType,
      ModelAndViewContainer mavContainer, NativeWebRequest webRequest) throws Exception {

    if (returnValue == null) {
      mavContainer.setRequestHandled(true);
      return;
    }

    DeferredResultAdapter adapter = getAdapterFor(returnValue.getClass());
    Assert.notNull(adapter);
    DeferredResult<?> result = adapter.adaptToDeferredResult(returnValue);
    WebAsyncUtils.getAsyncManager(webRequest).startDeferredResultProcessing(result, mavContainer);
  }
```

最终还是到了`WebAsyncManager`的处理方法中，和`Callable`的处理类似，不一一深入。

值得一提的是，正是在这个`startDeferredResultProcessing`中塞入了一个`DeferredResultHandler`

```java
try {
      interceptorChain.applyPreProcess(this.asyncWebRequest, deferredResult);
      deferredResult.setResultHandler(new DeferredResultHandler() {
        @Override
        public void handleResult(Object result) {
          result = interceptorChain.applyPostProcess(asyncWebRequest, deferredResult, result);
          setConcurrentResultAndDispatch(result);
        }
      });
    }
    catch (Throwable ex) {
      setConcurrentResultAndDispatch(ex);
    }
```

因为我们是异步执行的，所以虽然handler的注入在后面，其实影响也不大，而且`setResult`中也做了判断。


## 参考

1. [Async Servlet Feature of Servlet 3 - JournalDev](http://www.journaldev.com/2008/async-servlet-feature-of-servlet-3)

2. [17.12 Asynchronous Processing - Java Platform, Enterprise Edition: The Java EE Tutorial (Release 7)](https://docs.oracle.com/javaee/7/tutorial/servlets012.htm)

3. [ab - Apache HTTP server benchmarking tool - Apache HTTP Server Version 2.4](https://httpd.apache.org/docs/2.4/programs/ab.html)

4. [系统吞吐量（TPS）、用户并发量、性能测试概念和公式](http://www.ha97.com/5095.html)

5. [servlet3新特性——异步请求处理 | 晓的技术博客](https://lanjingling.github.io/2016/01/20/servlet3-new-furture/)

6. [解决java.util.concurrent.RejectedExecutionException - 小一的专栏 - 博客频道 - CSDN.NET](http://blog.csdn.net/wzy_1988/article/details/38922449)

7. [Springmvc异步支持报错- - Lai18.com IT技术文章收藏夹](http://www.lai18.com/content/2483896.html)

8. [Asynchronous Spring MVC – Hello World Example | Code Breeze !](http://shengwangi.blogspot.hk/2015/09/asynchronous-spring-mvc-hello-world.html)