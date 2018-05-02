title: cap
toc: true
tags:
category:
---

## 基础信息
### 查看网卡

```
➜  ~  ifconfig 
eno1      Link encap:Ethernet  HWaddr ec:f4:bb:48:fb:d0  
          UP BROADCAST MULTICAST  MTU:1500  Metric:1
          RX packets:0 errors:0 dropped:0 overruns:0 frame:0
          TX packets:0 errors:0 dropped:0 overruns:0 carrier:0
          collisions:0 txqueuelen:1000 
          RX bytes:0 (0.0 B)  TX bytes:0 (0.0 B)
          Interrupt:20 Memory:f7c00000-f7c20000 

lo        Link encap:Local Loopback  
          inet addr:127.0.0.1  Mask:255.0.0.0
          inet6 addr: ::1/128 Scope:Host
          UP LOOPBACK RUNNING  MTU:65536  Metric:1
          RX packets:20706 errors:0 dropped:0 overruns:0 frame:0
          TX packets:20706 errors:0 dropped:0 overruns:0 carrier:0
          collisions:0 txqueuelen:1 
          RX bytes:8737590 (8.7 MB)  TX bytes:8737590 (8.7 MB)

wlp2s0    Link encap:Ethernet  HWaddr 18:cf:5e:1f:c1:1b  
          inet addr:192.168.10.164  Bcast:192.168.10.255  Mask:255.255.255.0
          inet6 addr: fe80::cae2:9f28:a8ee:8308/64 Scope:Link
          UP BROADCAST RUNNING MULTICAST  MTU:1500  Metric:1
          RX packets:61081 errors:0 dropped:0 overruns:0 frame:0
          TX packets:45149 errors:0 dropped:0 overruns:0 carrier:0
          collisions:0 txqueuelen:1000 
          RX bytes:64271852 (64.2 MB)  TX bytes:7404597 (7.4 MB)
```

### 抓包

```
sudo tcpdump -i wlp2s0 -w test.cap
sudo tcpdump -i any   dst port 30000
```

## wireshark 分析

### wireshark 过滤


#### ip过滤
```
ip.src eq 10.175.168.182
ip.src == 182.254.78.160
```

#### 端口过滤

```
tcp.port == 80   // 不管端口是来源的还是目标的都显示
tcp.dstport == 80 // 只显tcp协议的目标端口80
tcp.srcport == 80 // 只显tcp协议的来源端口80
过滤端口范围
tcp.port >= 1 and tcp.port <= 80
```

#### 过滤协议

```
!arp
not arp
less than 小于 < lt 
```


#### http模式过滤
例子:
http.request.method == “GET”
http.request.method == “POST”
http.request.uri == “/img/logo-edu.gif”
http contains “GET”
http contains “HTTP/1.”
// GET包
http.request.method == “GET” && http contains “Host: “
http.request.method == “GET” && http contains “User-Agent: “
// POST包
http.request.method == “POST” && http contains “Host: “
http.request.method == “POST” && http contains “User-Agent: “
// 响应包
http contains “HTTP/1.1 200 OK” && http contains “Content-Type: “
http contains “HTTP/1.0 200 OK” && http contains “Content-Type: “
一定包含如下
Content-Type:


### tshark

wireshark的命令行版本

