---
title: tomcat8.x parseHost bug导致的性能损耗
tags: jit
category: tomcat
toc: true
typora-root-url: tomcat8.x parseHost bug导致的性能损耗
typora-copy-images-to: tomcat8.x parseHost bug导致的性能损耗
date: 2023-03-19 21:39:47
---



## 现象

- 通过jfr抓取的deoptimization event发现有很多parseHost相关的jit退化

![image-20230319205702153](/image-20230319205702153.png)

- jit deoptimization的日志也有这个

  ```xml
  <uncommon_trap thread='6154' reason='range_check' action='make_not_entrant' debug_id='0' compile_id='67267' compiler='c2' level='4' stamp='390.396'>
  		<jvms bci='4' method='org.apache.tomcat.util.http.parser.HttpParser isNumeric (I)Z' bytes='9' count='23695' iicount='23695'/>
  </uncommon_trap>
  <make_not_entrant thread='6154' compile_id='67267' compiler='c2' level='4' stamp='390.396'/>
  67267   !   4       org.apache.tomcat.util.http.parser.HttpParser::isNumeric (9 bytes)   made not entrant
  <writer thread='5831'/>
  
  <uncommon_trap thread='5848' reason='range_check' action='none' debug_id='0' compile_id='117864' compiler='c2' level='4' count='16' state='range_check recompiled' stamp='605.407'>
  	<jvms bci='4' method='org.apache.tomcat.util.http.parser.HttpParser isAlpha (I)Z' bytes='9' count='8591' iicount='8591' range_check_traps='16'/>
  	<jvms bci='1' method='org.apache.tomcat.util.http.parser.HttpParser$DomainParseState next (I)Lorg/apache/tomcat/util/http/parser/HttpParser$DomainParseState;' bytes='249' count='5394' iicount='5394'/>
  </uncommon_trap>
  ```

- 线上火焰图，parseHost有较高的占比——1.29（572 samples）

  ![image-20230319210312141](/image-20230319210312141.png)

- 压测时没有发现类似的问题



## 排查

### 有哪些类型的host

使用arthas查看线上host的值，发现主要有两种

- xx.xx.com
- 10.10.10.10:2279

第一种是域名形式的，由nginx调用过来。第二种是ip+port的形式，主要是健康检查保活。

第一种形式，在tomcat8.x版本下，会抛出ArrayIndexOutOfBoundException，异常的初始化比较耗费cpu。

第二种形式，则会正常解析结束。

### 找到有问题的char

出问题的代码如下，就是一个静态的数组，范围是0 ~ 127，存储其是否是字母、数字。

异常的case，是c超过了下标的范围，从而导致 ArrayIndexOutOfBoundsException 异常。

```java
public static boolean isAlpha(int c) {
  // Fast for valid alpha characters, slower for some incorrect
  // ones
  try {
    return IS_ALPHA[c];
  } catch (ArrayIndexOutOfBoundsException ex) {
    return false;
  }
}


public static boolean isNumeric(int c) {
  // Fast for valid numeric characters, slower for some incorrect
  // ones
  try {
    return IS_NUMERIC[c];
  } catch (ArrayIndexOutOfBoundsException ex) {
    return false;
  }
}
```

异常路径，有异常栈的填充，理论上应该比较慢。可以用monitor看到avg耗时，然后用watch找出耗时长的请求：

```bash
[arthas@28]$ watch org.apache.tomcat.util.http.parser.HttpParser isAlpha 'params[0]'  '#cost>0.05' -n 5
method=org.apache.tomcat.util.http.parser.HttpParser.isAlpha location=AtExit
ts=2023-01-09 14:33:38; [cost=0.055174ms] result=@Integer[97]
method=org.apache.tomcat.util.http.parser.HttpParser.isAlpha location=AtExit
ts=2023-01-09 14:33:38; [cost=0.087424ms] result=@Integer[98]
method=org.apache.tomcat.util.http.parser.HttpParser.isAlpha location=AtExit
ts=2023-01-09 14:33:38; [cost=0.117283ms] result=@Integer[-1]
method=org.apache.tomcat.util.http.parser.HttpParser.isAlpha location=AtExit
ts=2023-01-09 14:33:38; [cost=0.105648ms] result=@Integer[-1]
method=org.apache.tomcat.util.http.parser.HttpParser.isAlpha location=AtExit
ts=2023-01-09 14:33:39; [cost=0.060458ms] result=@Integer[-1]
Command execution times exceed limit: 5, so command will exit. You can set it with -n option
```

可以看到，有异常的值-1，-1会导致ArrayIndexOutOfBoundsException 异常。

### 有问题的char来源

接着跟进下-1的来源：

```bash
[arthas@28]$ stack  org.apache.tomcat.util.http.parser.HttpParser isNumeric  'params[0] < 0' -n 5
ts=2023-01-09 13:19:10;thread_name=http-nio-22794-exec-77;id=1a93;is_daemon=true;priority=5;TCCL=java.net.URLClassLoader@7eda2dbb
    @org.apache.tomcat.util.http.parser.HttpParser.isNumeric()
        at org.apache.tomcat.util.http.parser.HttpParser$DomainParseState.next(HttpParser.java:915)
        at org.apache.tomcat.util.http.parser.HttpParser.readHostDomainName(HttpParser.java:842)
        at org.apache.tomcat.util.http.parser.Host.parse(Host.java:95)
        at org.apache.tomcat.util.http.parser.Host.parse(Host.java:95)
        at org.apache.coyote.AbstractProcessor.parseHost(AbstractProcessor.java:292)
        at org.apache.coyote.http11.Http11Processor.prepareRequest(Http11Processor.java:1203)
        at org.apache.coyote.http11.Http11Processor.service(Http11Processor.java:776)
        at org.apache.coyote.AbstractProcessorLight.process(AbstractProcessorLight.java:66)
        at org.apache.coyote.AbstractProtocol$ConnectionHandler.process(AbstractProtocol.java:806)
        at org.apache.tomcat.util.net.NioEndpoint$SocketProcessor.doRun(NioEndpoint.java:1498)
        at org.apache.tomcat.util.net.SocketProcessorBase.run(SocketProcessorBase.java:49)
        at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1136)
        at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:635)
        at org.apache.tomcat.util.threads.TaskThread$WrappingRunnable.run(TaskThread.java:61)
        at java.lang.Thread.run(Thread.java:833)
```

