title: 使用greys来排查线上问题
tags: greys
category: perf
toc: true
date: 2017-11-12 18:10:12
---


## greys

greys的理念是将btrace常用的功能命令化，这样可以大大的节省排查问题的时间。

### greys 安装

推荐使用网络安装:

```
curl -sLk http://ompc.oss.aliyuncs.com/greys/install.sh|bash
```

安装后家目录下有如下的文件：

```
/home/qishengli/.greys
└── lib
    └── 1.7.6.4
        ├── greys
        │   ├── ga.sh
        │   ├── greys-agent.jar
        │   ├── greys-core.jar
        │   ├── greys.sh
        │   ├── gs.sh
        │   └── install-local.sh
        └── greys-1.7.6.4-bin.zip
```


>其中greys-core.jar为greys的程序主体，启动类、加载类都在这个jar包当中；
>greys-agent.jar则为目标JVM的加载引导程序；
>greys.sh为一个可执行脚本，为Greys的启动脚本。

### greys常用功能

启动脚本，

```bash
sudo -u tomcat -H ./greys.sh  3292
```

为了安全考虑，一般会限制tomcat启动用户的权限，这里`-u`指定了`tomcat`启动的用户， `3292`是tomcat的进程id。
交互式shell，输入help即可看到所有支持的命令。

```
ga?>help
+----------+----------------------------------------------------------------------------------+
|       sc | Search all the classes loaded by JVM                                             |
+----------+----------------------------------------------------------------------------------+
|       sm | Search the method of classes loaded by JVM                                       |
+----------+----------------------------------------------------------------------------------+
|  monitor | Monitor the execution of specified Class and its method                          |
+----------+----------------------------------------------------------------------------------+
|    watch | Display the details of specified class and method                                |
+----------+----------------------------------------------------------------------------------+
|       tt | Time Tunnel                                                                      |
+----------+----------------------------------------------------------------------------------+
|    trace | Display the detailed thread stack of specified class and method                  |
+----------+----------------------------------------------------------------------------------+
|       js | Enhanced JavaScript                                                              |
+----------+----------------------------------------------------------------------------------+
|   ptrace | Display the detailed thread path stack of specified class and method             |
+----------+----------------------------------------------------------------------------------+
|    stack | Display the stack trace of specified class and method                            |
+----------+----------------------------------------------------------------------------------+
|     quit | Quit Greys console                                                               |
+----------+----------------------------------------------------------------------------------+
|  session | Display current session information                                              |
+----------+----------------------------------------------------------------------------------+
|  version | Display Greys version                                                            |
+----------+----------------------------------------------------------------------------------+
|      jvm | Display the target JVM information                                               |
+----------+----------------------------------------------------------------------------------+
|    reset | Reset all the enhanced classes                                                   |
+----------+----------------------------------------------------------------------------------+
|      asm | Display class bytecode by asm format                                             |
+----------+----------------------------------------------------------------------------------+
| shutdown | Shut down Greys server and exit the console                                      |
+----------+----------------------------------------------------------------------------------+
|     help | Display Greys Help                                                               |
+----------+----------------------------------------------------------------------------------+
|      top | Display The Threads Of Top CPU TIME                                              |
+----------+----------------------------------------------------------------------------------+
```

help后面可以跟具体的命令， 会显示命令的具体用法。

