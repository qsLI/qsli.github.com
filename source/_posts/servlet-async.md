---
title: 异步Servlet及Spring对其的支持
tags: servlet
category: spring
toc: true
typora-root-url: servlet-async
typora-copy-images-to: servlet-async
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

### sync ab测试

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

## 使用
### Async Servlet使用

```java
package com.air.async;

import com.air.SampleServlet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.AsyncContext;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * @author qisheng.li
 * @date 2017/1/15 9:25
 */
@WebServlet(urlPatterns = "/async", asyncSupported = true)
public class AsyncServlet extends HttpServlet{
    private static final Logger LOGGER = LoggerFactory.getLogger(AsyncServlet.class);

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        LOGGER.error("before start async thread is " + Thread.currentThread().getName());
        AsyncContext asyncContext = req.startAsync();
        asyncContext.addListener(new AppAsyncListener());
        // 这个超时没有生效，因为tomcat的扫描间隔是1s  org.apache.coyote.AbstractProtocol.AsyncTimeout
        asyncContext.setTimeout(500);
        LOGGER.error("after start async thread is " + Thread.currentThread().getName());

        /*
         使用自定义的线程池
          10:52:19.057 [http-nio-8080-exec-4] ERROR com.air.async.AsyncServlet - before start async thread is http-nio-8080-exec-4
          10:52:19.065 [http-nio-8080-exec-4] ERROR com.air.async.AsyncServlet - after start async thread is http-nio-8080-exec-4
          10:52:19.066 [pool-2-thread-1] ERROR com.air.async.AsyncRequestProcessor - in threadpool thread is pool-2-thread-1
          10:52:20.358 [http-nio-8080-exec-5] ERROR com.air.async.AppAsyncListener - async event on Timeout

          1s 292之后才超时
         */
//        ThreadPoolExecutor executor = (ThreadPoolExecutor) req.getServletContext().getAttribute("executor");
//        executor.execute(new AsyncRequestProcessor(asyncContext, 10000));

        /*
           使用tomcat的工作线程池
            15:34:59.535 [http-nio-8080-exec-4] ERROR com.air.async.AsyncServlet - before start async thread is http-nio-8080-exec-4
            15:34:59.545 [http-nio-8080-exec-4] ERROR com.air.async.AsyncServlet - after start async thread is http-nio-8080-exec-4
            15:34:59.547 [http-nio-8080-exec-5] ERROR com.air.async.AsyncRequestProcessor - in threadpool thread is http-nio-8080-exec-5
            15:35:00.254 [http-nio-8080-exec-6] ERROR com.air.async.AppAsyncListener - async event on Timeout
          可以看到线程名称从http-nio-8080-exec-4 变为了 http-nio-8080-exec-5，都是tomcat的工作线程
          timeout的回调在http-nio-8080-exec-6线程中处理
         */
        asyncContext.start(new AsyncRequestProcessor(asyncContext, 100));
    }
}



/**
 * @author qisheng.li
 * @date 2017/1/15 9:30
 */
public class AsyncRequestProcessor implements Runnable {

    private static final Logger LOGGER = LoggerFactory.getLogger(AsyncRequestProcessor.class);


    private AsyncContext asyncContext;
    //sleeping time in millionsecs
    private int secs;

    public AsyncRequestProcessor(AsyncContext asyncContext, int secs) {
        this.asyncContext = asyncContext;
        this.secs = secs;
    }

    @Override
    public void run() {
//        System.out.println("Async Supported? " + asyncContext.getRequest().isAsyncSupported());
        try {
            LOGGER.error("in threadpool thread is " + Thread.currentThread().getName());
            Thread.sleep(secs);
            PrintWriter writer = asyncContext.getResponse().getWriter();
            writer.write("Processing done for " + secs + " milliseconds!!");
            //异步调用完成，如果异步调用完成后不调用complete()方法的话，异步调用的结果需要等到设置的超时
            //时间过了之后才能返回到客户端。
            asyncContext.complete();
            // 可以跳转其他url, 类似 dispatcher.forward(req, resp);
//            asyncContext.dispatch();
        } catch (InterruptedException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static void main(String[] args) {
        Boolean aFalse = Boolean.valueOf("false");
        if (!aFalse) {
            System.out.println("false");
        }
    }
}

```



### Spring 对异步Servlet的支持

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

#### Callable 方式

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



#### DeferredResult 方式

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

`DeferredResult`也可以设置超时和超时时的默认值：

