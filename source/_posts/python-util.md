---
title: python 小技巧
tags: python-util
category: python
toc: true
abbrlink: 49451
date: 2016-12-18 11:57:35
---


## 开启一个简单的HTTP Server

- 命令：

`python -m SimpleHTTPServer port`

`-m` 是指后面跟的是python的一个Modlue

`port` 默认是`8080`，可以自行指定。

- 作用：

1. 可以当一个简单的httpserver，做测试用

2. 可以简单的传输一些小文件（大文件性能不好，经常中断）,大文件的传输可以用nc

见： {% post_link nc %}

## 简单的cig server

- 命令：
`python -m CGIHTTPServer port`

- 作用:

可以开启一个简单的cgi服务器，支持python作为cgi的语言，cgi的脚本须放置在root目录下的`cgi-bin`

## 格式化 json数据

- 命令:

`curl http://my_url/ | python -m json.tool`

- 作用:

在返回大量json数据时，在命令行里可以用这个工具进行格式化。

chrome浏览器中的`JsonView`插件可以做到同样的事情[chrome商店链接](https://chrome.google.com/webstore/detail/json-viewer/aimiinbnnkboelefkjlenlgimcabobli?utm_source=chrome-ntp-icon)

- 缺陷：

python 2.x 中是使用ASCII码作为默认编码的，因此json中如果带有中文就只是16进制的表示，可以修改`json.tool`的源代码。

参见[json处理小技巧](http://axiaoxin.com/article/77/)

> Python也有命令行里面格式化显示json的模块json.tool

> cat data.json
{"爱": "我", "中": "华"}
> cat data.json| python -m json.tool
{
    "\u4e2d": "\u534e",
    "\u7231": "\u6211"
}
好像有什么不对劲？因为json.tool在实现的时候ensure_ascii为True，让我们用Python来自己实现一个更好的Unix filter。

`filter.py`

```python
    import json
    import fileinput
    for l in fileinput.input():
        print(json.dumps(json.loads(l), ensure_ascii=False).encode('utf-8'))
```
只需要写上面那 4 行代码，就可以这样使用它：

> python filter.py data.json
{"爱": "我", "中": "华"}
> cat data.json| python filter.py
{"爱": "我", "中": "华"}

## 编码问题

python 2.x 默认使用的编码是ascii编码，中文总是出问题。

遇到乱码问题，一般使用如下的步骤即可解决:

1. python文件自身的编码

>     Python will default to ASCII as standard encoding if no other
    encoding hints are given.

    To define a source code encoding, a magic comment must
    be placed into the source files either as first or second
    line in the file, such as:

          # coding=<encoding name>

    or (using formats recognized by popular editors)

          #!/usr/bin/python
          # -*- coding: <encoding name> -*-

在文件头加上默认编码即可：

```python
          #!/usr/local/bin/python
          # coding: utf-8
          import os, sys
          ...
```

2. 重新设置系统模块的编码

```python
import sys
sys.setdefaultencoding('utf-8')
```

3. 使用Unicode

`s = u'中文'` 

## to be continued


# 参考

1. [Defining Python Source Code Encodings](https://www.python.org/dev/peps/pep-0263/)