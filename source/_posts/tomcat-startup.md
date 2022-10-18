---
title: tomcat-startup
tags: tomcat-startup
category: tomcat
toc: true
typora-root-url: tomcat-startup
typora-copy-images-to: tomcat-startup
date: 2021-11-20 19:25:08
---





## 启动脚本

### startup.sh

一般是用`$CATALINA_HOME/bin/startup.sh`脚本启动：

```bash
➜  bin  cat startup.sh
#!/bin/sh

# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the "License"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# -----------------------------------------------------------------------------
# Start Script for the CATALINA Server
# -----------------------------------------------------------------------------

# Better OS/400 detection: see Bugzilla 31132
os400=false
case "`uname`" in
OS400*) os400=true;;
esac

# resolve links - $0 may be a softlink
PRG="$0"

while [ -h "$PRG" ] ; do
  ls=`ls -ld "$PRG"`
  link=`expr "$ls" : '.*-> \(.*\)$'`
  if expr "$link" : '/.*' > /dev/null; then
    PRG="$link"
  else
    PRG=`dirname "$PRG"`/"$link"
  fi
done

PRGDIR=`dirname "$PRG"`
EXECUTABLE=catalina.sh

# Check that target executable exists
if $os400; then
  # -x will Only work on the os400 if the files are:
  # 1. owned by the user
  # 2. owned by the PRIMARY group of the user
  # this will not work if the user belongs in secondary groups
  eval
else
  if [ ! -x "$PRGDIR"/"$EXECUTABLE" ]; then
    echo "Cannot find $PRGDIR/$EXECUTABLE"
    echo "The file is absent or does not have execute permission"
    echo "This file is needed to run this program"
    exit 1
  fi
fi

exec "$PRGDIR"/"$EXECUTABLE" start "$@"
```

这个脚本最终调用的是`catalina.sh`,传入的参数是`start`和我们的命令行参数

这个脚本除了start，还有其他的命令，相当于其他脚本的一个入口：

```bash
➜  bin  catalina.sh
Using CATALINA_BASE:   /Users/qishengli/software/apache-tomcat-8.5.32
Using CATALINA_HOME:   /Users/qishengli/software/apache-tomcat-8.5.32
Using CATALINA_TMPDIR: /Users/qishengli/software/apache-tomcat-8.5.32/temp
Using JRE_HOME:        /Users/qishengli/software/jdk8/jre
Using CLASSPATH:       /Users/qishengli/software/apache-tomcat-8.5.32/bin/bootstrap.jar:/Users/qishengli/software/apache-tomcat-8.5.32/bin/tomcat-juli.jar
Usage: catalina.sh ( commands ... )
commands:
  debug             Start Catalina in a debugger
  debug -security   Debug Catalina with a security manager
  jpda start        Start Catalina under JPDA debugger
  run               Start Catalina in the current window
  run -security     Start in the current window with security manager
  start             Start Catalina in a separate window
  start -security   Start in a separate window with security manager
  stop              Stop Catalina, waiting up to 5 seconds for the process to end
  stop n            Stop Catalina, waiting up to n seconds for the process to end
  stop -force       Stop Catalina, wait up to 5 seconds and then use kill -KILL if still running
  stop n -force     Stop Catalina, wait up to n seconds and then use kill -KILL if still running
  configtest        Run a basic syntax check on server.xml - check exit code for result
  version           What version of tomcat are you running?
Note: Waiting for the process to end and use of the -force option require that $CATALINA_PID is defined
```


比如`version`:

```bash
➜  bin  catalina.sh version
Using CATALINA_BASE:   /Users/qishengli/software/apache-tomcat-8.5.32
Using CATALINA_HOME:   /Users/qishengli/software/apache-tomcat-8.5.32
Using CATALINA_TMPDIR: /Users/qishengli/software/apache-tomcat-8.5.32/temp
Using JRE_HOME:        /Users/qishengli/software/jdk8/jre
Using CLASSPATH:       /Users/qishengli/software/apache-tomcat-8.5.32/bin/bootstrap.jar:/Users/qishengli/software/apache-tomcat-8.5.32/bin/tomcat-juli.jar
Server version: Apache Tomcat/8.5.32
Server built:   Jun 20 2018 19:50:35 UTC
Server number:  8.5.32.0
OS Name:        Mac OS X
OS Version:     11.6
Architecture:   aarch64
JVM Version:    1.8.0_282-b08
JVM Vendor:     Azul Systems, Inc.
```

看一下start对应的源码部分：