```
ga?>help tt
+---------+----------------------------------------------------------------------------------+
|   USAGE | -[tlDi:x:w:s:pdEn:] class-pattern method-pattern condition-express               |
|         | Time Tunnel                                                                      |
+---------+----------------------------------------------------------------------------------+
| OPTIONS |              [t] | Record the method invocation within time fragments            |
|         | -----------------+-------------------------------------------------------------- |
|         |              [l] | List all the time fragments                                   |
|         | -----------------+-------------------------------------------------------------- |
|         |              [D] | Delete all the time fragments                                 |
|         | -----------------+-------------------------------------------------------------- |
|         |             [i:] | Display the detailed information from specified time fragmen  |
|         |                  | t                                                             |
|         | -----------------+-------------------------------------------------------------- |
|         |             [x:] | Expand level of object (0 by default)                         |
|         | -----------------+-------------------------------------------------------------- |
|         |             [w:] | watch-express, watch the time fragment by OGNL express, like  |
|         |                  |  params[0], returnObj, throwExp and so on.                    |
|         |                  |                                                               |
|         |                  | FOR EXAMPLE                                                   |
|         |                  |     params[0]                                                 |
|         |                  |     params[0]+params[1]                                       |
|         |                  |     returnObj                                                 |
|         |                  |     throwExp                                                  |
|         |                  |     target                                                    |
|         |                  |     clazz                                                     |
|         |                  |     method                                                    |
|         |                  |                                                               |
|         |                  | THE STRUCTURE                                                 |
|         |                  |           target : the object                                 |
|         |                  |            clazz : the object's class                         |
|         |                  |           method : the constructor or method                  |
|         |                  |     params[0..n] : the parameters of method                   |
|         |                  |        returnObj : the returned object of method              |
|         |                  |         throwExp : the throw exception of method              |
|         |                  |         isReturn : the method ended by return                 |
|         |                  |          isThrow : the method ended by throwing exception     |
|         | -----------------+-------------------------------------------------------------- |
|         |             [s:] | Search-expression, to search the time fragments by OGNL expr  |
|         |                  | ess                                                           |
|         |                  |                                                               |
|         |                  | FOR EXAMPLE                                                   |
|         |                  |      TRUE : 1==1                                              |
|         |                  |      TRUE : true                                              |
|         |                  |     FALSE : false                                             |
|         |                  |      TRUE : params.length>=0                                  |
|         |                  |     FALSE : 1==2                                              |
|         |                  |                                                               |
|         |                  | THE STRUCTURE                                                 |
|         |                  |           target : the object                                 |
|         |                  |            clazz : the object's class                         |
|         |                  |           method : the constructor or method                  |
|         |                  |     params[0..n] : the parameters of method                   |
|         |                  |        returnObj : the returned object of method              |
|         |                  |         throwExp : the throw exception of method              |
|         |                  |         isReturn : the method ended by return                 |
|         |                  |          isThrow : the method ended by throwing exception     |
|         |                  |           #index : the index of time-fragment record          |
|         |                  |       #processId : the process ID of time-fragment record     |
|         |                  |            #cost : the cost time of time-fragment record      |
|         | -----------------+-------------------------------------------------------------- |
|         |              [p] | Replay the time fragment specified by index                   |
|         | -----------------+-------------------------------------------------------------- |
|         |              [d] | Delete time fragment specified by index                       |
|         | -----------------+-------------------------------------------------------------- |
|         |              [E] | Enable regular expression to match (wildcard matching by def  |
|         |                  | ault)                                                         |
|         | -----------------+-------------------------------------------------------------- |
|         |             [n:] | Threshold of execution times                                  |
|         | -----------------+-------------------------------------------------------------- |
|         |    class-pattern | Path and classname of Pattern Matching                        |
|         | -----------------+-------------------------------------------------------------- |
|         |   method-pattern | Method of Pattern Matching                                    |
|         | -----------------+-------------------------------------------------------------- |
|         |  condition-expre | Conditional expression by OGNL                                |
|         |               ss |                                                               |
|         |                  | FOR EXAMPLE                                                   |
|         |                  |      TRUE : 1==1                                              |
|         |                  |      TRUE : true                                              |
|         |                  |     FALSE : false                                             |
|         |                  |      TRUE : params.length>=0                                  |
|         |                  |     FALSE : 1==2                                              |
|         |                  |                                                               |
|         |                  | THE STRUCTURE                                                 |
|         |                  |           target : the object                                 |
|         |                  |            clazz : the object's class                         |
|         |                  |           method : the constructor or method                  |
|         |                  |     params[0..n] : the parameters of method                   |
|         |                  |        returnObj : the returned object of method              |
|         |                  |         throwExp : the throw exception of method              |
|         |                  |         isReturn : the method ended by return                 |
|         |                  |          isThrow : the method ended by throwing exception     |
|         |                  |            #cost : the cost(ms) of method                     |
+---------+----------------------------------------------------------------------------------+
| EXAMPLE | tt -t *StringUtils isTop                                                         |
|         | tt -t *StringUtils isTop params[0].length==1                                     |
|         | tt -l                                                                            |
|         | tt -D                                                                            |
|         | tt -i 1000 -w params[0]                                                          |
|         | tt -i 1000 -d                                                                    |
|         | tt -i 1000                                                                       |
+---------+----------------------------------------------------------------------------------+
```

#### top

greys的shell里集成的top功能，可以显示jstack中每个线程的cpu占比。

没有greys的时候的做法可能是，先查看native的线程的cpu占用

```
top -p 3292 -H
```

`-H`是显示到线程级别

```
Tasks: 699 total,   0 running, 699 sleeping,   0 stopped,   0 zombie
Cpu(s):  8.0%us,  1.6%sy,  0.0%ni, 90.2%id,  0.0%wa,  0.0%hi,  0.2%si,  0.1%st
Mem:   8059648k total,  7801008k used,   258640k free,    33328k buffers
Swap:  4194296k total,        0k used,  4194296k free,  2453588k cached

  PID USER      PR  NI  VIRT  RES  SHR S %CPU %MEM    TIME+  COMMAND                                                                            
 5620 tomcat    20   0 9446m 4.2g 6696 S  6.6 54.2  33:46.86 java                                                                               
 5764 tomcat    20   0 9446m 4.2g 6696 S  5.0 54.2   1:05.94 java                                                                               
 5787 tomcat    20   0 9446m 4.2g 6696 S  4.0 54.2  57:48.76 java                                                                               
 5790 tomcat    20   0 9446m 4.2g 6696 S  2.3 54.2  40:31.71 java                                                                               
 3523 tomcat    20   0 9446m 4.2g 6696 S  1.3 54.2  68:48.18 java                                                                               
 3982 tomcat    20   0 9446m 4.2g 6696 S  1.3 54.2  21:15.22 java                                                                               
 3385 tomcat    20   0 9446m 4.2g 6696 S  1.0 54.2  54:10.76 java                                                                               
 3413 tomcat    20   0 9446m 4.2g 6696 S  1.0 54.2  29:12.64 java                                                     
```

