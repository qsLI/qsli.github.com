---
title: 网络连接的各种timeout
toc: true
typora-root-url: timeout
typora-copy-images-to: timeout
tags: tcp
category: base
---

## TCP

### SERVER端DROP SYNC报文导致的重试

tcp sync 报文默认重试6次，每次等待的时间逐渐变长，最长等待 2^0 + 2^1 + 2^2 + 2^3 + 2^4 + 2^5 + 2^6 = 127 s

#### 测试步骤

iptables 添加规则，drop掉TCP的sync包

```bash
[qisheng.li@YD-Test-01 server]$ sudo iptables -A INPUT --protocol tcp --dport 7777 --syn -j DROP
```

简单启动一个server，监听7777端口：

```bash
[qisheng.li@YD-Test-01 server]$ nc -l 7777 &
```

tcpdump抓包，指定port 7777：

```bash
[qisheng.li@YD-Test-01 server]$ sudo tcpdump -i lo -Ss0 -n src 127.0.0.1 and dst 127.0.0.1 and port 7777
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on lo, link-type EN10MB (Ethernet), capture size 65535 bytes

19:36:44.372996 IP 127.0.0.1.51754 > 127.0.0.1.cbt: Flags [S], seq 1069437352, win 43690, options [mss 65495,sackOK,TS val 517451113 ecr 0,nop,wscale 7], length 0
19:36:45.375615 IP 127.0.0.1.51754 > 127.0.0.1.cbt: Flags [S], seq 1069437352, win 43690, options [mss 65495,sackOK,TS val 517452116 ecr 0,nop,wscale 7], length 0
19:36:47.379606 IP 127.0.0.1.51754 > 127.0.0.1.cbt: Flags [S], seq 1069437352, win 43690, options [mss 65495,sackOK,TS val 517454120 ecr 0,nop,wscale 7], length 0
19:36:51.387627 IP 127.0.0.1.51754 > 127.0.0.1.cbt: Flags [S], seq 1069437352, win 43690, options [mss 65495,sackOK,TS val 517458128 ecr 0,nop,wscale 7], length 0
19:36:59.403615 IP 127.0.0.1.51754 > 127.0.0.1.cbt: Flags [S], seq 1069437352, win 43690, options [mss 65495,sackOK,TS val 517466144 ecr 0,nop,wscale 7], length 0
19:37:15.435623 IP 127.0.0.1.51754 > 127.0.0.1.cbt: Flags [S], seq 1069437352, win 43690, options [mss 65495,sackOK,TS val 517482176 ecr 0,nop,wscale 7], length 0
19:37:47.499624 IP 127.0.0.1.51754 > 127.0.0.1.cbt: Flags [S], seq 1069437352, win 43690, options [mss 65495,sackOK,TS val 517514240 ecr 0,nop,wscale 7], length 0
```

客户端超时时间：

```bash
[qisheng.li@YD-Test-01 server]$ time telnet  localhost 7777
Trying 127.0.0.1...
telnet: connect to address 127.0.0.1: Connection timed out
Trying ::1...
telnet: connect to address ::1: Network is unreachable

real	2m7.257s
user	0m0.000s
sys	0m0.002s
```

做差得到重试的间隔， telnet总共请求了`2m7.257s`，从而可以倒推出最后一次等待的时间

| 时间            | 时间差              |
| --------------- | ------------------- |
| 19:36:44.372996 |                     |
| 19:36:45.375615 | 0:00:01.01 （1s）   |
| 19:36:47.379606 | 0:00:02.02 （2s）   |
| 19:36:51.387627 | 0:00:04.04 （4s）   |
| 19:36:59.403615 | 0:00:08.08 （8s）   |
| 19:37:15.435623 | 0:00:16.16 （16s)   |
| 19:37:47.499624 | 0:00:32.32 （32s）  |
|                 | 0:01:04.254 （64s） |

![](/tcp_timeout.png)

然后就超时了。

查看系统配置的超时重试次数：

```bash
[qisheng.li@YD-Test-01 server]$ sudo sysctl -a | grep tcp_syn_retries
net.ipv4.tcp_syn_retries = 6
```

带上第一次请求，正好七次跟我们的观测一致。

#### 恢复iptables

