---
title: open-tracing
toc: true
typora-root-url: open-tracing
typora-copy-images-to: open-tracing
tags: tracing
category: microservice
---



## Open-Tracing

> 现代微服务架构正在逐渐普及。面对真正高并发的生产系统，解耦成大量微服务后，以前容易实现的重点任务变得不容易实现了：用户体验优化、后台真实错误原因分析、系统内各组件的调用情况等。分布式跟踪系统（Zipkin、Dapper、HTrace、X-Trace等）可以解决这个问题，但是这些系统使用不兼容的API，难以整合到一起。
>
> **OpenTracing提供平台无关、厂商无关的API，让开发人员可以方便地添加、更换追踪系统。**

相当于是在做标准化，类似日志中的SLF4j，目前还在发展中。

### Trace概念

1、Trace(追踪):
在广义上，一个trace代表了一个事务或者流程在（分布式）系统中的执行过程。在OpenTracing标准中，trace是多个span组成的一个有向无环图（DAG），每一个span代表trace中被命名并计时的连续性的执行片段。

2、Span(跨度)：一个span代表系统中具有开始时间和执行时长的逻辑运行单元。span之间通过嵌套或者顺序排列建立逻辑因果关系。

![image-20210312022847325](/image-20210312022847325.png)

![image-20210312022824793](/image-20210312022824793.png)


#### TraceId作用

- 串起来一次请求

![image-20210312022800718](/image-20210312022800718.png)

- request-id

  ```bash
  {
      "RequestId": "4C467B38-3910-447D-87BC-AC049166F216"
      /* 返回结果数据 */
  }
  ```

  第三方有问题反馈时，可以拿着这个id作为凭证，就省去了很多沟通的问题

  ```bash
  [qisheng.li@YD-app-api-01 logs]$ curl -sI 'http://api2.yaduo.com/atourlife/duomicang/queryDuoMiCangTabOtherData?appVer=3.6.0&channelId=10005&platType=1&token=7254035f0e3e4d05bc7af3afb54f313e&deviceId=73519b32-c539-3c18-af4c-ce4523938bb9&activitySource=ydaandroid&activeId=&inactiveId='
  HTTP/1.1 200
  Date: Fri, 12 Mar 2021 06:19:56 GMT
  Content-Type: application/json;charset=UTF-8
  Content-Length: 2477
  Connection: keep-alive
  Set-Cookie: acw_tc=2760829916155299964998880ec4036c629fa0b9319095cdd9fffc150bc930;path=/;HttpOnly;Max-Age=1800
  ZIPKIN-TRACE-ID: f39f5791988ff5b2
  ```

  ![image-20210312142240390](/image-20210312142240390.png)

- elk关联日志

  ![image-20210312022225378](/image-20210312022225378.png)

- 幂等


## OpenZipkin
### Brave

> Brave is a distributed tracing instrumentation library. 
>
> Brave's dependency-free [tracer library](https://github.com/openzipkin/brave/blob/master/brave) works against JRE6+. 

可以简单理解为标准的实现（类比logback和log4j）

#### Trace上下文传递

```bash
 Client Tracer                                                  Server Tracer     
┌───────────────────────┐                                       ┌───────────────────────┐
│                       │                                       │                       │
│   TraceContext        │          Http Request Headers         │   TraceContext        │
│ ┌───────────────────┐ │         ┌───────────────────┐         │ ┌───────────────────┐ │
│ │ TraceId           │ │         │ X-B3-TraceId      │         │ │ TraceId           │ │
│ │                   │ │         │                   │         │ │                   │ │
│ │ ParentSpanId      │ │ Inject  │ X-B3-ParentSpanId │ Extract │ │ ParentSpanId      │ │
│ │                   ├─┼────────>│                   ├─────────┼>│                   │ │
│ │ SpanId            │ │         │ X-B3-SpanId       │         │ │ SpanId            │ │
│ │                   │ │         │                   │         │ │                   │ │
│ │ Sampling decision │ │         │ X-B3-Sampled      │         │ │ Sampling decision │ │
│ └───────────────────┘ │         └───────────────────┘         │ └───────────────────┘ │
│                       │                                       │                       │
└───────────────────────┘                                       └───────────────────────┘

```

http请求