由于jstack的输出是16进制的线程号，我们需要根据`PID`进行转换

```
printf "%x\n" 5620
15f4
```

然后`jstack`去查找相应的java线程栈

```
"http-8080-38" daemon prio=10 tid=0x00007fbcf006e000 nid=0x15f4 in Object.wait() [0x00007fbcd28a1000]
   java.lang.Thread.State: WAITING (on object monitor)
        at java.lang.Object.wait(Native Method)
        - waiting on <0x000000077b69e488> (a org.apache.tomcat.util.net.JIoEndpoint$Worker)
        at java.lang.Object.wait(Object.java:503)
        at org.apache.tomcat.util.net.JIoEndpoint$Worker.await(JIoEndpoint.java:458)
        - locked <0x000000077b69e488> (a org.apache.tomcat.util.net.JIoEndpoint$Worker)
        at org.apache.tomcat.util.net.JIoEndpoint$Worker.run(JIoEndpoint.java:484)
        at java.lang.Thread.run(Thread.java:744)

```

费了一番功夫，黄花菜都凉了。

也有将上面的步骤写成一个脚本的，快了许多。（驼厂内部散落着各种不同版本的slow_stack.sh）

```
The stack of busy(13.6%) thread(3613/0xe1d) of java pid(3292) all times():
"http-8080-13" daemon prio=10 tid=0x00007fbcf001b000 nid=0xe1d in Object.wait() [0x00007fbce7f7e000]
   java.lang.Thread.State: WAITING (on object monitor)
        at java.lang.Object.wait(Native Method)
        - waiting on <0x0000000771e29738> (a org.apache.tomcat.util.net.JIoEndpoint$Worker)
        at java.lang.Object.wait(Object.java:503)
        at org.apache.tomcat.util.net.JIoEndpoint$Worker.await(JIoEndpoint.java:458)
        - locked <0x0000000771e29738> (a org.apache.tomcat.util.net.JIoEndpoint$Worker)
        at org.apache.tomcat.util.net.JIoEndpoint$Worker.run(JIoEndpoint.java:484)
        at java.lang.Thread.run(Thread.java:744)
```