```bash
elif [ "$1" = "start" ] ; then

 # CATALINA_PID的处理逻辑，此处省略
  shift
  touch "$CATALINA_OUT"
  if [ "$1" = "-security" ] ; then
    if [ $have_tty -eq 1 ]; then
      echo "Using Security Manager"
    fi
    shift
    eval $_NOHUP "\"$_RUNJAVA\"" "\"$LOGGING_CONFIG\"" $LOGGING_MANAGER $JAVA_OPTS $CATALINA_OPTS \
      -D$ENDORSED_PROP="\"$JAVA_ENDORSED_DIRS\"" \
      -classpath "\"$CLASSPATH\"" \
      -Djava.security.manager \
      -Djava.security.policy=="\"$CATALINA_BASE/conf/catalina.policy\"" \
      -Dcatalina.base="\"$CATALINA_BASE\"" \
      -Dcatalina.home="\"$CATALINA_HOME\"" \
      -Djava.io.tmpdir="\"$CATALINA_TMPDIR\"" \
      org.apache.catalina.startup.Bootstrap "$@" start \
      >> "$CATALINA_OUT" 2>&1 "&"

  else
    eval $_NOHUP "\"$_RUNJAVA\"" "\"$LOGGING_CONFIG\"" $LOGGING_MANAGER $JAVA_OPTS $CATALINA_OPTS \
      -D$ENDORSED_PROP="\"$JAVA_ENDORSED_DIRS\"" \
      -classpath "\"$CLASSPATH\"" \
      -Dcatalina.base="\"$CATALINA_BASE\"" \
      -Dcatalina.home="\"$CATALINA_HOME\"" \
      -Djava.io.tmpdir="\"$CATALINA_TMPDIR\"" \
      org.apache.catalina.startup.Bootstrap "$@" start \
      >> "$CATALINA_OUT" 2>&1 "&"

  fi

  if [ ! -z "$CATALINA_PID" ]; then
    echo $! > "$CATALINA_PID"
  fi

  echo "Tomcat started."
```

基本上就是把之前detect到的各种环境变量当做参数，传递给java命令，这个脚本里默认会执行`bin/setenv.sh`，所以一般会在这个文件中设置tomcat的环境变量，比如本机的设置：

```bash
➜  bin  cat setenv.sh
export CATALINA_OPTS="-agentpath:/Users/qishengli/Downloads/async-profiler-2.5-macos/build/libasyncProfiler.so=start,event=cpu,interval=1ms,file=profile.html   -Djava.rmi.server.logCalls=true   -Dsun.rmi.server.logLevel=debug"
```

对应的脚本位置：

```bash
➜  bin  grep -n  setenv catalina.sh
24:#   setenv.sh in CATALINA_BASE/bin to keep your customizations separate.
145:# but allow them to be specified in setenv.sh, in rare case when it is needed.
148:if [ -r "$CATALINA_BASE/bin/setenv.sh" ]; then
149:  . "$CATALINA_BASE/bin/setenv.sh"
150:elif [ -r "$CATALINA_HOME/bin/setenv.sh" ]; then
151:  . "$CATALINA_HOME/bin/setenv.sh"
```

最终我们能拿到的命令形式：

```bash
"/Users/qishengli/software/jdk8/jre/bin/java" "-Djava.util.logging.config.file=/Users/qishengli/software/apache-tomcat-8.5.32/conf/logging.properties" -Djava.util.logging.manager=org.apache.juli.ClassLoaderLogManager -Djdk.tls.ephemeralDHKeySize=2048 -Djava.protocol.handler.pkgs=org.apache.catalina.webresources -Dorg.apache.catalina.security.SecurityListener.UMASK=0027 -agentpath:/Users/qishengli/Downloads/async-profiler-2.5-macos/build/libasyncProfiler.so=start,event=cpu,interval=1ms,file=profile.html -Djava.rmi.server.logCalls=true -Dsun.rmi.server.logLevel=debug -Dignore.endorsed.dirs="" -classpath "/Users/qishengli/software/apache-tomcat-8.5.32/bin/bootstrap.jar:/Users/qishengli/software/apache-tomcat-8.5.32/bin/tomcat-juli.jar" -Dcatalina.base="/Users/qishengli/software/apache-tomcat-8.5.32" -Dcatalina.home="/Users/qishengli/software/apache-tomcat-8.5.32" -Djava.io.tmpdir="/Users/qishengli/software/apache-tomcat-8.5.32/temp" org.apache.catalina.startup.Bootstrap start &
```

最后终于到了对应的java代码`org.apache.catalina.startup.Bootstrap start`。

### idea