```bash
2021-03-12 01:29:19.624 INFO [order-center,f211feedd7b9904e,9c4b9442005296fb,true] --- [o-9301-exec-131] http.request.response.log                :
ip: 192.168.6.214
POST http://192.168.6.215:9301/point/pay/query/list?
x-b3-spanid: 9c4b9442005296fb
x-b3-parentspanid: 5e901c4a1fb6be73
x-b3-sampled: 1
x-b3-traceid: f211feedd7b9904e
appcode: pms
content-type: application/json;charset=UTF-8
accept: */*
host: 192.168.6.215:9301
connection: Keep-Alive
user-agent: Apache-HttpClient/4.5.6 (Java/1.8.0_171)
accept-encoding: gzip,deflate
atour-time-out: 1000,20000
atour-proxyee-info: http://192.168.6.215:9301

{  "chainId" : 440319,  "folioIdList" : [ 2589101966 ]}

ret code 200, start time 1615483759621 --> end time 1615483759624, cost: 3
```

header中的`x-b3`开头的会自动传递下去

采样：

```bash
                                Server Tracer     
                              ┌───────────────────────┐
 Health check request         │                       │
┌───────────────────┐         │   TraceContext        │
│ GET /health       │ Extract │ ┌───────────────────┐ │
│ X-B3-Sampled: 0   ├─────────┼>│ NoOp              │ │
└───────────────────┘         │ └───────────────────┘ │
                              └───────────────────────┘
```



### zipkin

![Zipkin架构](/architecture-1.png)

- 上报
 ![img](/2f84e3a7-de34-449b-8733-e944bd103772.jpg)
  - 上报方式
    
    ```java
    @Bean
    Tracing tracing(@Value("${spring.application.name}") String serviceName, @Value("${spring.zipkin.base-url:}") String zipkinServer) {
      Reporter reporter = Reporter.NOOP;
      if (StringUtils.isNotBlank(zipkinServer)) {
        reporter = AsyncReporter.builder(OkHttpSender.create(zipkinServer))
          .queuedMaxSpans(1000) // historical constraint. Note: AsyncReporter supports memory bounds
          .messageTimeout(1, TimeUnit.SECONDS)
          .metrics(ReporterMetrics.NOOP_METRICS)
          .build(SpanBytesEncoder.JSON_V2);
      }
      final SamplerProperties samplerProperties = new SamplerProperties();
      // 默认全采样
      samplerProperties.setProbability(1);
      return Tracing.newBuilder()
        .sampler(new ProbabilityBasedSampler(samplerProperties))
        .localServiceName(serviceName)
        .propagationFactory(ExtraFieldPropagation.newFactory(B3Propagation.FACTORY, "user-name"))
        .currentTraceContext(Slf4jCurrentTraceContext.create(ThreadLocalCurrentTraceContext.newBuilder()
                                                             .build()))
        .spanReporter(reporter)
        .build();
    }
    ```
    
    - 采样
    - Reporter
    - eureka支持
    
  - 挂掉影响
- Zipkin 展示端
   - ![Trace view screenshot](/web-screenshot.png)
   - ![Dependency graph screenshot](/dependency-graph.png)
- zipkin存储
  - mysql
    - 玩具
  - elastic-search
    - 调优
      - translog
      - Refresh_interval
      - _id
    - 保留几天
    - 定时删除脚本
    - elastic-search的template

### 系统接入

## Spring-Cloud

### Sleuth

> Sleuth configures everything you need to get started. This includes where trace data (spans) are reported to, how many traces to keep (sampling), if remote fields (baggage) are sent, and which libraries are traced.
>
> 
>
> Spring Cloud Sleuth integrates with the OpenZipkin Brave tracer via the bridge that is available in the `spring-cloud-sleuth-brave` module.