开源的版本也有， [awesome-scripts/java.md at master · superhj1987/awesome-scripts](https://github.com/superhj1987/awesome-scripts/blob/master/docs/java.md#beer-show-busy-java-threads)


greys中就可以直接使用top命令来查看，

```
ga?>top -t 3 -d
+-------+--------+---------------+----------------------+---------------------------------------------------------------------------------------+
| ID    |  CPU%  | USR%          | STATE                | THREAD_NAME                                                                           |
+-------+--------+---------------+----------------------+---------------------------------------------------------------------------------------+
| #131  | 04.14% | TIMED_WAITING | CachedClock Updater  | at : sun.misc.Unsafe.park(Native Method)                                              |
|       |        |               | Thread               | at : java.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:349)           |
|       |        |               |                      | at : qunar.tc.common.clock.CachedClock$1.run(CachedClock.java:22)                     |
|       |        |               |                      | at : java.lang.Thread.run(Thread.java:744)                                            |
+-------+--------+---------------+----------------------+---------------------------------------------------------------------------------------+
| #1282 | 03.51% | WAITING       | http-8080-176        | at : java.lang.Object.wait(Native Method)                                             |
|       |        |               |                      | at : java.lang.Object.wait(Object.java:503)                                           |
|       |        |               |                      | at : org.apache.tomcat.util.net.JIoEndpoint$Worker.await(JIoEndpoint.java:458)        |
|       |        |               |                      | at : org.apache.tomcat.util.net.JIoEndpoint$Worker.run(JIoEndpoint.java:484)          |
|       |        |               |                      | at : java.lang.Thread.run(Thread.java:744)                                            |
+-------+--------+---------------+----------------------+---------------------------------------------------------------------------------------+
| #38   | 03.26% | TIMED_WAITING | thread-monitor-task  | at : sun.misc.Unsafe.park(Native Method)                                              |
|       |        |               |                      | at : java.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:226)           |
|       |        |               |                      | at : java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.awaitNanos |
|       |        |               |                      |      (AbstractQueuedSynchronizer.java:2082)                                           |
|       |        |               |                      | at : java.util.concurrent.ScheduledThreadPoolExecutor$DelayedWorkQueue.take(Scheduled |
|       |        |               |                      |      ThreadPoolExecutor.java:1090)                                                    |
|       |        |               |                      | at : java.util.concurrent.ScheduledThreadPoolExecutor$DelayedWorkQueue.take(Scheduled |
|       |        |               |                      |      ThreadPoolExecutor.java:807)                                                     |
|       |        |               |                      | at : java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1068)    |
|       |        |               |                      | at : java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1130)  |
|       |        |               |                      | at : java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:615)  |
|       |        |               |                      | at : java.lang.Thread.run(Thread.java:744)                                            |
+-------+--------+---------------+----------------------+---------------------------------------------------------------------------------------+
```

上面显示的就是top3占用cpu的线程

#### monitor —— 监控方法的执行时间

```
ga?>monitor -c2 com.domain.Bean   someMethod   
Press Ctrl+D to abort.
Affect(class-cnt:1 , method-cnt:1) cost in 103 ms.
+---------------------+--------------------+----------------------------+-------+---------+------+-----------+------------+------------+------------+
| TIMESTAMP           | CLASS              | METHOD                     | TOTAL | SUCCESS | FAIL | FAIL-RATE | AVG-RT(ms) | MIN-RT(ms) | MAX-RT(ms) |
+---------------------+--------------------+----------------------------+-------+---------+------+-----------+------------+------------+------------+
| 2017-11-12 17:09:18 | com.domain.Bean    | someMethod                 | 4     | 4       | 0    | 00.00%    | 13.25      | 11         | 17         |
+---------------------+--------------------+----------------------------+-------+---------+------+-----------+------------+------------+------------+

```

#### watch —— 全方位监控

watch可以监控方法的返回值，入参，还可以根据条件筛选（是否抛出异常，响应时间等）

```
ga?>watch com.domain.Bean onMessage params[0]
Press Ctrl+D to abort.
Affect(class-cnt:1 , method-cnt:1) cost in 92 ms.
{"messageId":"171112.171542.192.168.50.191.31779.22733"}

```

#### tt（time tunel）和ptrace

先说ptrace， 这个和trace差不多， 只是可以加上`-t`将调用存储起来，可以配合`tt`使用
```
ga?>ptrace -t  -n 1 com.domain.Bean doSend
Press Ctrl+D to abort.
Affect(class-cnt:1 , method-cnt:22) cost in 163 ms.
`---+pTracing for : thread_name="http-8080-179" thread_id=0x505;is_daemon=true;priority=5;process=1002;
    `---[21,21ms]com.domain.Bean:doSend(); index=1001;
+----------+------------+----------------------+------------+----------+----------+-----------------+--------------------------------+--------------------------------+
|    INDEX | PROCESS-ID |            TIMESTAMP |   COST(ms) |   IS-RET |   IS-EXP |          OBJECT |                          CLASS |                         METHOD |
+----------+------------+----------------------+------------+----------+----------+-----------------+--------------------------------+--------------------------------+
|     1001 |       1002 |  2017-11-12 17:30:40 |         20 |     true |    false |      0x55e9f734 |                           Bean |                         doSend |
+----------+------------+----------------------+------------+----------+----------+-----------------+--------------------------------+--------------------------------+
```

`tt`:

>时间隧道命令是我在使用watch命令进行问题排查的时候衍生出来的想法。
>watch虽然很方便和灵活，但需要提前想清楚观察表达式的拼写，这对排查问题而言要求太高，因为很多时候我们并不清楚问题出自于何方，只能靠蛛丝马迹进行猜测.
>这个时候如果能记录下当时方法调用的所有入参和返回值、抛出的异常会对整个问题的思考与判断非常有帮助。
>于是乎，TimeTunnel命令就诞生了。

列出所有时间片段或显示一个时间片段的内容:

```
tt -l
tt -i 1001
```

内容：

```
ga?>tt -l
+----------+------------+----------------------+------------+----------+----------+-----------------+--------------------------------+--------------------------------+
|    INDEX | PROCESS-ID |            TIMESTAMP |   COST(ms) |   IS-RET |   IS-EXP |          OBJECT |                          CLASS |                         METHOD |
+----------+------------+----------------------+------------+----------+----------+-----------------+--------------------------------+--------------------------------+
|     1001 |       1002 |  2017-11-12 17:30:40 |         20 |     true |    false |      0x55e9f734 |                           Bean |                         doSend |
+----------+------------+----------------------+------------+----------+----------+-----------------+--------------------------------+--------------------------------+
|     1002 |       1003 |  2017-11-12 17:30:41 |         10 |     true |    false |      0x55e9f734 |                           Bean |                         doSend |
+----------+------------+----------------------+------------+----------+----------+-----------------+--------------------------------+--------------------------------+
ga?>tt -i 1001
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+
|           INDEX | 1001                                                                                                                                                   |
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+
|      PROCESS-ID | 1002                                                                                                                                                   |
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+
|      GMT-CREATE | 2017-11-12 17:30:40                                                                                                                                    |
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+
|        COST(ms) | 20                                                                                                                                                     |
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+
|          OBJECT | 0x55e9f734                                                                                                                                             |
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+
|           CLASS | com.domain.Bean                                                                                 |
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+
|          METHOD | doSend                                                                                                                                                 |
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+
|       IS-RETURN | true                                                                                                                                                   |
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+
|    IS-EXCEPTION | false                                                                                                                                                  |
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+
|   PARAMETERS[0] | 242996952                                                                                                                                              |
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+
|   PARAMETERS[1] | [CouponBase[id=1,amount=5]                                                                                |
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+
|   PARAMETERS[2] | VoucherSendTask[appName=catalysis,batchSeriesNum=catalysis-train_give_zhoubian-HOURROOM_NEWUSER-HOURROOM,transactionId=catalysis24299695225174650HOURR] |
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+
|      RETURN-OBJ | InventoryRecord[activityId=31,transactionId=catalysis24299695225174650HOURROOM242996952]                                                                |
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+
|           STACK | thread_name="http-8080-179" thread_id=0x505;is_daemon=true;priority=5;                                                                                 |
|                 |     @com.qunar.hotel.qta.open.promotion.service.impl.Bean.doSend(Bean.java:179)                                    |
|                 |         at com.qunar.hotel.qta.open.promotion.service.impl.Bean.sendVoucherThenGetCouponId(Bean.java:191)          |
|                 |         at com.qunar.hotel.qta.open.promotion.provider.controller.benefit.UserBenefitController.voucherSendThenGetCouponId(UserBenefitController.java: |
|                 | 841)                                                                                                                                                   |
|                 |         at sun.reflect.GeneratedMethodAccessor1923.invoke(null:-1)                                                                                     |
|                 |         at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)                                                       |
|                 |         at java.lang.reflect.Method.invoke(Method.java:606)                                                                                            |
|                 |         at org.springframework.web.method.support.InvocableHandlerMethod.invoke(InvocableHandlerMethod.java:214)                                       |
|                 |         at org.springframework.web.method.support.InvocableHandlerMethod.invokeForRequest(InvocableHandlerMethod.java:132)                             |
|                 |         at org.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod.invokeAndHandle(ServletInvocableHandlerMethod.java:104) |
|                 |         at org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.invokeHandleMethod(RequestMappingHandlerAdapter.java:748 |
|                 | )                                                                                                                                                      |
|                 |         at org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.handleInternal(RequestMappingHandlerAdapter.java:689)    |
|                 |         at org.springframework.web.servlet.mvc.method.AbstractHandlerMethodAdapter.handle(AbstractHandlerMethodAdapter.java:83)                        |
|                 |         at org.springframework.web.servlet.DispatcherServlet.doDispatch(DispatcherServlet.java:945)                                                    |
|                 |         at org.springframework.web.servlet.DispatcherServlet.doService(DispatcherServlet.java:876)                                                     |
|                 |         at org.springframework.web.servlet.FrameworkServlet.processRequest(FrameworkServlet.java:931)                                                  |
|                 |         at org.springframework.web.servlet.FrameworkServlet.doPost(FrameworkServlet.java:833)                                                          |
|                 |         at javax.servlet.http.HttpServlet.service(HttpServlet.java:637)                                                                                |
|                 |         at org.springframework.web.servlet.FrameworkServlet.service(FrameworkServlet.java:807)                                                         |
|                 |         at javax.servlet.http.HttpServlet.service(HttpServlet.java:717)                                                                                |
|                 |         at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:290)                                           |
|                 |         at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:206)                                                   |
|                 |         at com.alibaba.druid.support.http.WebStatFilter.doFilter(WebStatFilter.java:140)                                                               |
|                 |         at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:235)                                           |
|                 |         at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:206)                                                   |
|                 |         at com.qunar.hotel.qta.base.trace.HttpTraceFilter.doFilter(HttpTraceFilter.java:44)                                                            |
|                 |         at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:235)                                           |
|                 |         at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:206)                                                   |
|                 |         at qunar.ServletWatcher.doFilter(ServletWatcher.java:118)                                                                                      |
|                 |         at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:235)                                           |
|                 |         at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:206)                                                   |
|                 |         at org.springframework.web.filter.CharacterEncodingFilter.doFilterInternal(CharacterEncodingFilter.java:88)                                    |
|                 |         at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:108)                                                 |
|                 |         at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:235)                                           |
|                 |         at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:206)                                                   |
|                 |         at org.apache.catalina.core.StandardWrapperValve.invoke(StandardWrapperValve.java:233)                                                         |
|                 |         at org.apache.catalina.core.StandardContextValve.invoke(StandardContextValve.java:191)                                                         |
|                 |         at org.apache.catalina.core.StandardHostValve.invoke(StandardHostValve.java:127)                                                               |
|                 |         at org.apache.catalina.valves.ErrorReportValve.invoke(ErrorReportValve.java:102)                                                               |
|                 |         at org.apache.catalina.valves.AccessLogValve.invoke(AccessLogValve.java:555)                                                                   |
|                 |         at org.apache.catalina.core.StandardEngineValve.invoke(StandardEngineValve.java:109)                                                           |
|                 |         at org.apache.catalina.connector.CoyoteAdapter.service(CoyoteAdapter.java:298)                                                                 |
|                 |         at org.apache.coyote.http11.Http11Processor.process(Http11Processor.java:857)                                                                  |
|                 |         at org.apache.coyote.http11.Http11Protocol$Http11ConnectionHandler.process(Http11Protocol.java:588)                                            |
|                 |         at org.apache.tomcat.util.net.JIoEndpoint$Worker.run(JIoEndpoint.java:489)                                                                     |
|                 |         at java.lang.Thread.run(Thread.java:744)                                                                                                       |
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+

```

除了使用`ptrace`保存时间片段，也可以使用`tt`，

```
ga?>tt -t  -n 1 com.qunar.hotel.qta.open.promotion.service.impl.Bean doSend
Press Ctrl+D to abort.
Affect(class-cnt:1 , method-cnt:1) cost in 110 ms.
+----------+------------+----------------------+------------+----------+----------+-----------------+--------------------------------+--------------------------------+
|    INDEX | PROCESS-ID |            TIMESTAMP |   COST(ms) |   IS-RET |   IS-EXP |          OBJECT |                          CLASS |                         METHOD |
+----------+------------+----------------------+------------+----------+----------+-----------------+--------------------------------+--------------------------------+
|     1003 |       1004 |  2017-11-12 17:37:27 |         10 |     true |    false |      0x55e9f734 |         Bean |                         doSend |
+----------+------------+----------------------+------------+----------+----------+-----------------+--------------------------------+--------------------------------+
```

*同样的最好指定-n，避免高并发下造成太大影响*

解决方法重载

tt -t *Test print params[0].length==1

通过制定参数个数的形式解决不同的方法签名，如果参数个数一样，你还可以这样写

tt -t *Test print 'params[1].class == Integer.class'

解决指定参数

tt -t *Test print params[0].mobile=="13989838402"

具体的可以参见参考文档里的说明。

- `tt`的另外一个便利之处是可以对保存的时间片主动发起一次调用

和dubbo的泛化调用一样，`tt`的这个方法也可以大大降低沟通的成本。

```
ga?>ptrace -t  -n 1  *com.qunar.hotel.qta.open.promotion.flow.listener.BookingPromotionRollBackListener onMessage 
Press Ctrl+D to abort.
Affect(class-cnt:1 , method-cnt:2) cost in 126 ms.
`---+pTracing for : thread_name="anon-com.qunar.hotel.qta.open.promotion.flow.listener.BookingPromotionRollBackListener.<clinit>:33-thread-2" thread_id=0x205;is_daemon=true;priority=5;process=1005;
    `---[1,1ms]com.qunar.hotel.qta.open.promotion.flow.listener.BookingPromotionRollBackListener:onMessage(); index=1004;
+----------+------------+----------------------+------------+----------+----------+-----------------+--------------------------------+--------------------------------+
|    INDEX | PROCESS-ID |            TIMESTAMP |   COST(ms) |   IS-RET |   IS-EXP |          OBJECT |                          CLASS |                         METHOD |
+----------+------------+----------------------+------------+----------+----------+-----------------+--------------------------------+--------------------------------+
|     1004 |       1005 |  2017-11-12 17:43:15 |          2 |     true |    false |      0x14b7937c | BookingPromotionRollBackListen |                      onMessage |
|          |            |                      |            |          |          |                 |                             er |                                |
+----------+------------+----------------------+------------+----------+----------+-----------------+--------------------------------+--------------------------------+

ga?>tt -i 1004 -p
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+
|           INDEX | 1004                                                                                                                                                   |
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+
|      PROCESS-ID | 1005                                                                                                                                                   |
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+
|      GMT-CREATE | 2017-11-12 17:43:15                                                                                                                                    |
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+
|        COST(ms) | 1                                                                                                                                                      |
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+
|          OBJECT | 0x14b7937c                                                                                                                                             |
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+
|           CLASS | com.qunar.hotel.qta.open.promotion.flow.listener.BookingPromotionRollBackListener                                                                      |
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+
|          METHOD | onMessage                                                                                                                                              |
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+
|       IS-RETURN | true                                                                                                                                                   |
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+
|    IS-EXCEPTION | false                                                                                                                                                  |
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+
|   PARAMETERS[0] | {"messageId":"171112.174315.192.168.50.191.31779.22906"}                                                                                               |
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+
|      RETURN-OBJ |                                                                                                                                                        |
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+
|           STACK | thread_name="anon-com.qunar.hotel.qta.open.promotion.flow.listener.BookingPromotionRollBackListener.<clinit>:33-thread-2" thread_id=0x205;is_daemon=tr |
|                 | ue;priority=5;                                                                                                                                         |
|                 |     @com.qunar.hotel.qta.open.promotion.flow.listener.BookingPromotionRollBackListener.onMessage(BookingPromotionRollBackListener.java:45)             |
|                 |         at qunar.tc.qmq.consumer.handler.ConsumerMessage.process(ConsumerMessage.java:105)                                                             |
|                 |         at qunar.tc.qmq.consumer.handler.MessageHandler$1.run(MessageHandler.java:57)                                                                  |
|                 |         at java.util.concurrent.Executors$RunnableAdapter.call(Executors.java:471)                                                                     |
|                 |         at java.util.concurrent.FutureTask.run(FutureTask.java:262)                                                                                    |
|                 |         at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1145)                                                             |
|                 |         at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:615)                                                             |
|                 |         at java.lang.Thread.run(Thread.java:744)                                                                                                       |
+-----------------+--------------------------------------------------------------------------------------------------------------------------------------------------------+
Time fragment[1004] successfully replayed.
```

#### trace

显示指定方法调用的栈，带时间消耗。简单的可以看下调用链上的耗时，进一步的话就需要更加专业的`JProfiler`等工具了

```
ga?>trace -n 1 com.qunar.hotel.qta.open.promotion.service.impl.Bean doSend
Press Ctrl+D to abort.
Affect(class-cnt:1 , method-cnt:1) cost in 102 ms.
`---+Tracing for : thread_name="http-8080-181" thread_id=0x507;is_daemon=true;priority=5;
    `---+[13,13ms]com.qunar.hotel.qta.open.promotion.service.impl.Bean:doSend()
        +---[0,0ms]com.qunar.hotel.qta.coupon.api.bean.CouponUser:<init>(@175)
        +---[0,0ms]com.qunar.hotel.qta.open.promotion.bean.voucher.VoucherSendTask:getVoucherTypeId(@176)
        +---[0,0ms]java.lang.StringBuilder:<init>(@176)
        +---[0,0ms]com.qunar.hotel.qta.open.promotion.bean.voucher.VoucherSendTask:getTransactionId(@176)
        +---[0,0ms]java.lang.StringBuilder:append(@176)
        +---[0,0ms]java.lang.StringBuilder:append(@176)
        +---[0,0ms]java.lang.StringBuilder:toString(@176)
        +---[12,12ms]com.qunar.hotel.qta.coupon.api.remote.ActivityWriteRemote:consume(@176)
        +---[12,0ms]com.qunar.hotel.qta.open.promotion.bean.voucher.VoucherSendTask:getAppName(@177)
        +---[12,0ms]com.qunar.hotel.qta.open.promotion.bean.voucher.VoucherSendTask:getBatchSeriesNum(@177)
        +---[12,0ms]java.lang.Long:valueOf(@177)
        +---[12,0ms]java.util.List:size(@177)
        +---[13,0ms]java.lang.Integer:valueOf(@177)
        `---[13,0ms]org.slf4j.Logger:info(@177)
```

最好也指定下`-n`

#### stack

stack可以产品指定方法调用的stack， 支持正则， 也支持各种条件表达式，具体可以`help stack`

```
ga?>stack -n 1  *com.qunar.hotel.qta.open.promotion.flow.listener.BookingPromotionRollBackListener onMessage 
Press Ctrl+D to abort.
Affect(class-cnt:1 , method-cnt:1) cost in 111 ms.
thread_name="anon-com.qunar.hotel.qta.open.promotion.flow.listener.BookingPromotionRollBackListener.<clinit>:33-thread-6" thread_id=0x20e;is_daemon=true;priority=5;
    @com.qunar.hotel.qta.open.promotion.flow.listener.BookingPromotionRollBackListener.onMessage(BookingPromotionRollBackListener.java:-1)
        at qunar.tc.qmq.consumer.handler.ConsumerMessage.process(ConsumerMessage.java:105)
        at qunar.tc.qmq.consumer.handler.MessageHandler$1.run(MessageHandler.java:57)
        at java.util.concurrent.Executors$RunnableAdapter.call(Executors.java:471)
        at java.util.concurrent.FutureTask.run(FutureTask.java:262)
        at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1145)
        at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:615)
        at java.lang.Thread.run(Thread.java:744)
