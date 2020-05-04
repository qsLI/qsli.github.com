---
title: Feign方法级别的超时
tags: spring-cloud
category: feign
toc: true
typora-root-url: Feign方法级别的超时
typora-copy-images-to: Feign方法级别的超时
date: 2020-04-28 14:00:44
---



![image-20200428135947174](/image-20200428135947174.png)

## Feign方法级别的超时

- discussion

  [Per request timeout options · Issue #562 · OpenFeign/feign](https://github.com/OpenFeign/feign/issues/562)

- 版本 >= 10.3.0

![WeChatWorkScreenshot_cb1954f6-abee-48ad-8dc5-14e9ef579bb9](/WeChatWorkScreenshot_cb1954f6-abee-48ad-8dc5-14e9ef579bb9.png)

- 源码中的单测：

```java
/**
 * @author pengfei.zhao
 */
@SuppressWarnings("deprecation")
public class OptionsTest {

  interface OptionsInterface {
    @RequestLine("GET /")
    // 参数中多了一个超时的配置
    String get(Request.Options options);

    @RequestLine("GET /")
    String get();
  }

  @Rule
  public final ExpectedException thrown = ExpectedException.none();

  /**
  * 测试总的配置会导致超时
  */
  @Test
  public void socketTimeoutTest() {
    final MockWebServer server = new MockWebServer();
    server.enqueue(new MockResponse().setBody("foo").setBodyDelay(3, TimeUnit.SECONDS));

    final OptionsInterface api = Feign.builder()
        .options(new Request.Options(1000, 1000))
        .target(OptionsInterface.class, server.url("/").toString());

    thrown.expect(FeignException.class);
    thrown.expectCause(CoreMatchers.isA(SocketTimeoutException.class));

    api.get();
  }

 /**
  * 接口级别的配置可以覆盖总的配置，从而在等待3s之后拿到结果
  */
  @Test
  public void normalResponseTest() {
    final MockWebServer server = new MockWebServer();
    server.enqueue(new MockResponse().setBody("foo").setBodyDelay(3, TimeUnit.SECONDS));

    final OptionsInterface api = Feign.builder()
        .options(new Request.Options(1000, 1000))
        .target(OptionsInterface.class, server.url("/").toString());

    assertThat(api.get(new Request.Options(1000, 4 * 1000))).isEqualTo("foo");
  }
}
```



### 部分源码

版本：`10.10.1`

```java
// feign.SynchronousMethodHandler#invoke
  @Override
  public Object invoke(Object[] argv) throws Throwable {
    RequestTemplate template = buildTemplateFromArgs.create(argv);
    // 从参数中找对应的option
    Options options = findOptions(argv);
    Retryer retryer = this.retryer.clone();
    while (true) {
      try {
        return executeAndDecode(template, options);
      } catch (RetryableException e) {
        try {
          retryer.continueOrPropagate(e);
        } catch (RetryableException th) {
          Throwable cause = th.getCause();
          if (propagationPolicy == UNWRAP && cause != null) {
            throw cause;
          } else {
            throw th;
          }
        }
        if (logLevel != Logger.Level.NONE) {
          logger.logRetry(metadata.configKey(), logLevel);
        }
        continue;
      }
    }
  }
```

`findOptions`的代码

```java
  Options findOptions(Object[] argv) {
    if (argv == null || argv.length == 0) {
      return this.options;
    }
    return Stream.of(argv)
        .filter(Options.class::isInstance)
        .map(Options.class::cast)
        .findFirst()
      	// fall back to总的超时
        .orElse(this.options);
  }
```



### 其他

如果使用`feign-ribbon`，版本要和`feign-core`保持一致，不然会报错：

```bash
java.lang.IllegalArgumentException: url values must be not be absolute.

	at feign.RequestTemplate.uri(RequestTemplate.java:438)
	at feign.RequestTemplate.uri(RequestTemplate.java:425)
	at feign.RequestTemplate.append(RequestTemplate.java:392)
	at feign.ribbon.LBClient$RibbonRequest.toRequest(LBClient.java:100)
	at feign.ribbon.LBClient.getRequestSpecificRetryHandler(LBClient.java:79)
	at feign.ribbon.LBClient.getRequestSpecificRetryHandler(LBClient.java:38)
	at com.netflix.client.AbstractLoadBalancerAwareClient.buildLoadBalancerCommand(AbstractLoadBalancerAwareClient.java:127)
	at com.netflix.client.AbstractLoadBalancerAwareClient.executeWithLoadBalancer(AbstractLoadBalancerAwareClient.java:94)
	at feign.ribbon.RibbonClient.execute(RibbonClient.java:69)
	at feign.SynchronousMethodHandler.executeAndDecode(SynchronousMethodHandler.java:119)
	at feign.SynchronousMethodHandler.invoke(SynchronousMethodHandler.java:89)
	at feign.ReflectiveFeign$FeignInvocationHandler.invoke(ReflectiveFeign.java:100)
	at com.sun.proxy.$Proxy36.getEffectiveMebIds(Unknown Source)
```

![image-20200428135018581](/image-20200428135018581.png)

`vip`没有解析出来，版本改了之后就没有问题了:

```xml
 <feign-core.version>10.10.1</feign-core.version>
<dependency>
   <groupId>io.github.openfeign</groupId>
   <artifactId>feign-core</artifactId>
   <version>${feign-core.version}</version>
</dependency>

<dependency>
  <groupId>io.github.openfeign</groupId>
  <artifactId>feign-ribbon</artifactId>
  <version>${feign-core.version}</version>
</dependency>
```

代码里连接超时设置为100mills，

```java
 final List<Integer> effectiveMebIds =
            personalMemberRemote.getEffectiveMebIds(new Request.Options(100, 500), Lists.newArrayList(1, 17, 15, 1386232841));
```

结果：

```bash
13:55:21.376 [PollingServerListUpdater-0] DEBUG c.n.l.DynamicServerListLoadBalancer-179  - Setting server list for zones: {defaultzone=[192.168.16.211:10020]}
13:55:21.376 [PollingServerListUpdater-0] DEBUG c.n.loadbalancer.BaseLoadBalancer-472  - LoadBalancer [user-center_defaultzone]: clearing server list (SET op)
13:55:21.376 [PollingServerListUpdater-0] DEBUG c.n.loadbalancer.BaseLoadBalancer-488  - LoadBalancer [user-center_defaultzone]:  addServer [192.168.16.211:10020]
13:55:21.600 [main] DEBUG c.n.l.ZoneAwareLoadBalancer-112  - Zone aware logic disabled or there is only one zone
13:55:21.633 [main] DEBUG c.n.loadbalancer.LoadBalancerContext-492  - user-center using LB returned Server: 192.168.16.211:10020 for request http:///personalMember/getEffectiveMebIds
13:55:21.741 [main] DEBUG c.n.l.reactive.LoadBalancerCommand-314  - Got error java.net.SocketTimeoutException: connect timed out when executed on server 192.168.16.211:10020
13:55:22.253 [main] DEBUG c.n.l.ZoneAwareLoadBalancer-112  - Zone aware logic disabled or there is only one zone
13:55:22.254 [main] DEBUG c.n.loadbalancer.LoadBalancerContext-492  - user-center using LB returned Server: 192.168.16.211:10020 for request http:///personalMember/getEffectiveMebIds
13:55:22.358 [main] DEBUG c.n.l.reactive.LoadBalancerCommand-314  - Got error java.net.SocketTimeoutException: connect timed out when executed on server 192.168.16.211:10020

feign.RetryableException: connect timed out executing POST http://user-center/personalMember/getEffectiveMebIds

	at feign.FeignException.errorExecuting(FeignException.java:249)
	at feign.SynchronousMethodHandler.executeAndDecode(SynchronousMethodHandler.java:129)
	at feign.SynchronousMethodHandler.invoke(SynchronousMethodHandler.java:89)
	at feign.ReflectiveFeign$FeignInvocationHandler.invoke(ReflectiveFeign.java:100)
	at com.sun.proxy.$Proxy36.getEffectiveMebIds(Unknown Source)

```

直接超时了，说明这个限制生效了。