```bash
[qisheng.li@YD-Test-01 server]$ sudo iptables --list --line-numbers
Chain INPUT (policy ACCEPT)
num  target     prot opt source               destination
1    DROP       tcp  --  anywhere             anywhere             tcp dpt:cbt flags:FIN,SYN,RST,ACK/SYN

Chain FORWARD (policy ACCEPT)
num  target     prot opt source               destination

Chain OUTPUT (policy ACCEPT)
num  target     prot opt source               destination
```

删除对应的规则

```bash
[qisheng.li@YD-Test-01 server]$ sudo iptables -D INPUT 1
[qisheng.li@YD-Test-01 server]$ sudo iptables --list --line-numbers
Chain INPUT (policy ACCEPT)
num  target     prot opt source               destination

Chain FORWARD (policy ACCEPT)
num  target     prot opt source               destination

Chain OUTPUT (policy ACCEPT)
num  target     prot opt source               destination
```

再试下telnet就好了

```bash
[qisheng.li@YD-Test-01 server]$ time telnet  localhost 7777
Trying 127.0.0.1...
Connected to localhost.
Escape character is '^]'.
^]

telnet> quit
Connection closed.

real	0m3.745s
user	0m0.002s
sys	  0m0.001s
```

已经ok了。

### Client端drop掉Server的ack导致的重试

- Client（yd-test-01）： 
  - ip: 192.168.16.211
  - Iptables： `sudo iptables -A INPUT --protocol tcp --sport 7777  -j DROP`
- Server（yd-test-02）:
  - Ip: 192.168.16.213
  - Nc: `nc -l 7777`
  - Tcpdump: `sudo tcpdump -i eth0  -s0 -n   src port 7777 or dst port 7777`



client 端输出:

```bash
[qisheng.li@YD-Test-01 server]$ time telnet  192.168.16.213 7777
Trying 192.168.16.213...
telnet: connect to address 192.168.16.213: Connection timed out

real	2m7.335s
user	0m0.000s
sys	0m0.002s
```

server端抓包输出：

