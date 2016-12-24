title: Unicode历史
date: 2016-09-26 16:56:08
tags: 编码
category: base
---
# 字符编码

>字符编码（英语：Character encoding）、字集码是把字符集中的字符编码为指定集合中某一对象（例如：比特模式、自然数序列、8位组或者电脉冲），以便文本在计算机中存储和通过通信网络的传递。

简单的说，就是计算机只认`0`和`1`，于是在数据取出来的时候根据一个类似字典的东西，按照一定的规则将比特信息转换成对应的字符信息，这样人们才可以理解到底存储了什么。
## ASCII编码

`ASCII`（American Standard Code for Information Interchange） 编码是基于拉丁字母的一套编码系统。

`ASCII`使用指定的`7` 位或`8` 位二进制数组合来表示`128` 或`256` 种可能的字符。

> ASCII的局限在于只能显示26个基本拉丁字母、阿拉伯数目字和英式标点符号，因此只能用于显示现代美国英语（而且在处理英语当中的外来词如naïve、café、élite等等时，所有重音符号都不得不去掉，即使这样做会违反拼写规则）。而EASCII虽然解决了部分西欧语言的显示问题，但对更多其他语言依然无能为力。因此现在的软件系统大多采用Unicode。

后续有其扩展版本`EASCII`。这个扩展的版本虽然扩充了一些字符，增大了EASCII的表达能力，但是仍不能满足全球各个国家的需求。于是各个国家就自己搞了一套编码的规则，但是随着web的发展，越来越需要一套统一的编解码标准，于是Unicode应运而出。

## Unicode编码

![](Unicode_logo.jpg)

>Unicode provides a unique number for every character,

> no matter what the platform,

> no matter what the program,

> no matter what the language.

定义：

>Unicode（中文：万国码、国际码、统一码、单一码）是计算机科学领域里的一项业界标准。它对世界上大部分的文字系统进行了整理、编码，使得电脑可以用更为简单的方式来呈现和处理文字。

>In Unicode, a character is dened as the smallest component of a written language that has semantic value.
The number assigned to a character is called a **code point**. A code point is denoted by U+ following by a
hexadecimal number from 4 to 8 digits long. Most of the code points in use are 4 digits long. For example,
`U+03C6` is the code point for the Greek character f.

![](unicode-layout.jpg)

>在文字处理方面，统一码为每一个字符而非字形定义唯一的代码（即一个整数）。换句话说，统一码以一种抽象的方式（即数字）来处理字符，并将视觉上的演绎工作（例如字体大小、外观形状、字体形态、文体等）留给其他软件来处理，例如网页浏览器或是文字处理器。

### Java中判断是否是中文字符

>Java判断一个字符串是否有中文一般情况是利用Unicode编码(CJK统一汉字的编码区间：0x4e00–0x9fbb)的正则来做判断，但是其实这个区间来判断中文不是非常精确，因为有些中文的标点符号比如：，。等等是不能识别的。

具体的参见参考中的`Java 完美判断中文字符`


### 遗留的问题

>需要注意的是，Unicode只是一个符号集，它只规定了符号的二进制代码，却没有规定这个二进制代码应该如何存储。

存储中存在的问题：

1. 如何区分Unicode和ASCII码？

2. 如何存储能节省空间？


>它们造成的结果是：

>1）出现了Unicode的多种存储方式，也就是说有许多种不同的二进制格式，可以用来表示Unicode。

>2）Unicode在很长一段时间内无法推广，直到互联网的出现。

### CJK

>Q: What does the term "CJK" mean?

>A: It is a commonly used acronym for "Chinese, Japanese, and Korean". The term "CJK character" generally refers to "Chinese characters", or more specifically, the Chinese (= Han) ideographs used in the writing systems of the Chinese and Japanese languages, occasionally for Korean, and historically in Vietnam.

### UTF-8编码

>互联网的普及，强烈要求出现一种统一的编码方式。**UTF-8就是在互联网上使用最广的一种Unicode的实现方式。**其他实现方式还包括UTF-16（字符用两个字节或四个字节表示）和UTF-32（字符用四个字节表示），不过在互联网上基本不用。重复一遍，这里的关系是，UTF-8是Unicode的实现方式之一。

#### 8的含义
> unicode在很长一段时间内无法推广，直到互联网的出现，为解决unicode如何在网络上传输的问题，于是面向传输的众多 **UTF（UCS Transfer Format）标准出现了，顾名思义，UTF-8就是每次8个位传输数据，而UTF-16就是每次16个位。**UTF-8就是在互联网上使用最广的一种unicode的实现方式，这是为传输而设计的编码，并使编码无国界，这样就可以显示全世界上所有文化的字符了。

#### UTF-8和Unicode

> UTF-8最大的一个特点，就是它是一种变长的编码方式。它可以使用1~4个字节表示一个符号，根据不同的符号而变化字节长度，当字符在ASCII 码的范围时，就用一个字节表示，保留了ASCII字符一个字节的编码做为它的一部分，注意的是unicode一个中文字符占2个字节，而UTF-8一个中 文字符占3个字节）。从unicode到uft-8并不是直接的对应，而是要过一些算法和规则来转换。

### 编码方式

>UTF-8的编码规则很简单，只有二条：

>1）对于单字节的符号，字节的第一位设为0，后面7位为这个符号的unicode码。因此对于英语字母，UTF-8编码和ASCII码是相同的。

