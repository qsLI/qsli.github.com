title: Base64编码原理
date: 2016-09-26 14:37:33
tags: 编码
category: base
toc: true

---

## 是什么？

> Base64 is a group of similar binary-to-text encoding schemes that represent binary data in an ASCII string format by translating it into a radix-64 representation. The term Base64 originates from a specific MIME content transfer encoding
来自 [wikipedia](https://en.wikipedia.org/wiki/Base64)

说白了就是将二进制的数据转换成字符编码。Base64由大小写字母各26个，`0-9`的10个数字，加号`+`
以及斜杠`/`，一共64个字符组成，另外还用`=`来用作后缀，总共涉及的字符达到65个。

> a）所有的二进制文件，都可以因此转化为可打印的文本编码，使用文本软件进行编辑；

> b）能够对文本进行简单的加密。

> 来自 [Base64笔记-阮一峰](http://www.ruanyifeng.com/blog/2008/06/base64.html)

## 原理
{%  asset_img   encoding.jpg  %}




>转换的时候，将三个byte的数据，先后放入一个24bit的缓冲区中，先来的byte占高位。数据不足3byte的话，于缓冲器中剩下的bit用0补足。然后，每次取出6（因为26=64）个bit，按照其值选择ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/中的字符作为编码后的输出。不断进行，直到全部输入数据转换完成。

> <https://zh.wikipedia.org/wiki/Base64>

如果要编码的字节数不能被3整除:

  1. 先使用0字节值在末尾补足，使其能够被3整除
  2. 进行base64的编码
  3. 在编码后的base64文本后加上一个或两个'='号，代表补足的字节数

  {%  asset_img   encoding2.jpg  %}




  Base64字符串只可能最后出现一个或两个"="，中间是不可能出现"="的

## 用途

>Base64 主要不是加密，它主要的用途是把一些二进制数转成普通字符用于网络传输。由于一些二进制字符在传输协议中属于控制字符，不能直接传送需要转换一下。Base64编码就是把二进制字节序列转化为ASCII字符序列。一般增加1/3长度，而且也是不可读的。

>[BASE64编码原理及应用](http://nieyong.github.io/wiki_web/BASE64%E7%BC%96%E7%A0%81%E5%8E%9F%E7%90%86%E5%8F%8A%E5%BA%94%E7%94%A8.html)

>Base64常用于在通常处理文本数据的场合，表示、传输、存储一些二进制数据。包括MIME的email、在XML中存储复杂数据。

> <https://zh.wikipedia.org/wiki/Base64>

## python中简单使用

``` python
>>> import base64
>>> encoded = base64.b64encode('hello world')
>>> print encoded
aGVsbG8gd29ybGQ=
>>> data = base64.b64decode(encoded)
>>> print data
hello world
```

[base64 — RFC 3548: Base16, Base32, Base64 Data Encodings](https://docs.python.org/2/library/base64.html)

## 参考链接

1. [Base64笔记_阮一峰](http://www.ruanyifeng.com/blog/2008/06/base64.html)

2. [Base64_wiki](https://en.wikipedia.org/wiki/Base64)

3. [BASE64编码原理及应用](http://nieyong.github.io/wiki_web/BASE64%E7%BC%96%E7%A0%81%E5%8E%9F%E7%90%86%E5%8F%8A%E5%BA%94%E7%94%A8.html)

4. [Base64加密](https://github.com/CharonChui/AndroidNote/blob/master/Java%E5%9F%BA%E7%A1%80/Base64%E5%8A%A0%E5%AF%86.md)
