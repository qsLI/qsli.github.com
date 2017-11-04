title: 用electron开发自己的工具
tags: electron
category: fe
toc: true
date: 2017-09-10 16:14:12
---


## electron 简介

web是天生跨平台的。

前几年用ubuntu的时候，各种软件都没有相应的版本，十分的蛋疼。这几年随着web的发展，情况改善了许多。
比如说chrome的app， 安装好之后和原生的应用几乎没有区别，可以从ubuntu的dash里面搜索到，可以独立打开。

`electron`则是直接整一个微型的chrome，加上html写的界面，直接做客户端。也有类似`atom`， `visual source code`等大型应用也是使用`electron`构建的。

{% asset_img electron.jpg %}


## 简单的想法

之前在windows平台，使用的非常顺手的一个剪贴板增强工具——[Clibor – 来自日本的剪贴板辅助工具[Win] - 小众软件](http://www.appinn.com/clibor/)， 这个软件非常好用的一个功能就是支持`定型文`。所谓的`定型文`就是你事先录制好的一些常用的
条目，然后当你需要使用的时候，按快捷键呼出界面，选中想要的`定型文`，直接就给你复制到了剪贴板，十分的方便。

{% asset_img item.png %}


windows不爽的就是shell不好用， 虽然有`cygwin`,`babun`，`cmder`等还算不错的终端，但是用起来卡卡的，所以最终我还是迁移到了ubuntu，各种命令，各种爽。

但是，作为一个后端的开发，每天要上服务器上查各种问题，各种长长的命令，各种记不住，所以还是要有一个类似小抄试的工具来增强下工作效率。恰巧，上次在youtube上看electorn的一个视频——[Electron: Desktop Apps with Web Languages - GitHub Universe 2016 - YouTube](https://www.youtube.com/watch?v=FNHBfN8c32U)。这个视频大概介绍了electron，介绍了一些使用electron开发的有意思的应用， 恰巧我看到了一个叫做`mojibar`的简单应用。

{% asset_img mojibar.gif %}

她的这个应用是，搜索moji表情对应的文字， 然后会筛选出来相应的结果，然后复制到剪贴板上，支持快捷键呼出。看到这个就瞬间来了灵感，这和我要的小抄应用简直十分吻合。好在`electron`并不复杂，就研究了下代码自己改造了一番，于是就有了这篇文章。

## demo

这个demo基本可以在日常的工作中使用了， github的repo在——[qsLI/quake-select](https://github.com/qsLI/quake-select)

下面是界面的截图：

{% asset_img select.png %}

配置文件在json中，类似下面的形式：

```json
{
  "commands": [
    {
      "desc": "查看jvm堆的使用情况",
      "command": "sudo -u tomcat jmap -heap  `pgrep -f 'tomcat'`",
      "tag": "opt"
    },
    {
      "desc": "查看jvm最终加载的开关",
      "command": "java -XX:+PrintFlagsFinal -version",
      "tag": "opt"
    },
    {
      "desc": "",
      "command": "sudo -u tomcat jcmd `pgrep -f tomcat` VM.flags",
      "tag": "opt"
    },
    {
      "desc": "查看jvm加载的系统变量",
      "command": "sudo -u tomcat jcmd `pgrep -f tomcat` VM.system_properties",
      "tag": "opt"
    },
    {
      "desc": "查看本机jcmd支持的命令",
      "command": "sudo -u tomcat jcmd `pgrep -f tomcat` help",
      "tag": "opt"
    }
  ]
}

```

目前支持按照`command`和`tag`搜索， mojibar使用的这个库在ubuntu下菜单会显示不出来，以后有时间再fix。

## 参考

1. [Electron | Build cross platform desktop apps with JavaScript, HTML, and CSS.](https://electron.atom.io/)

2. [使用 Electron 构建桌面应用 - 知乎专栏](https://zhuanlan.zhihu.com/p/20225295)

3. [Clibor – 来自日本的剪贴板辅助工具[Win] - 小众软件](http://www.appinn.com/clibor/)

4. [Electron: Desktop Apps with Web Languages - GitHub Universe 2016 - YouTube](https://www.youtube.com/watch?v=FNHBfN8c32U)

5. [muan/mojibar: Emoji searcher but as a menubar app.](https://github.com/muan/mojibar)