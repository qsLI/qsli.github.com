---
title: mysql jdbc驱动参数性能调优
tags: java-connector
category: jdbc
toc: true
typora-root-url: jdbc-connector
typora-copy-images-to: jdbc-connector
date: 2020-05-03 08:46:01
---



## SSL对性能的影响

### 现象

我将驱动从

```xml
<dependency>
  <groupId>mysql</groupId>
  <artifactId>mysql-connector-java</artifactId>
  <version>5.1.6</version>
</dependency>
```

升级到：

```xml
<dependency>
  <groupId>mysql</groupId>
  <artifactId>mysql-connector-java</artifactId>
  <version>8.0.16</version>
</dependency>
```

同样的sql（for循环写库），执行时间从`18607`上升至`46000`, 时间翻了一倍还多。wireshark抓包之后发现，之后的包都不是mysql协议的（看不到具体内容了）：
![image-20200503084506187](/image-20200503084506187.png)

打开网络调试，`-Djavax.net.debug=all`，

```bash
 AA CB 5A 46 58 C1 55   BD DC 3F 8A 03 03 03 03  ...ZFX.U..?.....
main, WRITE: TLSv1.2 Application Data, length = 96
[Raw write]: length = 101
0000: 17 03 03 00 60 33 3D D6   C6 D6 59 F1 48 C5 07 BC  ....`3=...Y.H...
0010: BA 2C 95 88 C4 60 FC 83   5A CB B3 EA 52 C3 9C F6  .,...`..Z...R...
0020: 96 8B A4 85 01 EE 22 E5   4B 36 DD 26 87 46 F1 FD  ......".K6.&.F..
0030: E9 E9 42 DA 51 D7 96 10   F4 6D F5 FF 81 DE F0 5E  ..B.Q....m.....^
0040: 9D BE 8D 08 77 05 B7 A0   14 2F 38 AC 50 D8 DA E0  ....w..../8.P...
0050: D1 7C 0D B8 07 E2 8B 05   7C 8E 1E D5 71 FA 48 21  ............q.H!
0060: FC A5 FF 91 0F                                     .....
[Raw read]: length = 5
0000: 17 03 03 00 40                                     ....@
[Raw read]: length = 64
0000: 46 0D 04 E4 49 AE 5A DB   3C 0B 36 59 23 62 55 3C  F...I.Z.<.6Y#bU<
0010: B9 C0 AC A2 EF 04 28 51   28 0F C0 7C A8 37 58 0B  ......(Q(....7X.
0020: 1D 28 49 A1 41 CD 61 85   B7 7A A7 CA A9 8C 8B 3D  .(I.A.a..z.....=
0030: 5E 99 92 50 6E F2 23 86   1F 8F 1A 2F 6F 41 C7 BB  ^..Pn.#..../oA..
main, READ: TLSv1.2 Application Data, length = 64
Padded plaintext after DECRYPTION:  len = 64
0000: 44 F8 0A ED 84 81 F4 1B   6E 87 73 BA A1 67 71 95  D.......n.s..gq.
0010: 0A 00 00 01 00 01 FD 3C   B7 02 01 00 00 00 BA 36  .......<.......6
0020: 13 72 F5 7D 3A B7 11 69   F4 EE 87 38 FB A3 5A 29  .r..:..i...8..Z)
0030: 6B 7F A5 D3 59 E1 28 5C   B2 74 F8 E8 F4 9E 01 01  k...Y.(\.t......
Padded plaintext before ENCRYPTION:  len = 96
0000: 60 74 1B E8 4E D3 47 52   EA 95 B9 FC 26 11 DA 20  `t..N.GR....&.. 
0010: 28 00 00 00 03 69 6E 73   65 72 74 20 69 6E 74 6F  (....insert into
0020: 20 77 6F 72 64 73 20 28   77 6F 72 64 29 20 20 76   words (word)  v
0030: 61 6C 75 65 73 28 27 31   32 33 27 29 70 0D 4F 3B  alues('123')p.O;
0040: 1D C3 CF E4 79 19 7E 1C   CC 66 A3 26 1C 81 38 C5  ....y....f.&..8.
0050: 47 52 89 4C FC 0B C9 00   39 CD 3E A9 03 03 03 03  GR.L....9.>.....
main, WRITE: TLSv1.2 Application Data, length = 96
[Raw write]: length = 101
```

默认就把SSL打开了

> *For 8.0.13 and later:* As long as the server is correctly configured to use SSL, there is no need to configure anything on the Connector/J client to use encrypted connections.

### 原因

> Connector/J can encrypt all data communicated between the JDBC driver and the server (except for the initial handshake) using SSL. There is a **performance penalty** for enabling connection encryption, the severity of which depends on multiple factors including (but not limited to) the size of the query, the amount of data returned, the server hardware, the SSL library used, the network bandwidth, and so on.

这里有一个测试，[SSL Performance Overhead in MySQL](https://www.percona.com/blog/2013/10/10/mysql-ssl-performance-overhead/)，贴下对比：

![sysbench-throughput](/sysbench-throughput.png)

![sysbench-response-time](/sysbench-response-time.png)

![connection-throughput](/connection-throughput.png)

### 如何关闭：

> **useSSL**
>
> For 8.0.12 and earlier: Use SSL when communicating with the server (true/false), default is 'true' when connecting to MySQL 5.5.45+, 5.6.26+ or 5.7.6+, otherwise default is 'false'.
>
> For 8.0.13 and later: Default is 'true'. DEPRECATED. See sslMode property description for details.
>
> Default: true
>
> Since version: 3.0.2

useSSL设置为false之后，就关闭了加密，之前的sql时间也降到了`22541`

## useLocalSessionState



## 参考

- [SSL Performance Overhead in MySQL](https://www.percona.com/blog/2013/10/10/mysql-ssl-performance-overhead/)
- [MySQL :: MySQL Connector/J 8.0 Developer Guide :: 6.7 Connecting Securely Using SSL](https://dev.mysql.com/doc/connector-j/8.0/en/connector-j-reference-using-ssl.html)
- [MySQL :: MySQL Connector/J 8.0 Developer Guide :: 6.3 Configuration Properties](https://dev.mysql.com/doc/connector-j/8.0/en/connector-j-reference-configuration-properties.html)