出问题的地方是从readHostDomainName过来的，看下对应实现：

readHostDomainName返回值是ip:port的分隔符，":"的index位置。

解析逻辑，就是从host对应的reader中，不断地读取字符，传递给状态机。然后状态机根据传入的字符，进行不同状态的流转。

- 如果传入的是域名，则会一直读取到流结束，流结束之后，**read返回的是-1**，从而走到异常的逻辑。

- 如果传入的是ip:port，则会在流**结束之前**，正常的走到解析流程，不会走到异常的逻辑。

```java
            static int readHostDomainName(Reader reader) throws IOException {
/*838*/         DomainParseState state = DomainParseState.NEW;
/*839*/         int pos = 0;
              	// 状态机的逻辑，不断从reader中读出char，喂给状态机
                while (state.mayContinue()) {
                   // 如果流结束了，返回-1怎么办？
/*842*/             state = state.next(reader.read());
/*843*/             ++pos;
                }
              	// 找到ip port的分割符（即":"）
/*846*/         if (DomainParseState.COLON == state) {
/*848*/             return pos - 1;
                }
              	// 没有找到，直接返回-1
/*850*/         return -1;
            }
```

看下状态机的状态：

```java
// 状态机实现
private static enum DomainParseState {
  NEW(true, false, false, false, " at the start of"),
  ALPHA(true, true, true, true, " after a letter in"),
  NUMERIC(true, true, true, true, " after a number in"),
  PERIOD(true, false, false, true, " after a period in"),
  HYPHEN(true, true, false, false, " after a hypen in"),
  // 第一种退出场景，读取到ip:port的分割符——COLON(即":")就正常退出了
  COLON(false, false, false, false, " after a colon in"),
  // 第二种退出场景，流结束，一直没有找到colon（比如域名的这种情况）
  END(false, false, false, false, " at the end of");

  private final boolean mayContinue;
  private final boolean allowsHyphen;
  private final boolean allowsPeriod;
  private final boolean allowsEnd;
  private final String errorLocation;

  private DomainParseState(boolean mayContinue, boolean allowsHyphen, boolean allowsPeriod, boolean allowsEnd, String errorLocation) {
    this.mayContinue = mayContinue;
    this.allowsHyphen = allowsHyphen;
    this.allowsPeriod = allowsPeriod;
    this.allowsEnd = allowsEnd;
    this.errorLocation = errorLocation;
  }
  // 异常发生在这里，这个c是从前面的reader中读出来的，
  // 如果流结束，返回的是-1，-1直接进入到isAlpha或者isNumeric，则直接返回false，内部会抛出ArrayIndexOutOfBound异常
  public DomainParseState next(int c) {
    if (HttpParser.isAlpha(c)) {
      return ALPHA;
    }
    if (HttpParser.isNumeric(c)) {
      return NUMERIC;
    }
    if (c == 46) {
      if (this.allowsPeriod) {
        return PERIOD;
      }
      throw new IllegalArgumentException(sm.getString("http.invalidCharacterDomain", new Object[]{Character.toString((char)c), this.errorLocation}));
    }
    if (c == 58) {
      if (this.allowsEnd) {
        return COLON;
      }
      throw new IllegalArgumentException(sm.getString("http.invalidCharacterDomain", new Object[]{Character.toString((char)c), this.errorLocation}));
    }
    // 注意这里，流结束的标致
    if (c == -1) {
      // 从ALPHA或者NUMERIC状态，是allowsEnd的（参见上面的状态声明），直接返回END
      if (this.allowsEnd) {
        return END;
      }
      throw new IllegalArgumentException(sm.getString("http.invalidSegmentEndState", new Object[]{this.name()}));
    }
    if (c == 45) {
      if (this.allowsHyphen) {
        return HYPHEN;
      }
      throw new IllegalArgumentException(sm.getString("http.invalidCharacterDomain", new Object[]{Character.toString((char)c), this.errorLocation}));
    }
    throw new IllegalArgumentException(sm.getString("http.illegalCharacterDomain", new Object[]{Character.toString((char)c)}));
  }

  public boolean mayContinue() {
    return this.mayContinue;
  }
}
```

## 解决方案

tomcat已经在**8.5.41**版本修复，对应的release note：

https://tomcat.apache.org/tomcat-8.5-doc/changelog.html

![image-20230319212655421](/image-20230319212655421.png)

对应的代码diff，可以看到**优先处理流结束的情况**，就会避免isAlpha抛异常：

![tomcat_parseHost_fix](/tomcat_parseHost_fix.png)

## 结论

- http/1.1之后，要求header中必须存在Host字段。

- nginx在转发时，会将Host字段设置为对应的**域名**。同时探活时是单节点探活，对应的Host是**ip:port**

- 低版本的tomcat（< 8.5.41），在解析域名这种host的时候，存在bug。bug会导致isAlpha和isNumeric方法内部抛出ArrayIndexOutofRange异常。异常的影响主要有两点：

- - 填充异常栈的cpu开销
  - jit deopt的开销（native栈转interpret栈）

- 性能损失跟客户端的请求量相关，请求量越大，越明显