dump成格式化的文件
```
sudo tshark -T pdml

<packet>
  <proto name="geninfo" pos="0" showname="General information" size="62">
    <field name="num" pos="0" show="809" showname="Number" value="329" size="62"/>
    <field name="len" pos="0" show="62" showname="Frame Length" value="3e" size="62"/>
    <field name="caplen" pos="0" show="62" showname="Captured Length" value="3e" size="62"/>
    <field name="timestamp" pos="0" show="Jan 16, 2018 17:00:58.821155665 CST" showname="Captured Time" value="1516093258.821155665" size="62"/>
  </proto>
  <proto name="frame" showname="Frame 809: 62 bytes on wire (496 bits), 62 bytes captured (496 bits) on interface 0" size="62" pos="0">
    <field name="frame.interface_id" showname="Interface id: 0 (eno1)" size="0" pos="0" show="0"/>
    <field name="frame.encap_type" showname="Encapsulation type: Ethernet (1)" size="0" pos="0" show="1"/>
    <field name="frame.time" showname="Arrival Time: Jan 16, 2018 17:00:58.821155665 CST" size="0" pos="0" show="Jan 16, 2018 17:00:58.821155665 CST"/>
    <field name="frame.offset_shift" showname="Time shift for this packet: 0.000000000 seconds" size="0" pos="0" show="0.000000000"/>
    <field name="frame.time_epoch" showname="Epoch Time: 1516093258.821155665 seconds" size="0" pos="0" show="1516093258.821155665"/>
    <field name="frame.time_delta" showname="Time delta from previous captured frame: 0.141310248 seconds" size="0" pos="0" show="0.141310248"/>
    <field name="frame.time_delta_displayed" showname="Time delta from previous displayed frame: 0.141310248 seconds" size="0" pos="0" show="0.141310248"/>
    <field name="frame.time_relative" showname="Time since reference or first frame: 65.066083767 seconds" size="0" pos="0" show="65.066083767"/>
    <field name="frame.number" showname="Frame Number: 809" size="0" pos="0" show="809"/>
    <field name="frame.len" showname="Frame Length: 62 bytes (496 bits)" size="0" pos="0" show="62"/>
    <field name="frame.cap_len" showname="Capture Length: 62 bytes (496 bits)" size="0" pos="0" show="62"/>
    <field name="frame.marked" showname="Frame is marked: False" size="0" pos="0" show="0"/>
    <field name="frame.ignored" showname="Frame is ignored: False" size="0" pos="0" show="0"/>
    <field name="frame.protocols" showname="Protocols in frame: eth:ethertype:ip:udp:hsrp" size="0" pos="0" show="eth:ethertype:ip:udp:hsrp"/>
  </proto>
  <proto name="eth" showname="Ethernet II, Src: All-HSRP-routers_0f (00:00:0c:07:ac:0f), Dst: IPv4mcast_02 (01:00:5e:00:00:02)" size="14" pos="0">
    <field name="eth.dst" showname="Destination: IPv4mcast_02 (01:00:5e:00:00:02)" size="6" pos="0" show="01:00:5e:00:00:02" value="01005e000002">
      <field name="eth.dst_resolved" showname="Destination (resolved): IPv4mcast_02" hide="yes" size="6" pos="0" show="IPv4mcast_02" value="01005e000002"/>
      <field name="eth.addr" showname="Address: IPv4mcast_02 (01:00:5e:00:00:02)" size="6" pos="0" show="01:00:5e:00:00:02" value="01005e000002"/>
      <field name="eth.addr_resolved" showname="Address (resolved): IPv4mcast_02" hide="yes" size="6" pos="0" show="IPv4mcast_02" value="01005e000002"/>
      <field name="eth.lg" showname=".... ..0. .... .... .... .... = LG bit: Globally unique address (factory default)" size="3" pos="0" show="0" value="0" unmaskedvalue="01005e"/>
      <field name="eth.ig" showname=".... ...1 .... .... .... .... = IG bit: Group address (multicast/broadcast)" size="3" pos="0" show="1" value="1" unmaskedvalue="01005e"/>
    </field>
    <field name="eth.src" showname="Source: All-HSRP-routers_0f (00:00:0c:07:ac:0f)" size="6" pos="6" show="00:00:0c:07:ac:0f" value="00000c07ac0f">
      <field name="eth.src_resolved" showname="Source (resolved): All-HSRP-routers_0f" hide="yes" size="6" pos="6" show="All-HSRP-routers_0f" value="00000c07ac0f"/>
      <field name="eth.addr" showname="Address: All-HSRP-routers_0f (00:00:0c:07:ac:0f)" size="6" pos="6" show="00:00:0c:07:ac:0f" value="00000c07ac0f"/>
      <field name="eth.addr_resolved" showname="Address (resolved): All-HSRP-routers_0f" hide="yes" size="6" pos="6" show="All-HSRP-routers_0f" value="00000c07ac0f"/>
      <field name="eth.lg" showname=".... ..0. .... .... .... .... = LG bit: Globally unique address (factory default)" size="3" pos="6" show="0" value="0" unmaskedvalue="00000c"/>
      <field name="eth.ig" showname=".... ...0 .... .... .... .... = IG bit: Individual address (unicast)" size="3" pos="6" show="0" value="0" unmaskedvalue="00000c"/>
    </field>
    <field name="eth.type" showname="Type: IPv4 (0x0800)" size="2" pos="12" show="0x00000800" value="0800"/>
  </proto>
  <proto name="ip" showname="Internet Protocol Version 4, Src: 100.80.192.3, Dst: 224.0.0.2" size="20" pos="14">
    <field name="ip.version" showname="0100 .... = Version: 4" size="1" pos="14" show="4" value="4" unmaskedvalue="45"/>
    <field name="ip.hdr_len" showname=".... 0101 = Header Length: 20 bytes (5)" size="1" pos="14" show="20" value="45"/>
    <field name="ip.dsfield" showname="Differentiated Services Field: 0x00 (DSCP: CS0, ECN: Not-ECT)" size="1" pos="15" show="0x00000000" value="00">
      <field name="ip.dsfield.dscp" showname="0000 00.. = Differentiated Services Codepoint: Default (0)" size="1" pos="15" show="0" value="0" unmaskedvalue="00"/>
      <field name="ip.dsfield.ecn" showname=".... ..00 = Explicit Congestion Notification: Not ECN-Capable Transport (0)" size="1" pos="15" show="0" value="0" unmaskedvalue="00"/>
    </field>
    <field name="ip.len" showname="Total Length: 48" size="2" pos="16" show="48" value="0030"/>
    <field name="ip.id" showname="Identification: 0x0000 (0)" size="2" pos="18" show="0x00000000" value="0000"/>
    <field name="ip.flags" showname="Flags: 0x00" size="1" pos="20" show="0x00000000" value="00">
      <field name="ip.flags.rb" showname="0... .... = Reserved bit: Not set" size="1" pos="20" show="0" value="00"/>
      <field name="ip.flags.df" showname=".0.. .... = Don&#x27;t fragment: Not set" size="1" pos="20" show="0" value="00"/>
      <field name="ip.flags.mf" showname="..0. .... = More fragments: Not set" size="1" pos="20" show="0" value="00"/>
    </field>
    <field name="ip.frag_offset" showname="Fragment offset: 0" size="2" pos="20" show="0" value="0000"/>
    <field name="ip.ttl" showname="Time to live: 1" size="1" pos="22" show="1" value="01"/>
    <field name="ip.proto" showname="Protocol: UDP (17)" size="1" pos="23" show="17" value="11"/>
    <field name="ip.checksum" showname="Header checksum: 0xb567 [validation disabled]" size="2" pos="24" show="0x0000b567" value="b567"/>
    <field name="ip.checksum.status" showname="Header checksum status: Unverified" size="0" pos="24" show="2"/>
    <field name="ip.src" showname="Source: 100.80.192.3" size="4" pos="26" show="100.80.192.3" value="6450c003"/>
    <field name="ip.addr" showname="Source or Destination Address: 100.80.192.3" hide="yes" size="4" pos="26" show="100.80.192.3" value="6450c003"/>
    <field name="ip.src_host" showname="Source Host: 100.80.192.3" hide="yes" size="4" pos="26" show="100.80.192.3" value="6450c003"/>
    <field name="ip.host" showname="Source or Destination Host: 100.80.192.3" hide="yes" size="4" pos="26" show="100.80.192.3" value="6450c003"/>
    <field name="ip.dst" showname="Destination: 224.0.0.2" size="4" pos="30" show="224.0.0.2" value="e0000002"/>
    <field name="ip.addr" showname="Source or Destination Address: 224.0.0.2" hide="yes" size="4" pos="30" show="224.0.0.2" value="e0000002"/>
    <field name="ip.dst_host" showname="Destination Host: 224.0.0.2" hide="yes" size="4" pos="30" show="224.0.0.2" value="e0000002"/>
    <field name="ip.host" showname="Source or Destination Host: 224.0.0.2" hide="yes" size="4" pos="30" show="224.0.0.2" value="e0000002"/>
    <field name="" show="Source GeoIP: AS18403 The Corporation for Financing &amp; Promoting Technology" size="4" pos="26" value="6450c003">
      <field name="ip.geoip.src_asnum" showname="Source GeoIP AS Number: AS18403 The Corporation for Financing &amp; Promoting Technology" size="4" pos="26" show="AS18403 The Corporation for Financing &amp; Promoting Technology" value="6450c003"/>
      <field name="ip.geoip.asnum" showname="Source or Destination GeoIP AS Number: AS18403 The Corporation for Financing &amp; Promoting Technology" hide="yes" size="4" pos="26" show="AS18403 The Corporation for Financing &amp; Promoting Technology" value="6450c003"/>
    </field>
    <field name="" show="Destination GeoIP: Unknown" size="4" pos="30" value="e0000002"/>
  </proto>
  <proto name="udp" showname="User Datagram Protocol, Src Port: 1985, Dst Port: 1985" size="8" pos="34">
    <field name="udp.srcport" showname="Source Port: 1985" size="2" pos="34" show="1985" value="07c1"/>
    <field name="udp.dstport" showname="Destination Port: 1985" size="2" pos="36" show="1985" value="07c1"/>
    <field name="udp.port" showname="Source or Destination Port: 1985" hide="yes" size="2" pos="34" show="1985" value="07c1"/>
    <field name="udp.port" showname="Source or Destination Port: 1985" hide="yes" size="2" pos="36" show="1985" value="07c1"/>
    <field name="udp.length" showname="Length: 28" size="2" pos="38" show="28" value="001c"/>
    <field name="udp.checksum" showname="Checksum: 0x5825 [unverified]" size="2" pos="40" show="0x00005825" value="5825"/>
    <field name="udp.checksum.status" showname="Checksum Status: Unverified" size="0" pos="40" show="2"/>
    <field name="udp.stream" showname="Stream index: 2" size="0" pos="42" show="2"/>
  </proto>
  <proto name="hsrp" showname="Cisco Hot Standby Router Protocol" size="20" pos="42">
    <field name="hsrp.version" showname="Version: 0" size="1" pos="42" show="0" value="00"/>
    <field name="hsrp.opcode" showname="Op Code: Hello (0)" size="1" pos="43" show="0" value="00"/>
    <field name="hsrp.state" showname="State: Active (16)" size="1" pos="44" show="16" value="10"/>
    <field name="hsrp.hellotime" showname="Hellotime: Default (3)" size="1" pos="45" show="3" value="03"/>
    <field name="hsrp.holdtime" showname="Holdtime: Default (10)" size="1" pos="46" show="10" value="0a"/>
    <field name="hsrp.priority" showname="Priority: 150" size="1" pos="47" show="150" value="96"/>
    <field name="hsrp.group" showname="Group: 15" size="1" pos="48" show="15" value="0f"/>
    <field name="hsrp.reserved" showname="Reserved: 0" size="1" pos="49" show="0" value="00"/>
    <field name="hsrp.auth_data" showname="Authentication Data: Default (cisco)" size="8" pos="50" show="cisco" value="636973636f000000"/>
    <field name="hsrp.virt_ip" showname="Virtual IP Address: 100.80.192.1" size="4" pos="58" show="100.80.192.1" value="6450c001"/>
  </proto>
</packet>

```

输出指定的field

```
tshark -r cap-2018-01-16.cap   -T fields -E separator=,  -e frame.number -e ip.src -e ip.dst -e data.data
```