```bash
[qisheng.li@yd-test-02 server]$ sudo tcpdump -i eth0  -s0 -n   src port 7777 or dst port 7777
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), capture size 262144 bytes
13:41:44.455035 IP 192.168.16.211.49306 > 192.168.16.213.cbt: Flags [S], seq 3915399839, win 14600, options [mss 1460,sackOK,TS val 582551195 ecr 0,nop,wscale 7], length 0
13:41:44.455067 IP 192.168.16.213.cbt > 192.168.16.211.49306: Flags [S.], seq 369364050, ack 3915399840, win 28960, options [mss 1460,sackOK,TS val 582313766 ecr 582551195,nop,wscale 7], length 0
13:41:45.455290 IP 192.168.16.211.49306 > 192.168.16.213.cbt: Flags [S], seq 3915399839, win 14600, options [mss 1460,sackOK,TS val 582552196 ecr 0,nop,wscale 7], length 0
13:41:45.455324 IP 192.168.16.213.cbt > 192.168.16.211.49306: Flags [S.], seq 369364050, ack 3915399840, win 28960, options [mss 1460,sackOK,TS val 582314766 ecr 582551195,nop,wscale 7], length 0
13:41:46.657636 IP 192.168.16.213.cbt > 192.168.16.211.49306: Flags [S.], seq 369364050, ack 3915399840, win 28960, options [mss 1460,sackOK,TS val 582315969 ecr 582551195,nop,wscale 7], length 0
13:41:47.459272 IP 192.168.16.211.49306 > 192.168.16.213.cbt: Flags [S], seq 3915399839, win 14600, options [mss 1460,sackOK,TS val 582554200 ecr 0,nop,wscale 7], length 0
13:41:47.459297 IP 192.168.16.213.cbt > 192.168.16.211.49306: Flags [S.], seq 369364050, ack 3915399840, win 28960, options [mss 1460,sackOK,TS val 582316770 ecr 582551195,nop,wscale 7], length 0
13:41:49.857639 IP 192.168.16.213.cbt > 192.168.16.211.49306: Flags [S.], seq 369364050, ack 3915399840, win 28960, options [mss 1460,sackOK,TS val 582319169 ecr 582551195,nop,wscale 7], length 0
13:41:51.467283 IP 192.168.16.211.49306 > 192.168.16.213.cbt: Flags [S], seq 3915399839, win 14600, options [mss 1460,sackOK,TS val 582558208 ecr 0,nop,wscale 7], length 0
13:41:51.467331 IP 192.168.16.213.cbt > 192.168.16.211.49306: Flags [S.], seq 369364050, ack 3915399840, win 28960, options [mss 1460,sackOK,TS val 582320778 ecr 582551195,nop,wscale 7], length 0
13:41:59.483259 IP 192.168.16.211.49306 > 192.168.16.213.cbt: Flags [S], seq 3915399839, win 14600, options [mss 1460,sackOK,TS val 582566224 ecr 0,nop,wscale 7], length 0
13:41:59.483274 IP 192.168.16.213.cbt > 192.168.16.211.49306: Flags [S.], seq 604179795, ack 3915399840, win 28960, options [mss 1460,sackOK,TS val 582328794 ecr 582566224,nop,wscale 7], length 0
13:42:00.884639 IP 192.168.16.213.cbt > 192.168.16.211.49306: Flags [S.], seq 604179795, ack 3915399840, win 28960, options [mss 1460,sackOK,TS val 582330196 ecr 582566224,nop,wscale 7], length 0
13:42:03.084649 IP 192.168.16.213.cbt > 192.168.16.211.49306: Flags [S.], seq 604179795, ack 3915399840, win 28960, options [mss 1460,sackOK,TS val 582332396 ecr 582566224,nop,wscale 7], length 0
13:42:15.531272 IP 192.168.16.211.49306 > 192.168.16.213.cbt: Flags [S], seq 3915399839, win 14600, options [mss 1460,sackOK,TS val 582582272 ecr 0,nop,wscale 7], length 0
13:42:15.531300 IP 192.168.16.213.cbt > 192.168.16.211.49306: Flags [S.], seq 854930196, ack 3915399840, win 28960, options [mss 1460,sackOK,TS val 582344842 ecr 582582272,nop,wscale 7], length 0
13:42:16.932662 IP 192.168.16.213.cbt > 192.168.16.211.49306: Flags [S.], seq 854930196, ack 3915399840, win 28960, options [mss 1460,sackOK,TS val 582346244 ecr 582582272,nop,wscale 7], length 0
13:42:18.932641 IP 192.168.16.213.cbt > 192.168.16.211.49306: Flags [S.], seq 854930196, ack 3915399840, win 28960, options [mss 1460,sackOK,TS val 582348244 ecr 582582272,nop,wscale 7], length 0
13:42:47.595311 IP 192.168.16.211.49306 > 192.168.16.213.cbt: Flags [S], seq 3915399839, win 14600, options [mss 1460,sackOK,TS val 582614336 ecr 0,nop,wscale 7], length 0
13:42:47.595361 IP 192.168.16.213.cbt > 192.168.16.211.49306: Flags [S.], seq 1355930963, ack 3915399840, win 28960, options [mss 1460,sackOK,TS val 582376906 ecr 582614336,nop,wscale 7], length 0
13:42:48.796643 IP 192.168.16.213.cbt > 192.168.16.211.49306: Flags [S.], seq 1355930963, ack 3915399840, win 28960, options [mss 1460,sackOK,TS val 582378108 ecr 582614336,nop,wscale 7], length 0
13:42:50.996649 IP 192.168.16.213.cbt > 192.168.16.211.49306: Flags [S.], seq 1355930963, ack 3915399840, win 28960, options [mss 1460,sackOK,TS val 582380308 ecr 582614336,nop,wscale 7], length 0
```

#### 恢复iptables

别忘了把iptables里的规则删除！

### 不存在的ip和端口导致的重试

#### macos

```bash
➜  ~  ping  192.168.16.211
PING 192.168.16.211 (192.168.16.211): 56 data bytes
Request timeout for icmp_seq 0
Request timeout for icmp_seq 1
Request timeout for icmp_seq 2
Request timeout for icmp_seq 3
Request timeout for icmp_seq 4
^C
--- 192.168.16.211 ping statistics ---
6 packets transmitted, 0 packets received, 100.0% packet loss
➜  ~  time telnet 192.168.16.211 5555
Trying 192.168.16.211...
telnet: connect to address 192.168.16.211: Operation timed out
telnet: Unable to connect to remote host
telnet 192.168.16.211 5555  
0.02s user 
0.01s system 0% cpu 1:15.32 total
➜  ~  sudo sysctl -a | grep "keepinit"
net.inet.tcp.keepinit: 75000
```

等待了75s左右，和macOS系统的`net.inet.tcp.keepinit` 一致。抓包结果:

