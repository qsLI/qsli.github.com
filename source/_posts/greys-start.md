title: greys启动分析
tags: greys
category: perf
toc: true
date: 2018-04-02 01:31:53
---


# greys 简介

greys的使用参见链接： [greys-anatomy 简介](https://qsli.github.io/2017/11/12/greys/)

# greys.sh

一般使用greys时，启动命令如下：

```bash
sudo -u tomcat -H ./greys.sh [pid]
```

`greys.sh`的最后一行`main "${@}"`将命令行的所有参数都传给了main函数， 看main函数的实现：

```bash
    while getopts "PUJC" ARG
    do
        case ${ARG} in
            P) OPTION_CHECK_PERMISSION=0;;
            U) OPTION_UPDATE_IF_NECESSARY=0;;
            J) OPTION_ATTACH_JVM=0;;
            C) OPTION_ACTIVE_CONSOLE=0;;
            ?) usage;exit 1;;
        esac
    done
```

首先脚本使用`getopts`来获取命令行的参数， 指定解析`-P`、`-U`、`-J`、`-C`这几个参数，设置一些flag。
注意下case语句中的`？`， 代表无法识别的命令行参数, 这时就打印出help，然后退出程序：

>The GNU getopt command uses the GNU getopt() library function to do the parsing of the arguments and options.

>If getopt() does not recognize an option character, it prints an error message to stderr, stores the character in optopt, and returns ?. The calling program may prevent the error message by setting opterr to 0.

然后greys.sh这个脚本会检查greys的版本是否有更新， 除了检查更新就是`attach jvm`和`active console`：

```bash
    if [[ ${OPTION_ATTACH_JVM} -eq 1 ]]; then
        attach_jvm ${greys_local_version}\
            || exit_on_err 1 "attach to target jvm(${TARGET_PID}) failed."
    fi

    if [[ ${OPTION_ACTIVE_CONSOLE} -eq 1 ]]; then
        active_console ${greys_local_version}\
            || exit_on_err 1 "active console failed."
    fi
```

`${OPTION_ATTACH_JVM}`和`${OPTION_ACTIVE_CONSOLE}`的默认值都是1：

```bash

# the option to control greys.sh attach target jvm
OPTION_ATTACH_JVM=1

# the option to control greys.sh active greys-console
OPTION_ACTIVE_CONSOLE=1
```


# attach jvm分析

```bash
attach_jvm()
{
    local greys_lib_dir=${GREYS_LIB_DIR}/${1}/greys

    # if [ ${TARGET_IP} = ${DEFAULT_TARGET_IP} ]; then
    if [ ! -z ${TARGET_PID} ]; then
        ${JAVA_HOME}/bin/java \
            ${BOOT_CLASSPATH} ${JVM_OPTS} \
            -jar ${greys_lib_dir}/greys-core.jar \
                -pid ${TARGET_PID} \
                -target ${TARGET_IP}":"${TARGET_PORT} \
                -core "${greys_lib_dir}/greys-core.jar" \
                -agent "${greys_lib_dir}/greys-agent.jar"
    fi
}
```

attach jvm这个函数，就是调用 greys-core这个jar包，  jar包执行时会调用指定的`Main-Class`的的main方法。
`Main-Class`在`META-INF`中指定， 查看文件的内容:

```bash
➜  greys  unzip -q -c greys-core.jar  META-INF/MANIFEST.MF
Manifest-Version: 1.0
Archiver-Version: Plexus Archiver
Created-By: Apache Maven
Built-By: vlinux
Build-Jdk: 1.8.0_91
Main-Class: com.github.ompc.greys.core.GreysLauncher
```

因此执行这个jar包后，会调用`GreysLauncher`的main方法。

## attach到jvm过程

`GreysLauncher`在main函数中做了两件事情，一是解析命令行配置， 二是attach到具体的jvm上。

```java
    public static void main(String[] args) {
        try {
            new GreysLauncher(args);
        } catch (Throwable t) {
            System.err.println("start greys failed, because : " + getCauseMessage(t));
            System.exit(-1);
        }
    }

    public GreysLauncher(String[] args) throws Exception {

        // 解析配置文件
        Configure configure = analyzeConfigure(args);

        // 加载agent
        attachAgent(configure);
    }
```

配置文件就是脚本中指定的参数，主要有如下字段：

```java
    private String targetIp;                // 目标主机IP
    private int targetPort;                 // 目标进程号
    private int javaPid;                    // 对方java进程号
    private int connectTimeout = 6000;      // 连接超时时间(ms)
    private String greysCore;               // greys-core.jar的位置
    private String greysAgent;              // greys-agent.jar的位置
```

### attach原理

{% asset_img  attach.jpg jps实现原理 %}

我们在用`jstack`命令查看jvm的线程dump的时候，经常看到这两个进程，一个是`"Signal Dispatcher"`, 另外一个是`"Attach Listener"`;
这两个线程就和attach功能密切相关。

```
"Signal Dispatcher" #4 daemon prio=9 os_prio=0 tid=0x00007f23b80d2800 nid=0xb82e runnable [0x0000000000000000]
   java.lang.Thread.State: RUNNABLE

"Attach Listener" #28 daemon prio=9 os_prio=0 tid=0x00007f2328001000 nid=0x3bb5 waiting on condition [0x0000000000000000]
   java.lang.Thread.State: RUNNABLE
```

`Signal Dispatcher`负责响应`SIGQUIT`, 并创建 `Attach Listener`。`Attach Listener`负责建立通信，执行相应的命令。

attach jvm就是根据`com.sun.tools.attach.VirtualMachine`的接口提供的方法——`attach`和`loadAgent`

### GreysLauncher

```java
  Object vmObj = null;
        try {
            if (null == attachVmdObj) { // 使用 attach(String pid) 这种方式
                vmObj = vmClass.getMethod("attach", String.class).invoke(null, "" + configure.getJavaPid());
            } else {
                vmObj = vmClass.getMethod("attach", vmdClass).invoke(null, attachVmdObj);
            }
            vmClass.getMethod("loadAgent", String.class, String.class).invoke(vmObj, configure.getGreysAgent(), configure.getGreysCore() + ";" + configure.toString());
        } finally {
            if (null != vmObj) {
                vmClass.getMethod("detach", (Class<?>[]) null).invoke(vmObj, (Object[]) null);
            }
        }
```

通过上面的代码， `greys-core.jar`和`greys-agent.jar`这两个jar包就被引入到了jvm

> The loadAgent method is used to load agents that are written in the Java Language and deployed in a JAR file. (See java.lang.instrument for a detailed description on how these agents are loaded and started).

`loadAgent`会将`greys-core.jar`和`greys-agent.jar`两个jar包引入进来。jar包引入后会从`/META-INF/MANIFEST.MF`中读取配置的agent类。

## agent启动过程

agent有两种启动方式，一种再jvm启动的时候一起启动， 一种是动态的attach到一个运行的jvm上。

### 随启动参数启动

以agent形式启动需要在jvm启动参数添加：

```
    -javaagent:btrace-agent.jar
```

这种加载方式需要实现下面两个接口中的一个：

```java
/**
 * JVM先尝试调用这个方法
 */
public static void premain(String agentArgs, Instrumentation inst);
/**
 * 如果上面的方法不存在，则尝试调用这个方法
 */
public static void premain(String agentArgs);
```

同时必须在`MANIFEST.MF`中包含`Premain-Class`指定对应的类。


### 动态attach的方式启动

attach形式需要实现下面的两个接口

```java
/**
 * 首先尝试调用这个方法
 */
public static void agentmain(String agentArgs, Instrumentation inst);


/**
 * 上面的方法不存在，会尝试调用这个方法
 */
public static void agentmain(String agentArgs);
```

同时在Jar包中必须指定 `Agent-Class`, 因此当此jar包被加载时，jvm会从`/META-INF/MANIFEST.MF`中读取配置的`Premain-Class`和`Agent-Class`, `greys-agent`的信息显示如下：

```xml
Manifest-Version: 1.0
Archiver-Version: Plexus Archiver
Created-By: Apache Maven
Built-By: vlinux
Build-Jdk: 1.8.0_91
Agent-Class: com.github.ompc.greys.agent.AgentLauncher
Can-Redefine-Classes: true
Can-Retransform-Classes: true
Premain-Class: com.github.ompc.greys.agent.AgentLauncher
```

因此入口定位在`AgentLauncher`。

### AgentLauncher

`AgentLauncher`的主要完成了一下的功能：
    - 自定义类加载器，减少对现有工程的侵蚀
    - 启动一个`GaServer`监听指定的端口

`GaServer`读取用户的输入的命令， 将命令交给`CommandHandler`在新的线程中进行具体的处理。

# active console分析

```bash
# active console
# $1 : greys_local_version
active_console()
{

    local greys_lib_dir=${GREYS_LIB_DIR}/${1}/greys

    if type ${JAVA_HOME}/bin/java 2>&1 >> /dev/null; then

        # use default console
        ${JAVA_HOME}/bin/java \
            -cp ${greys_lib_dir}/greys-core.jar \
            com.github.ompc.greys.core.GreysConsole \
                ${TARGET_IP} \
                ${TARGET_PORT}

    elif type telnet 2>&1 >> /dev/null; then

        # use telnet
        telnet ${TARGET_IP} ${TARGET_PORT}

    elif type nc 2>&1 >> /dev/null; then

        # use netcat
        nc ${TARGET_IP} ${TARGET_PORT}

    else

        echo "'telnet' or 'nc' is required." 1>&2
        return 1

    fi
}
```

`active console`主要是启动一个客户端， 它对不同的方式做了判断; 以java方式启动的会执行`greys-core.jar`的`GreysConsole`
的main方法：

```java
    public static void main(String... args) throws IOException {
        new GreysConsole(new InetSocketAddress(args[0], Integer.valueOf(args[1])));
    }
   
```

在`GreysConsole`的构造函数中连接到上面启动的`GaServer`， 将用户输入的命令发送到server端， 然后将server端的返回显示在交互式shell上。

```java
    // com.github.ompc.greys.core.GreysConsole#activeConsoleReader
    /**
     * 发送命令到服务端
     */
    private void activeConsoleReader() {
        final Thread socketThread = new Thread("ga-console-reader-daemon") {

            private StringBuilder lineBuffer = new StringBuilder();

            @Override
            public void run() {
                try {

                    while (isRunning) {

                        final String line = console.readLine();

                        // 如果是\结尾，则说明还有下文，需要对换行做特殊处理
                        if (StringUtils.endsWith(line, "\\")) {
                            // 去掉结尾的\
                            lineBuffer.append(line.substring(0, line.length() - 1));
                            continue;
                        } else {
                            lineBuffer.append(line);
                        }

                        final String lineForWrite = lineBuffer.toString();
                        lineBuffer = new StringBuilder();

                        // replace ! to \!
                        // history.add(StringUtils.replace(lineForWrite, "!", "\\!"));

                        // flush if need
                        if (history instanceof Flushable) {
                            ((Flushable) history).flush();
                        }

                        console.setPrompt(EMPTY);
                        if (isNotBlank(lineForWrite)) {
                            socketWriter.write(lineForWrite + "\n");
                        } else {
                            socketWriter.write("\n");
                        }
                        socketWriter.flush();

                    }
                } catch (IOException e) {
                    err("read fail : %s", e.getMessage());
                    shutdown();
                }

            }

        };
        socketThread.setDaemon(true);
        socketThread.start();
    }

    // com.github.ompc.greys.core.GreysConsole#loopForWriter
    // 将服务端返回输出到界面
    private void loopForWriter() {
        try {
            while (isRunning) {
                final int c = socketReader.read();
                if (c == EOF) {
                    break;
                }
                if (c == EOT) {
                    hackingForReDrawPrompt();
                    console.setPrompt(DEFAULT_PROMPT);
                    console.redrawLine();
                } else {
                    out.write(c);
                }
                out.flush();
            }
        } catch (IOException e) {
            err("write fail : %s", e.getMessage());
            shutdown();
        }

    }
```

# Misc

## 使用maven生成MainFest文件

### maven-jar-plugin

```xml
 <build>
        <finalName>qtracer-agent</finalName>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-jar-plugin</artifactId>
                <version>2.4</version>
                <configuration>
                    <archive>
                        <manifestEntries>
                            <Premain-Class>qunar.tc.qtracer.instrument.AgentMain</Premain-Class>
                            <Agent-Class>qunar.tc.qtracer.instrument.AgentMain</Agent-Class>
                            <Can-Redefine-Classes>true</Can-Redefine-Classes>
                            <Can-Retransform-Classes>true</Can-Retransform-Classes>
                        </manifestEntries>
                    </archive>
                </configuration>
            </plugin>
        </plugins>
    </build>
```

### maven-assembly-plugin

```xml
<plugin>
    <artifactId>maven-assembly-plugin</artifactId>
    <configuration>
        <archive>
            <manifestEntries>
                <Premain-Class>**.**.InstrumentTest</Premain-Class>
                <Agent-Class>**.**..InstrumentTest</Agent-Class>
                <Can-Redefine-Classes>true</Can-Redefine-Classes>
                <Can-Retransform-Classes>true</Can-Retransform-Classes>
            </manifestEntries>
        </archive>
    </configuration>
</plugin>
```

# 参考链接

- [bash - How to specify -? option with GNU getopt - Unix & Linux Stack Exchange](https://unix.stackexchange.com/questions/15740/how-to-specify-option-with-gnu-getopt)
- [getopt(3): Parse options - Linux man page](https://linux.die.net/man/3/getopt)
- [VirtualMachine (Attach API )](https://docs.oracle.com/javase/7/docs/jdk/api/attach/spec/com/sun/tools/attach/VirtualMachine.html)
- [谈谈Java Intrumentation和相关应用 | Yilun Fan's Blog](http://www.fanyilun.me/2017/07/18/%E8%B0%88%E8%B0%88Java%20Intrumentation%E5%92%8C%E7%9B%B8%E5%85%B3%E5%BA%94%E7%94%A8/)
- [Grays Anatomy源码浅析--ClassLoader,Java,Method,DES,null,方法,INVOKING](http://www.bijishequ.com/detail/435931?p=29-55)
- [java.lang.instrument (Java Platform SE 8 )](https://docs.oracle.com/javase/8/docs/api/java/lang/instrument/package-summary.html)
- [Java SE 6 新特性: Instrumentation 新功能](https://www.ibm.com/developerworks/cn/java/j-lo-jse61/index.html)
- [JVM(TM) Tool Interface 1.2.1](https://docs.oracle.com/javase/7/docs/platform/jvmti/jvmti.html#writingAgents)
- [Learning JVMTI · GitBook](https://www.gitbook.com/book/sachin-handiekar/learning-jvmti/details)
- [JVM Attach机制实现 - 你假笨](http://lovestblog.cn/blog/2014/06/18/jvm-attach/)
- [Shell,信号量以及java进程的退出](https://www.slideshare.net/hongjiang/shelljava)
- [Java SE 6 新特性: JMX 与系统管理](https://www.ibm.com/developerworks/cn/java/j-lo-jse63/)