>2）对于n字节的符号（n>1），**第一个字节的前n位都设为1，第n+1位设为0，后面字节的前两位一律设为10**。剩下的没有提及的二进制位，全部为这个符号的unicode码。

所以如果第一个字节是`0`开头的，那么就是兼容ASCII码的单字节字符；如果第一个字节是`1`开头的就是多字节字符，数一数前面有多少个`1`，就知道这个字符占了几个字节。

所以UTF-8编码后的二进制形式应该如下：

```
0xxxxxxx 1个byte

110xxxxx 10xxxxxx 2个byte

1110xxxx 10xxxxxx 10xxxxxx 3个byte

11110xxx 10xxxxxx 10xxxxxx 10xxxxxx 4个byte

111110xx 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx 5个byte

111110x 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx 6个byte
```

> The bytes `0xFE(11111110)` and `0xFF(11111111)` are never used in the UTF-8 encoding.

这两个特殊的字节被用来标示是大端编码和小端编码


UTF-8编码的范围和Unicode对应的关系如下：

|总比特数 |Code Point占的位数  |范围|
|---|----|---|
| 1 | 7  | 00000000 - 0000007F |
| 2 | 11 | 00000080 - 000007FF |
| 3 | 16 | 00000800 - 0000FFFF |
| 4 | 21 | 00001000 - 001FFFFF |
| 5 | 26 | 00200000 - 03FFFFFF |
| 6 | 31 | 04000000 - FFFFFFFF |

编码示例：

`U+05E7 ` 使用`UTF-8`编码示例:

1. 查上表得知， `05E7`在 `0080 - 07FF` 范围内，总共占2个字节
应该是类似 `110xxxxx 10xxxxxx `

2. 将其写成二进制形式，`0000 0101 1110 0111`

3. 将数据替换上述的`x`，得到 `11010111 10100111 = 0xD7A7`

#### 字节序

UTF-8最多使用6个byte表示一个字符，于是就存在一个字节序的问题。
字节序分为两种：

1. **Little-Endian**:
 字节序低位在前  小尾 在操作系统上很常用，也是计算机系统上最常用的字节序
2. **Big-Endian**: 字节序高位在前 大尾  也称为网络字节序

```
16进制数字0x12345678，little-endian的存储为:  0x78 0x56 0x34 0x12     地址依次为100, 101, 102, 103

16进制数字0x12345678，big-endian的存储为:     0x12 0x34 0x56 0x78       地址依次为100, 101, 102, 103
```
>"endian"这个词出自《格列佛游记》。小人国的内战就源于吃鸡蛋时是究竟从大头(Big-Endian)敲开还是从小头(Little-Endian)敲开，由此曾发生过六次叛乱，其中一个皇帝送了命，另一个丢了王位。

#### 字节序用途
>Little-Endian最常用，大部分用户的操作系统（如windows, FreeBsd,Linux）是Little Endian的。

>Big-Endian最常用在网络协议上，例如TCP/IP协议使用的是big endian. 操作系统上如MAC OS ,是Big Endian 的。
本质上说，Little Endian还是Big Endian与操作系统和芯片类型都有关系。PowerPC系列采用big endian方式存储数据，x86系列则采用little endian方式存储数据。

```
Big Endian
   低地址                                           高地址
   ----------------------------------------->
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |     12     |      34    |     56      |     78    |
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

Little Endian
   低地址                                           高地址
   ----------------------------------------->
   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
   |     78     |      56    |     34      |     12    |
```

> Unicode规范中定义，每一个文件的最前面分别加入一个表示编码顺序的字符，这个字符的名字叫做"零宽度非换行空格"（ZERO WIDTH NO-BREAK SPACE），用FEFF表示。这正好是两个字节，而且FF比FE大1。
如果一个文本文件的头两个字节是FE FF，就表示该文件采用大头方式；如果头两个字节是FF FE，就表示该文件采用小头方式。

## emoji

![](emoji.jpg)

emoji表情采用的是 Unicode编码，Emoji就是一种在Unicode位于`\u1F601-\u1F64F`区段的字符。这个显然超过了目前常用的UTF-8字符集的编码范围`\u0000-\uFFFF`。

使用utf8mb4编码便可以解决上述的问题

## 宽字符

宽字符（Wide character） 是程序设计的术语。它是一个抽象的术语（没有规定具体实现细节），用以表示比8位字符还宽的数据类型。它不同于Unicode。

wchar_t在ANSI/ISO C中是一个数据类型，且某些其它的编程语言也用它来表示宽字符。

## 参考文章

1. [字符编码](https://zh.wikipedia.org/wiki/%E5%AD%97%E7%AC%A6%E7%BC%96%E7%A0%81)

2. [Unicode_and_Character_Sets.md](https://github.com/acmerfight/insight_python/blob/master/Unicode_and_Character_Sets.md)

3. [Unicode and UTF-8](http://www.compsci.hunter.cuny.edu/~sweiss/resources/Unicode.pdf)

4. [Java 完美判断中文字符](http://www.micmiu.com/lang/java/java-check-chinese/)

5. [Full Emoji Data, v3.0](http://unicode.org/emoji/charts/full-emoji-list.html)

6. [微信emoji表情编码](http://www.tuicool.com/articles/aQBVny)

7. [关于Big Endian 和 Little Endian](http://blog.csdn.net/sunshine1314/article/details/2309655)

8. [字符编码笔记：ASCII，Unicode和UTF-8](http://www.ruanyifeng.com/blog/2007/10/ascii_unicode_and_utf-8.html)