```java
private static final ResponseEntity<Map<String, String>> NOT_MODIFIED_RESPONSE_LIST = new ResponseEntity<>(HttpStatus.NOT_MODIFIED);
final DeferredResult<ResponseEntity<Map<String, String>>> deferredResult = new DeferredResult<>(90000L, NOT_MODIFIED_RESPONSE_LIST);
```

90s后会自动超时掉。

## 实现细节

### Async Servlet

async servlet是servlet规范的一部分，规范中定义好接口，具体的实现就看具体的容器了（比如tomcat， jetty等）。

![image-20210225163740510](/image-20210225163740510.png)

### Spring的封装

`org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter`

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

      // 创建异步请求，这个AsyncWebRequest是spring抽象出来的
      AsyncWebRequest asyncWebRequest = WebAsyncUtils.createAsyncWebRequest(request, response);
      //① 异步请求的超时
      asyncWebRequest.setTimeout(this.asyncRequestTimeout);

      //下面的代码设置了Callable执行的线程池，以及拦截器还有DeferredResult的拦截器
      WebAsyncManager asyncManager = WebAsyncUtils.getAsyncManager(request);
      //② 异步的线程池
      asyncManager.setTaskExecutor(this.taskExecutor);
      asyncManager.setAsyncWebRequest(asyncWebRequest);
      asyncManager.registerCallableInterceptors(this.callableInterceptors);
      asyncManager.registerDeferredResultInterceptors(this.deferredResultInterceptors);
			
      // 异步处理有结果之后，就会有concurrentResult,调用的是asyncContext.dispatch()方法，会重新进到这个类中
      if (asyncManager.hasConcurrentResult()) {
        Object result = asyncManager.getConcurrentResult();
        mavContainer = (ModelAndViewContainer) asyncManager.getConcurrentResultContext()[0];
        asyncManager.clearConcurrentResult();
        if (logger.isDebugEnabled()) {
          logger.debug("Found concurrent result value [" + result + "]");
        }
        //③ 这里替换了对应的处理方法, 会跳过实际的执行; 重新走一遍的原因，是因为要对实际的返回值做处理（转json或者xml等）
        invocableMethod = invocableMethod.wrapConcurrentResult(result);
      }
			// 调用对应的方法，处理http请求
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

③处的实现细节，直接返回了异步的结果：

```java
// org.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod.ConcurrentResultHandlerMethod
public ConcurrentResultHandlerMethod(final Object result, ConcurrentResultMethodParameter returnType) {
			super(new Callable<Object>() {
        @Override
        public Object call() throws Exception {
          if (result instanceof Exception) {
            throw (Exception) result;
          }
          else if (result instanceof Throwable) {
            throw new NestedServletException("Async processing failed", (Throwable) result);
          }
          return result;
        }
      }, CALLABLE_METHOD);

  setHandlerMethodReturnValueHandlers(ServletInvocableHandlerMethod.this.returnValueHandlers);
  this.returnType = returnType;
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
            //拦截before
            interceptorChain.applyPreProcess(asyncWebRequest, callable);
            result = callable.call();
          }
          catch (Throwable ex) {
            result = ex;
          }
          finally {
            //拦截after
            result = interceptorChain.applyPostProcess(asyncWebRequest, callable, result);
          }
          // 触发结果的返回
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
`setConcurrentResultAndDispatch` 调用`asyncContext`的`dispatch`方法触发结果的回写

```java
	private void setConcurrentResultAndDispatch(Object result) {
		synchronized (WebAsyncManager.this) {
			if (hasConcurrentResult()) {
				return;
			}
			this.concurrentResult = result;
		}

		if (this.asyncWebRequest.isAsyncComplete()) {
			logger.error("Could not complete async processing due to timeout or network error");
			return;
		}

		if (logger.isDebugEnabled()) {
			logger.debug("Concurrent result value [" + this.concurrentResult +
					"] - dispatching request to resume processing");
		}

		this.asyncWebRequest.dispatch();
	}
```

这里之所以调用的是`dispatch()`而不是`complete()`，是因为请求需要再走一遍spring的流程，处理真正的返回值等。

#### DeferredResult 的处理

DeferredResult类似guava中的SettableFuture，主要属性有：

```java
private final Object timeoutResult;

private Runnable timeoutCallback;

private Runnable completionCallback;

private DeferredResultHandler resultHandler;

private volatile Object result = RESULT_NONE;
```

当给DeferredResult set结果的时候，触发后续的流程（类似onSuccess）。

![image-20210225163812285](/image-20210225163812285.png)

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