```bash
➜  ~  sudo tcpdump -i en0  -Ss0 -n   dst 192.168.16.211 and dst port 5555
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on en0, link-type EN10MB (Ethernet), capture size 262144 bytes
10:41:16.923029 IP 192.168.50.201.55232 > 192.168.16.211.5555: Flags [S], seq 752380292, win 65535, options [mss 1460,nop,wscale 6,nop,nop,TS val 222295538 ecr 0,sackOK,eol], length 0
10:41:17.971996 IP 192.168.50.201.55232 > 192.168.16.211.5555: Flags [S], seq 752380292, win 65535, options [mss 1460,nop,wscale 6,nop,nop,TS val 222296538 ecr 0,sackOK,eol], length 0
10:41:18.791837 IP 192.168.50.201.55232 > 192.168.16.211.5555: Flags [S], seq 752380292, win 65535, options [mss 1460,nop,wscale 6,nop,nop,TS val 222297538 ecr 0,sackOK,eol], length 0
10:41:19.763549 IP 192.168.50.201.55232 > 192.168.16.211.5555: Flags [S], seq 752380292, win 65535, options [mss 1460,nop,wscale 6,nop,nop,TS val 222298538 ecr 0,sackOK,eol], length 0
10:41:20.768079 IP 192.168.50.201.55232 > 192.168.16.211.5555: Flags [S], seq 752380292, win 65535, options [mss 1460,nop,wscale 6,nop,nop,TS val 222299538 ecr 0,sackOK,eol], length 0
10:41:21.771750 IP 192.168.50.201.55232 > 192.168.16.211.5555: Flags [S], seq 752380292, win 65535, options [mss 1460,nop,wscale 6,nop,nop,TS val 222300538 ecr 0,sackOK,eol], length 0
10:41:23.778444 IP 192.168.50.201.55232 > 192.168.16.211.5555: Flags [S], seq 752380292, win 65535, options [mss 1460,nop,wscale 6,nop,nop,TS val 222302538 ecr 0,sackOK,eol], length 0
10:41:27.805634 IP 192.168.50.201.55232 > 192.168.16.211.5555: Flags [S], seq 752380292, win 65535, options [mss 1460,nop,wscale 6,nop,nop,TS val 222306539 ecr 0,sackOK,eol], length 0
10:41:35.813752 IP 192.168.50.201.55232 > 192.168.16.211.5555: Flags [S], seq 752380292, win 65535, options [mss 1460,nop,wscale 6,nop,nop,TS val 222314539 ecr 0,sackOK,eol], length 0
10:41:51.834655 IP 192.168.50.201.55232 > 192.168.16.211.5555: Flags [S], seq 752380292, win 65535, options [mss 1460,nop,wscale 6,nop,nop,TS val 222330539 ecr 0,sackOK,eol], length 0
10:42:24.010187 IP 192.168.50.201.55232 > 192.168.16.211.5555: Flags [S], seq 752380292, win 65535, options [mss 1460,sackOK,eol], length 0
```

**等待的时间和重试的间隔和上面的结论完全不同，吓得我赶紧在centos上测试了下。**

#### centos

但是在`centos`上，测试的结果如下：

```bash
[qisheng.li@YD-Test-01 server]$ ping 192.168.50.201
PING 192.168.50.201 (192.168.50.201) 56(84) bytes of data.
^C
--- 192.168.50.201 ping statistics ---
9 packets transmitted, 0 received, 100% packet loss, time 7999ms
[qisheng.li@YD-Test-01 server]$ time telnet 192.168.50.201 5555
Trying 192.168.50.201...
telnet: connect to address 192.168.50.201: Connection timed out

real	2m7.233s
user	0m0.002s
sys		0m0.000s
```

等待了大约`127`s，跟系统配置的重试次数产生的时间吻合。tcpdump的结果：