```bash
/Users/qishengli/software/apache-tomcat-8.5.32/bin/catalina.sh run
NOTE: Picked up JDK_JAVA_OPTIONS:  --add-opens=java.base/java.lang=ALL-UNNAMED --add-opens=java.base/java.io=ALL-UNNAMED --add-opens=java.rmi/sun.rmi.transport=ALL-UNNAMED
-Dcatalina.base=/Users/qishengli/Library/Caches/JetBrains/IntelliJIdea2021.2/tomcat/15632928-a384-44e8-ba78-fe9ca3f37059
[2021-10-31 05:19:05,458] Artifact web:war exploded: Waiting for server connection to start artifact deployment...
```

直接调用的catalina.sh的run命令

```bash
 376 elif [ "$1" = "run" ]; then
 377
 378   shift
 379   if [ "$1" = "-security" ] ; then
 380     if [ $have_tty -eq 1 ]; then
 381       echo "Using Security Manager"
 382     fi
 383     shift
 384     eval exec "\"$_RUNJAVA\"" "\"$LOGGING_CONFIG\"" $LOGGING_MANAGER $JAVA_OPTS $CATALINA_OPTS \
 385       -D$ENDORSED_PROP="\"$JAVA_ENDORSED_DIRS\"" \
 386       -classpath "\"$CLASSPATH\"" \
 387       -Djava.security.manager \
 388       -Djava.security.policy=="\"$CATALINA_BASE/conf/catalina.policy\"" \
 389       -Dcatalina.base="\"$CATALINA_BASE\"" \
 390       -Dcatalina.home="\"$CATALINA_HOME\"" \
 391       -Djava.io.tmpdir="\"$CATALINA_TMPDIR\"" \
 392       org.apache.catalina.startup.Bootstrap "$@" start
 393   else
 394     eval exec "\"$_RUNJAVA\"" "\"$LOGGING_CONFIG\"" $LOGGING_MANAGER $JAVA_OPTS $CATALINA_OPTS \
 395       -D$ENDORSED_PROP="\"$JAVA_ENDORSED_DIRS\"" \
 396       -classpath "\"$CLASSPATH\"" \
 397       -Dcatalina.base="\"$CATALINA_BASE\"" \
 398       -Dcatalina.home="\"$CATALINA_HOME\"" \
 399       -Djava.io.tmpdir="\"$CATALINA_TMPDIR\"" \
 400       org.apache.catalina.startup.Bootstrap "$@" start
 401   fi
```

跟脚本里启动相比，这里有两点不同：

- 没有创建PID文件

- 使用的是eval exec，而不是eval

- 通过-Dcatalina.base=xxx，指定了catalina.base的位置为idea自定义的目录（tomcat 默认读取catalina.base下的web.xml）

  ![image-20211114010037863](/image-20211114010037863.png)

> `catalina.sh run` starts tomcat in the foreground, displaying the logs on the console that you started it. Hitting Ctrl-C will terminate tomcat.
>
> `startup.sh` will start tomcat in the background. You'll have to `tail -f logs/catalina.out` to see the logs.
>
> Both will do the same things, apart from the foreground/background distinction.

后续的流程就到了java代码里

## Java代码中的启动流程

### Bootstrap

> The purpose of this roundabout approach is to keep the Catalina internal classes (and any
> other classes they depend on, such as an XML parser) out of the system
> class path and therefore not visible to application level classes.

bootstrap只是一张皮，先初始化了`org.apache.catalina.startup.Catalina`，然后调用其`start`方法。这么做的原因，注释中也给出了解释——防止tomcat的内部类被应用层感知（不在class path中，class path中只引入两个jar包，一个叫/bin/bootstrap.jar，一个叫/tomcat-juli.jar，其他的内部的jar包都在lib目录中，这部分是不在class path中的）。

![image-20211127174106373](/image-20211127174106373.png)

```java
// org.apache.catalina.startup.Bootstrap#start
    /**
     * Start the Catalina daemon.
     * @throws Exception Fatal start error
     */
    public void start()
        throws Exception {
        if( catalinaDaemon==null ) init();

        Method method = catalinaDaemon.getClass().getMethod("start", (Class [] )null);
        method.invoke(catalinaDaemon, (Object [])null);

    }
```

初始化的时候，会初始化三个类加载器`commonLoader`、`catalinaLoader`、`sharedLoader`。这三个类加载器本质上都是URLClassLoader，只是负责的加载的路径不同，可以在catalina.properties中配置：

