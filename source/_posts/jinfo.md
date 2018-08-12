title: jinfo使用
tags: jinfo
category: java
toc: true
date: 2017-11-26 23:02:14
---


## 查看最终生效的flag

`sudo -u tomcat jinfo pid`

```
Attaching to process ID 30350, please wait...
Debugger attached successfully.
Server compiler detected.
JVM version is 24.45-b08
...
...
sun.cpu.endian = little
package.access = sun.,org.apache.catalina.,org.apache.coyote.,org.apache.tomcat.,org.apache.jasper.,sun.beans.
sun.cpu.isalist = 

VM Flags:

-Djava.util.logging.config.file=/tomcat/www/application/conf/logging.properties -Xms6g -Xmx6g -Xmn4g -XX:PermSize=256m -XX:MaxPermSize=256M ... -Djava.io.tmpdir=/tomcat/www/application/temp

```

### java -XX:+PrintFlagsFinal

使用`-version`可以查看java支持的开关

```
java -XX:+PrintFlagsFinal -version
```

输出如下：

```
➜  qsli.github.com (hexo|✚6…) java -XX:+PrintFlagsFinal -version
[Global flags]
    uintx AdaptiveSizeDecrementScaleFactor          = 4                                   {product}
    uintx AdaptiveSizeMajorGCDecayTimeScale         = 10                                  {product}
    uintx AdaptiveSizePausePolicy                   = 0                                   {product}
    uintx AdaptiveSizePolicyCollectionCostMargin    = 50                                  {product}
    uintx AdaptiveSizePolicyInitializingSteps       = 20                                  {product}
    ...
    ...
    ...
    uintx YoungGenerationSizeSupplementDecay        = 8                                   {product}
    uintx YoungPLABSize                             = 4096                                {product}
     bool ZeroTLAB                                  = false                               {product}
     intx hashCode                                  = 5                                   {product}
java version "1.8.0_112"
Java(TM) SE Runtime Environment (build 1.8.0_112-b15)
Java HotSpot(TM) 64-Bit Server VM (build 25.112-b15, mixed mode)
```

但是`白衣大侠`说，`-version`的结果可能不准确，最好实际跑一下。

>经常以类似下面的语句去查看参数，偷懒不起应用，用-version代替。有些参数设置后会影响其他参数，所以查看时也把它带上。

```
java -server -Xmx1024m -Xms1024m -XX:+UseConcMarkSweepGC -XX:+PrintFlagsFinal -version| grep ParallelGCThreads
```

## 动态打开jvm的开关

jinfo可以动态的改变jvm的flag， 而不必重启服务器。虽然只对一些特定的flag有效，但是有的时候也很有用。

支持动态开启和关闭的的flag，可以通过下面的命令查看。

`java -XX:+PrintFlagsFinal -version | grep managed`

```
qsli.github.com (hexo|✚6…) java -XX:+PrintFlagsInitial | grep manageable
     intx CMSAbortablePrecleanWaitMillis            = 100                                 {manageable}
     intx CMSTriggerInterval                        = -1                                  {manageable}
     intx CMSWaitDuration                           = 2000                                {manageable}
     bool HeapDumpAfterFullGC                       = false                               {manageable}
     bool HeapDumpBeforeFullGC                      = false                               {manageable}
     bool HeapDumpOnOutOfMemoryError                = false                               {manageable}
    ccstr HeapDumpPath                              =                                     {manageable}
    uintx MaxHeapFreeRatio                          = 70                                  {manageable}
    uintx MinHeapFreeRatio                          = 40                                  {manageable}
     bool PrintClassHistogram                       = false                               {manageable}
     bool PrintClassHistogramAfterFullGC            = false                               {manageable}
     bool PrintClassHistogramBeforeFullGC           = false                               {manageable}
     bool PrintConcurrentLocks                      = false                               {manageable}
     bool PrintGC                                   = false                               {manageable}
     bool PrintGCDateStamps                         = false                               {manageable}
     bool PrintGCDetails                            = false                               {manageable}
     bool PrintGCID                                 = false                               {manageable}
     bool PrintGCTimeStamps                         = false                               {manageable}
```

用`JConsole`打开，可以看到相应的`MXBean`节点:

{%  asset_img   jinfo.png  %}

使用代码也可以获取对应的值：

```java
/**
 * @author afei
 * @version 1.0.0
 * @since 2017年07月25日
 */
public class DiagnosticOptionsTest {

    public static void main(String[] args) {
        HotSpotDiagnostic mxBean = new HotSpotDiagnostic();
        List<VMOption> diagnosticVMOptions = mxBean.getDiagnosticOptions();
        for (VMOption vmOption:diagnosticVMOptions){
            System.out.println(vmOption.getName() + " = " + vmOption.getValue());
        }
    }
}
```

>代码拷贝自参考1

然后就可以使用下面的命令，打开或者关闭相应的开关

```
 -flag [+|-]name
             enables or disables the given boolean command line flag.
```

比如：

```bash
  sudo -u tomcat jinfo -flag  -PrintGC `pgrep -f tomcat`
  sudo -u tomcat jinfo -flag  +PrintGC `pgrep -f tomcat`
```

## 参考

1. [jinfo命令详解 - 简书](http://www.jianshu.com/p/c321d0808a1b)

2. [Java调优经验谈](http://mp.weixin.qq.com/s?__biz=MzU3NDAxMzU1Nw==&mid=2247484957&idx=3&sn=ee1e459b6e579555b7006cb69a6bb7f1&chksm=fd39af07ca4e2611707621a71dedfa7329668d741fa2b4bdc9835ef14583cf79adb378d8d6c6&mpshare=1&scene=1&srcid=1123RfpGGNhu1XF30IA20OFH#rd)

3. [通过jinfo工具在full GC前后做heap dump - Script Ahead, Code Behind - ITeye博客](http://rednaxelafx.iteye.com/blog/1049240)

4. [关键业务系统的JVM参数推荐(2016热冬版）](http://mp.weixin.qq.com/s?__biz=MzIzODYyNjkzNw==&mid=2247483687&idx=1&sn=41f24dac62c0ca65e4dfe32eae62f3f2&chksm=e9373031de40b927497e5b9aa5dacae6e0a5bac8c760e05ae1d983baf700f45fe8f6c1cfca41&mpshare=1&scene=1&srcid=0904E8auyJdEzKjyytGtjpVO#rd)