```bash
[qisheng.li@YD-Test-01 server]$  sudo tcpdump -i en0  -Ss0 -n   dst 192.168.50.201 and dst port 5555
tcpdump: en0: No such device exists
(SIOCGIFHWADDR: No such device)
[qisheng.li@YD-Test-01 server]$  sudo tcpdump -i eth0  -Ss0 -n   dst 192.168.50.201 and dst port 5555
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), capture size 65535 bytes


11:54:22.718506 IP 192.168.16.211.41402 > 192.168.50.201.personal-agent: Flags [S], seq 3156762544, win 14600, options [mss 1460,sackOK,TS val 576109458 ecr 0,nop,wscale 7], length 0
11:54:23.719607 IP 192.168.16.211.41402 > 192.168.50.201.personal-agent: Flags [S], seq 3156762544, win 14600, options [mss 1460,sackOK,TS val 576110460 ecr 0,nop,wscale 7], length 0
11:54:25.723609 IP 192.168.16.211.41402 > 192.168.50.201.personal-agent: Flags [S], seq 3156762544, win 14600, options [mss 1460,sackOK,TS val 576112464 ecr 0,nop,wscale 7], length 0
11:54:29.731610 IP 192.168.16.211.41402 > 192.168.50.201.personal-agent: Flags [S], seq 3156762544, win 14600, options [mss 1460,sackOK,TS val 576116472 ecr 0,nop,wscale 7], length 0
11:54:37.739615 IP 192.168.16.211.41402 > 192.168.50.201.personal-agent: Flags [S], seq 3156762544, win 14600, options [mss 1460,sackOK,TS val 576124480 ecr 0,nop,wscale 7], length 0
11:54:53.771611 IP 192.168.16.211.41402 > 192.168.50.201.personal-agent: Flags [S], seq 3156762544, win 14600, options [mss 1460,sackOK,TS val 576140512 ecr 0,nop,wscale 7], length 0
11:55:25.803619 IP 192.168.16.211.41402 > 192.168.50.201.personal-agent: Flags [S], seq 3156762544, win 14600, options [mss 1460,sackOK,TS val 576172544 ecr 0,nop,wscale 7], length 0
```

可以发现两个系统的实现上还是有略微的差异的。

## java的connection timeout

### 不设置超时

```java
@Test
@SneakyThrows
public void testReadTimeout() {
  final long start = System.currentTimeMillis();
  try (Socket socket = new Socket()) {
    PrintWriter printWriter = null;
    socket.connect(new InetSocketAddress("192.168.16.211", 5555));
    final OutputStream outputStream = socket.getOutputStream();
    final BufferedOutputStream bufferedOutputStream = new BufferedOutputStream(outputStream);
    printWriter = new PrintWriter(bufferedOutputStream);
    printWriter.print("Hello world");
    System.out.println("socket = " + socket);
  } finally {
    System.out.println("System.currentTimeMillis() - start = " + (System.currentTimeMillis() - start));
  }

}
```

访问一个没有被监听的端口`5555`，经过一段时间之后，抛出异常：

```bash
System.currentTimeMillis() - start = 75226

java.net.ConnectException: Operation timed out (Connection timed out)

	at java.net.PlainSocketImpl.socketConnect(Native Method)
	at java.net.AbstractPlainSocketImpl.doConnect(AbstractPlainSocketImpl.java:350)
	at java.net.AbstractPlainSocketImpl.connectToAddress(AbstractPlainSocketImpl.java:206)
	at java.net.AbstractPlainSocketImpl.connect(AbstractPlainSocketImpl.java:188)
	at java.net.SocksSocketImpl.connect(SocksSocketImpl.java:392)
	at java.net.Socket.connect(Socket.java:589)
	at java.net.Socket.connect(Socket.java:538)
	at com.air.lang.net.socket.SocketTest.testReadTimeout(SocketTest.java:27)
	at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
	at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.lang.reflect.Method.invoke(Method.java:498)
```

大约75s之后，操作超时了，这与macos系统默认的socket超时是一致的：

> net.inet.tcp.keepinit = timeout for establishing syn

```bash
➜  ~  sudo sysctl -a  | grep "net.inet.tcp.keepinit"
net.inet.tcp.keepinit: 75000
```

修改这个值为`33000`

```bash
➜  ~  sudo sysctl -w net.inet.tcp.keepinit=33000
Password:
net.inet.tcp.keepinit: 75000 -> 33000
```

重新跑上面的代码：

```bash
System.currentTimeMillis() - start = 33117

java.net.ConnectException: Operation timed out (Connection timed out)

	at java.net.PlainSocketImpl.socketConnect(Native Method)
	at java.net.AbstractPlainSocketImpl.doConnect(AbstractPlainSocketImpl.java:350)
	at java.net.AbstractPlainSocketImpl.connectToAddress(AbstractPlainSocketImpl.java:206)
	at java.net.AbstractPlainSocketImpl.connect(AbstractPlainSocketImpl.java:188)
	at java.net.SocksSocketImpl.connect(SocksSocketImpl.java:392)
	at java.net.Socket.connect(Socket.java:589)
	at java.net.Socket.connect(Socket.java:538)
	at com.air.lang.net.socket.SocketTest.testReadTimeout(SocketTest.java:66)
	at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
	at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.lang.reflect.Method.invoke(Method.java:498)
```