```properties
  38 # List of comma-separated paths defining the contents of the "common"
  39 # classloader.
  53 common.loader="${catalina.base}/lib","${catalina.base}/lib/*.jar","${catalina.home}/lib","${catalina.home}/lib/*.jar"
  
  56 # List of comma-separated paths defining the contents of the "server"
  57 # classloader.
  71 server.loader=
  
  73 #
  74 # List of comma-separated paths defining the contents of the "shared"
  75 # classloader. 
  90 shared.loader=
```

这部分涉及到tomcat的类加载机制，会单独写一篇解析的文章，可以暂且跳过。

接力棒转交到Catalina之后，就涉及到配置文件的解析、tomcat的各个组件的启动了，会在第二篇中接着讲。

### idea tomcat configuration 启动

从火焰图中看，Servlet是在RMI的线程中加载的：

![image-20211031162246558](/image-20211031162246558.png)

debug，获取对应的socket信息

![image-20211031161736022](/image-20211031161736022.png)

可以看出这个RMI调用是idea发起的，server是tomcat

```bash
➜  conf  lsof -i:54276
COMMAND   PID      USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
java    28192 qishengli   84u  IPv6 0x9b294f61ef653d83      0t0  TCP localhost:54268->localhost:54276 (ESTABLISHED)
idea    55040 qishengli  227u  IPv4 0x9b294f61f4b22e13      0t0  TCP localhost:54276->localhost:54268 (ESTABLISHED)
```

查看idea此时的栈信息，可以找到对应的线程栈：

```bash
"javaee connector" #5620 prio=4 os_prio=31 cpu=17.64ms elapsed=926.91s tid=0x000000036be2e400 nid=0x4e78b runnable  [0x000000039bbb9000]
   java.lang.Thread.State: RUNNABLE
        at java.net.SocketInputStream.socketRead0(java.base@11.0.12/Native Method)
        at java.net.SocketInputStream.socketRead(java.base@11.0.12/SocketInputStream.java:115)
        at java.net.SocketInputStream.read(java.base@11.0.12/SocketInputStream.java:168)
        at java.net.SocketInputStream.read(java.base@11.0.12/SocketInputStream.java:140)
        at java.io.BufferedInputStream.fill(java.base@11.0.12/BufferedInputStream.java:252)
        at java.io.BufferedInputStream.read(java.base@11.0.12/BufferedInputStream.java:271)
        - locked <0x0000000794f63408> (a java.io.BufferedInputStream)
        at java.io.DataInputStream.readByte(java.base@11.0.12/DataInputStream.java:270)
        at sun.rmi.transport.StreamRemoteCall.executeCall(java.rmi@11.0.12/StreamRemoteCall.java:240)
        at sun.rmi.server.UnicastRef.invoke(java.rmi@11.0.12/UnicastRef.java:164)
        at jdk.jmx.remote.internal.rmi.PRef.invoke(jdk.remoteref/Unknown Source)
        at javax.management.remote.rmi.RMIConnectionImpl_Stub.invoke(java.management.rmi@11.0.12/Unknown Source)
        at javax.management.remote.rmi.RMIConnector$RemoteMBeanServerConnection.invoke(java.management.rmi@11.0.12/RMIConnector.java:1021)
        at com.intellij.javaee.oss.util.AbstractConnectorCommand.invokeOperation(AbstractConnectorCommand.java:139)
        at org.jetbrains.idea.tomcat.admin.TomcatAdminServerBase$2.doExecute(TomcatAdminServerBase.java:159)
        at org.jetbrains.idea.tomcat.admin.TomcatAdminServerBase$2.doExecute(TomcatAdminServerBase.java:155)
        at com.intellij.javaee.oss.util.AbstractConnectorCommand$1.call(AbstractConnectorCommand.java:36)
        at java.util.concurrent.FutureTask.run(java.base@11.0.12/FutureTask.java:264)
        at java.util.concurrent.ThreadPoolExecutor.runWorker(java.base@11.0.12/ThreadPoolExecutor.java:1128)
        at java.util.concurrent.ThreadPoolExecutor$Worker.run(java.base@11.0.12/ThreadPoolExecutor.java:628)
        at java.lang.Thread.run(java.base@11.0.12/Thread.java:829)
```

idea的社区版里没有找到这个类，用arthas 反编译`org.jetbrains.idea.tomcat.admin.TomcatAdminServerBase`，得到源码：