- baggage

  - Request级别的日志debug开关
  
    @see [Sleuth-debug-flag - Atour Wiki](http://wiki.corp.yaduo.com/index.php/Sleuth-debug-flag)

![image-20210312130036912](/image-20210312130036912.png) ![image-20210312125542638](/image-20210312125542638.png)

 ![image-20210312125715781](/image-20210312125715781.png)

 ![image-20210312125618924](/image-20210312125618924.png)

 ![image-20210312125751929](/image-20210312125751929.png)

 ![image-20210312125846371](/image-20210312125846371.png)

- @NewSpan
- @SpanTag
- @ContinueSpan

相关代码位置：

```java
// org.springframework.cloud.sleuth.instrument.web.TraceWebServletAutoConfiguration
// brave.servlet.TracingFilter
// org.springframework.cloud.sleuth.autoconfig.TraceAutoConfiguration#sleuthPropagation
// org.springframework.cloud.sleuth.log.SleuthLogAutoConfiguration

Slf4jCurrentTraceContext <- CurrentTraceContext
```

埋点增强

- db

- 线程池

  - Brave:

    ```java
    // brave.propagation.CurrentTraceContext
    /**
       * Decorates the input such that the {@link #get() current trace context} at the time a task is
       * scheduled is made current when the task is executed.
       */
    public ExecutorService executorService(ExecutorService delegate) {
      class CurrentTraceContextExecutorService extends brave.internal.WrappingExecutorService {
    
        @Override protected ExecutorService delegate() {
          return delegate;
        }
    
        @Override protected <C> Callable<C> wrap(Callable<C> task) {
          return CurrentTraceContext.this.wrap(task);
        }
    
        @Override protected Runnable wrap(Runnable task) {
          return CurrentTraceContext.this.wrap(task);
        }
      }
      return new CurrentTraceContextExecutorService();
    }
    
    
    /** Wraps the input so that it executes with the same context as now. */
    public <C> Callable<C> wrap(Callable<C> task) {
      final TraceContext invocationContext = get();
      class CurrentTraceContextCallable implements Callable<C> {
        @Override public C call() throws Exception {
          try (Scope scope = maybeScope(invocationContext)) {
            return task.call();
          }
        }
      }
      return new CurrentTraceContextCallable();
    }
    ```

  - sleuth:

    ```java
    // org.springframework.cloud.sleuth.instrument.async.LazyTraceExecutor
    @Override
    public void execute(Runnable command) {
      if (this.tracing == null) {
        try {
          this.tracing = this.beanFactory.getBean(Tracing.class);
        }
        catch (NoSuchBeanDefinitionException e) {
          this.delegate.execute(command);
          return;
        }
      }
      this.delegate.execute(new TraceRunnable(this.tracing, spanNamer(), command));
    }
    
    // org.springframework.cloud.sleuth.instrument.async.ExecutorBeanPostProcessor  代理逻辑
    ```

- bolt

- feign

- rocketmq

## 问题排查



## 参考

1. [Zikin-server运维 - Atour Wiki](http://wiki.corp.yaduo.com/index.php/Zikin-server%E8%BF%90%E7%BB%B4)
2. [What is Distributed Tracing?](https://opentracing.io/docs/overview/what-is-tracing/)
3. [Spring Cloud Sleuth 2.0概要使用说明 - BTStream's Blog](https://blog.btstream.net/post/2019-01-14-spring-cloud-sleuth-2.0%E6%A6%82%E8%A6%81%E4%BD%BF%E7%94%A8%E8%AF%B4%E6%98%8E/)
4. [GitHub - spring-cloud/spring-cloud-sleuth: Distributed tracing for spring cloud](https://github.com/spring-cloud/spring-cloud-sleuth)
5. [OpenTracing基本原理 - 知乎](https://zhuanlan.zhihu.com/p/268740698)
6. [openTracing文档中文版](https://wu-sheng.gitbooks.io/opentracing-io/content/)
7. [GitHub - openzipkin/brave: Java distributed tracing implementation compatible with Zipkin backend services.](https://github.com/openzipkin/brave)
8. [Sleuth-debug-flag - Atour Wiki](http://wiki.corp.yaduo.com/index.php/Sleuth-debug-flag)
9. [Introducing to Zipkin - Distribution Tracing - ITZone](https://itzone.com.vn/en/article/introducing-to-zipkin-distribution-tracing/amp/)
10. [OpenZipkin · A distributed tracing system](https://zipkin.io/)
11. [GitHub - openzipkin/b3-propagation: Repository that describes and sometimes implements B3 propagation](https://github.com/openzipkin/b3-propagation)
12. [干货 | Qunar全链路跟踪及Debug](https://mp.weixin.qq.com/s?__biz=MjM5MDI3MjA5MQ==&mid=2697266385&idx=2&sn=2712989b72306cb153e1fcbac216bef2&chksm=8376fbe5b40172f35eb049e81fdd0f554a281458acb6ff0066e7da9ce15e52d0e67bc42ae4ac&mpshare=1&scene=1&srcid=0403dk8RFwBQSrcJQGiZW0Pm%23rd)
13. [zipkin-Kibana](http://zipkin.kibana.corp.yaduo-l.com/app/kibana)
14. [elk-Discover - Kibana](http://elk.corp.yaduo-l.com/app/kibana#/discover?_g=()&_a=(columns:!(_source),index:'01f5dec0-e772-11ea-9d81-e1017b1b6645',interval:auto,query:(language:lucene,query:ee3ceac468425f6e),sort:!('@timestamp',desc)))