```

*注意最好指定下-n参数，以免对线上系统造成较大的压力*


#### 其他

还有一些其他的用法，比如支持使用js编写自定义的脚本， 查看jvm的信息， 查看加载的类等等。


### 安全性


> （1） 哪些命令会导致性能问题

Greys的大部分命令性能开销都非常低廉，当然前提是一次性操作的类不要太多。

> （2） 是否能增强由BootstrapClassLoader所加载的类

当然是可以的，但默认我封印了这个能力。主要是Greys自己也使用了大量BootstrapClassLoader所加载的类，如果处理不好极其容易造成故障。

你可以通过隐藏命令options激活这个功能

```
ga?>options unsafe true
+--------+--------------+-------------+
| NAME   | BEFORE-VALUE | AFTER-VALUE |
+--------+--------------+-------------+
| unsafe | false        | true        |
+--------+--------------+-------------+
Affect(row-cnt:1) cost in 2 ms.
```
接下来你可以尝试增强系统类了

```
ga?>monitor -c 5 java.lang.String substring
Press Ctrl+D or Ctrl+X to abort.
Affect(class-cnt:1 , method-cnt:2) cost in 35 ms.
+---------------------+------------------+-----------+-------+---------+------+------+-----------+
| timestamp           | class            | method    | total | success | fail | rt   | fail-rate |
+---------------------+------------------+-----------+-------+---------+------+------+-----------+
| 2015-06-16 23:44:54 | java.lang.String | substring | 30    | 30      | 0    | 0.23 | 0.00%     |
+---------------------+------------------+-----------+-------+---------+------+------+-----------+
```
但我话就放在这里，随意增强系统类。后果自负！

### greys 退出

greys的数据是保存在内存中的， 有些记录的栈桢需要清理，因此推荐使用`shutdown`方法

```
ga?>tt -l
+----------+------------+----------------------+------------+----------+----------+-----------------+--------------------------------+--------------------------------+
|    INDEX | PROCESS-ID |            TIMESTAMP |   COST(ms) |   IS-RET |   IS-EXP |          OBJECT |                          CLASS |                         METHOD |
+----------+------------+----------------------+------------+----------+----------+-----------------+--------------------------------+--------------------------------+
|     1001 |       1002 |  2017-11-12 17:30:40 |         20 |     true |    false |      0x55e9f734 |                           Bean |                         doSend |
+----------+------------+----------------------+------------+----------+----------+-----------------+--------------------------------+--------------------------------+
|     1002 |       1003 |  2017-11-12 17:30:41 |         10 |     true |    false |      0x55e9f734 |                           Bean |                         doSend |
+----------+------------+----------------------+------------+----------+----------+-----------------+--------------------------------+--------------------------------+
|     1003 |       1004 |  2017-11-12 17:37:27 |         10 |     true |    false |      0x55e9f734 |                           Bean |                         doSend |
+----------+------------+----------------------+------------+----------+----------+-----------------+--------------------------------+--------------------------------+
|     1004 |       1005 |  2017-11-12 17:43:15 |          2 |     true |    false |      0x14b7937c | BookingPromotionRollBackListen |                      onMessage |
|          |            |                      |            |          |          |                 |                             er |                                |
+----------+------------+----------------------+------------+----------+----------+-----------------+--------------------------------+--------------------------------+
```

这些时间片默认是保存的，所以退出的时候需要清理下，不然对应用的gc都会有影响。

```
ga?>shutdown
Greys Server is shut down.
```

greys 还提供了一个`reset`的命令，可以还原所有被增强过的类。

>   reset : Reset all the enhanced classes



## 参考

1. [greys pdf · oldmanpushcart/greys-anatomy Wiki](https://github.com/oldmanpushcart/greys-anatomy/wiki/greys-pdf)

2. [Grays Anatomy源码浅析--ClassLoader,Java,Method,DES,null,方法,INVOKING](http://www.bijishequ.com/detail/435931?p=29-55)

3. [FAQ · oldmanpushcart/greys-anatomy Wiki](https://github.com/oldmanpushcart/greys-anatomy/wiki/FAQ)

4. [java 线上调试工具 greys-anatomy 实践初探 | Kuzan](http://hongkaiwen.github.io/2017/07/22/java-%E7%BA%BF%E4%B8%8A%E8%B0%83%E8%AF%95%E5%B7%A5%E5%85%B7-greys-anatomy-%E5%AE%9E%E8%B7%B5%E5%88%9D%E6%8E%A2/index.html)

5. [Btrace入门到熟练小工完全指南 | 江南白衣](http://calvin1978.blogcn.com/articles/btrace1.html)

6. [线上服务 CPU 100%？一键定位 so easy！](http://mp.weixin.qq.com/s?__biz=MjM5NzMyMjAwMA==&mid=2651478959&idx=2&sn=25bac2f47851c436f27c679e77e892ae&chksm=bd2537d08a52bec6d5987b98e885d5b466569a7ba621a5e93297a5490ebd2ea75a04c7b51d47&mpshare=1&scene=1&srcid=09056wNl5ibsbHVZNqBGAT8w#rd)

7. [UserGuideCN · CSUG/HouseMD Wiki](https://github.com/CSUG/HouseMD/wiki/UserGuideCN)

8. [superhj1987/awesome-scripts: useful scripts for Linux op](https://github.com/superhj1987/awesome-scripts)