```java
[arthas@55040]$ jad org.jetbrains.idea.tomcat.admin.TomcatAdminServerBase$2

ClassLoader:
+-PluginClassLoader(plugin=PluginDescriptor(name=Tomcat and TomEE, id=Tomcat, descriptorPath=plugin.xml, path=/Applications/IntelliJ IDEA.app/Contents/plugins/Tomcat, version=2
  12.5284.40, package=null), packagePrefix=null, instanceId=190, state=active)

Location:


        /*
         * Decompiled with CFR.
         *
         * Could not load the following classes:
         *  org.jetbrains.idea.tomcat.admin.TomcatJmxAdminServerBase
         *  org.jetbrains.idea.tomcat.admin.TomcatJmxAdminServerBase$TomcatConnectorCommandBase
         */
        package org.jetbrains.idea.tomcat.admin;

        import java.io.IOException;
        import javax.management.JMException;
        import javax.management.MBeanServerConnection;
        import javax.management.ObjectName;
        import org.jetbrains.idea.tomcat.admin.TomcatJmxAdminServerBase;

        class TomcatAdminServerBase.2
        extends TomcatJmxAdminServerBase.TomcatConnectorCommandBase<String> {
            final /* synthetic */ String val$contextPath;
            final /* synthetic */ String val$deploymentPath;

            TomcatAdminServerBase.2(String string, String string2) {
                this.val$contextPath = string;
                this.val$deploymentPath = string2;
                super((TomcatJmxAdminServerBase)TomcatAdminServerBase.this);
            }

            protected String doExecute(MBeanServerConnection connection) throws JMException, IOException {
/*159*/         return (String)TomcatAdminServerBase.2.invokeOperation((MBeanServerConnection)connection, (ObjectName)TomcatAdminServerBase.2.createObjectName((String)TomcatAdminServerBase.this.getFactoryObjectName()), (String)"createStandardContext", (Object[])new Object[]{TomcatAdminServerBase.this.getHostObjectName(), this.val$contextPath, this.val$deploymentPath});
            }

            protected Integer getTimeoutSeconds() {
/*167*/         return null;
            }
        }

Affect(row-cnt:1) cost in 2415 ms.
```

正是这里调用了tomcat的`createStandardContext`



#### idea为何这么做？

idea通过RMI调用tomcat的DynamicBean，可以显示的指定app的class目录，而无需放到tomcat的指定目录下：

![image-20211114004458277](/image-20211114004458277.png)

同时，ide里对应配置的修改，也会反应到idea自己创建的web.xml上：

![image-20211114005120004.png](/image-20211114005120004.png)

```xml
➜  conf  cat  /Users/qishengli/Library/Caches/JetBrains/IntelliJIdea2021.2/tomcat/15632928-a384-44e8-ba78-fe9ca3f37059/conf/server.xml
<Server port="8005" shutdown="SHUTDOWN">
  <Listener className="org.apache.catalina.startup.VersionLoggerListener" />
  <Listener className="org.apache.catalina.core.AprLifecycleListener" SSLEngine="on" />
  <Listener className="org.apache.catalina.core.JreMemoryLeakPreventionListener" />
  <Listener className="org.apache.catalina.mbeans.GlobalResourcesLifecycleListener" />
  <Listener className="org.apache.catalina.core.ThreadLocalLeakPreventionListener" />
  <GlobalNamingResources>
    <Resource name="UserDatabase" auth="Container" type="org.apache.catalina.UserDatabase" description="User database that can be updated and saved" factory="org.apache.catalina.users.MemoryUserDatabaseFactory" pathname="conf/tomcat-users.xml" />
  </GlobalNamingResources>
  <Service name="Catalina">
    <Connector port="8087" protocol="HTTP/1.1" connectionTimeout="20000" redirectPort="8443" />
    <Connector port="8009" protocol="AJP/1.3" redirectPort="8443" />
    <Engine name="Catalina" defaultHost="localhost">
      <Realm className="org.apache.catalina.realm.LockOutRealm">
        <Realm className="org.apache.catalina.realm.UserDatabaseRealm" resourceName="UserDatabase" />
      </Realm>
      <Host name="localhost" appBase="/Users/qishengli/software/apache-tomcat-8.5.32/webapps" unpackWARs="true" autoDeploy="true" deployOnStartup="false" deployIgnore="^(?!(manager)|(tomee)$).*">
        <Valve className="org.apache.catalina.valves.AccessLogValve" directory="logs" prefix="localhost_access_log" suffix=".txt" pattern="%h %l %u %t &quot;%r&quot; %s %b" />
      </Host>
    </Engine>
  </Service>
</Server>
```



## 参考

- [linux exec与重定向](http://xstarcd.github.io/wiki/shell/exec_redirect.html)
- [apache tomee - Whats the difference between service tomcat start/stop and ./catalina.sh run/stop - Stack Overflow](https://stackoverflow.com/questions/29984238/whats-the-difference-between-service-tomcat-start-stop-and-catalina-sh-run-sto)