**结论：超时时间也变了，所以没有设置超时的时候用的就是os level的超时时间。**



### 设置超时时间

```java
@Test
@SneakyThrows
public void testReadTimeout() {
  final long start = System.currentTimeMillis();
  try (Socket socket = new Socket()) {
    PrintWriter printWriter = null;
    socket.connect(new InetSocketAddress("192.168.16.211", 5555), 35000);
    final OutputStream outputStream = socket.getOutputStream();
    final BufferedOutputStream bufferedOutputStream = new BufferedOutputStream(outputStream);
    printWriter = new PrintWriter(bufferedOutputStream);
    printWriter.print("Hello world");
    System.out.println("socket = " + socket);
  } finally {
    System.out.println("System.currentTimeMillis() - start = " + (System.currentTimeMillis() - start));
  }

}
```

**代码的超时设置为`35000`毫秒，系统超时`33000`毫秒得到的结果，大概33秒之后就超时了：**

```bash
System.currentTimeMillis() - start = 33271

java.net.ConnectException: Operation timed out (Connection timed out)

	at java.net.PlainSocketImpl.socketConnect(Native Method)
	at java.net.AbstractPlainSocketImpl.doConnect(AbstractPlainSocketImpl.java:350)
	at java.net.AbstractPlainSocketImpl.connectToAddress(AbstractPlainSocketImpl.java:206)
	at java.net.AbstractPlainSocketImpl.connect(AbstractPlainSocketImpl.java:188)
	at java.net.SocksSocketImpl.connect(SocksSocketImpl.java:392)
	at java.net.Socket.connect(Socket.java:589)
	at com.air.lang.net.socket.SocketTest.testReadTimeout(SocketTest.java:84)
```

修改代码超时为`30000`毫秒，小于系统默认的`33000`毫秒，得到的输出：

```bash
System.currentTimeMillis() - start = 30005

java.net.SocketTimeoutException: connect timed out

	at java.net.PlainSocketImpl.socketConnect(Native Method)
	at java.net.AbstractPlainSocketImpl.doConnect(AbstractPlainSocketImpl.java:350)
	at java.net.AbstractPlainSocketImpl.connectToAddress(AbstractPlainSocketImpl.java:206)
	at java.net.AbstractPlainSocketImpl.connect(AbstractPlainSocketImpl.java:188)
	at java.net.SocksSocketImpl.connect(SocksSocketImpl.java:392)
	at java.net.Socket.connect(Socket.java:589)
	at com.air.lang.net.socket.SocketTest.testReadTimeout(SocketTest.java:84)
	at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
	at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.lang.reflect.Method.invoke(Method.java:498)
```

30秒左右就超时了，说明设置生效。

**结论：代码里设置的连接超时，大于系统的默认超时是没有用的，系统会先抛出异常；**

​		**小于系统的超时是可以生效的。**

### 实现一瞥

![img](/bO_12e9048Rl-nJJHUfGU9OI8lPWH0Xhvq6s4RR6NS4rwktJagWyb9TX6FxvFdwHScwiSlfCFYahNcY0UGo3QmJR_9BZgHkMF7u5i7wi6sSjQI-6q9R9nZPNrEngwdXxcM6VdtfJaciyB5SGpiH7iFjKjzfJYUiqYK2FLAIE-SMF8OGW05FO8nLmK1ALtCbD1Z-aLGlvswY8tplrpibewPCZxW00.png)



## 参考

- [Linux 建立 TCP 连接的超时时间分析](http://www.chengweiyang.cn/2017/02/18/linux-connect-timeout/)
- [浅谈Java中的TCP超时 | 程序员，川流不息](https://hoswey.github.io/2019/07/23/%E6%B5%85%E8%B0%88Java%E4%B8%AD%E7%9A%84TCP%E8%B6%85%E6%97%B6/)
- [从linux源码看socket(tcp)的timeout - 云+社区 - 腾讯云](https://cloud.tencent.com/developer/article/1574588)

