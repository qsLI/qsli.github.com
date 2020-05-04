title: 推荐-分享
date: 2017-01-02 00:49:53
toc: true
---

<style type="text/css">
    .post-title{
        border-top: none !important;
        background-color: #ffffff !important;
        text-align: center !important;
    }
</style>

# 前言

> If you have an apple and I have an apple and we exchange these apples then you and I will still each have one apple. But if you have an idea and I have an idea and we exchange these ideas, then each of us will have two ideas.

## python

- [Jupyter](http://jupyter.org/)
- [Anaconda](https://www.continuum.io/downloads)
- pip（豆瓣源）
- virtualenv

## shell

- [oh-my-zsh](https://github.com/robbyrussell/oh-my-zsh)
- [zsh-syntax-highlighting](https://github.com/zsh-users/zsh-syntax-highlighting)
- [zsh-git-prompt](https://github.com/olivierverdier/zsh-git-prompt)

![](https://github.com/olivierverdier/zsh-git-prompt/raw/master/screenshot.png)

### 命令行解析时间戳

[Most common Bash date commands for timestamping « The Intellectual Wilderness](https://zxq9.com/archives/795)


```shell
[qisheng.li@xxx]$ date +%s
1584868324

[qisheng.li@xxx]$ date -d @1584868324
Sun Mar 22 17:12:04 CST 2020
```

## editor

### [visual source code](https://code.visualstudio.com/)

#### 好用的插件

- Rest Client

文本模式的http请求， 比postman更加好用，idea的高级版本也支持，非常的方便

[REST Client - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)

```bash
### 注释
POST http://192.168.xxx.xx:8087/topic/getByPrimaryKeys HTTP/1.1
Content-Type: application/json;charset=UTF-8
appCode: appApi

[ 38, 40, 41, 27, 28, 29, 30, 46, 31 ]

### 注释
curl -x socks5h://localhost:1080 http://www.google.com/
```

此外还可以自动生成对应的各种语言的请求代码

## HomeBrew

![Homebrew Formulae logo](homebrew-256x256.png)

- 国内源

  替换及重置Homebrew默认源 [LUG@USTC]](https://lug.ustc.edu.cn/wiki/mirrors/help/brew.git)

  

- brew cask 用命令装带图形界面的软件

  [Homebrew/homebrew-cask: 🍻 A CLI workflow for the administration of macOS applications distributed as binaries](https://github.com/Homebrew/homebrew-cask)

  可以安装idea等

  ![Installing and uninstalling Atom (68747470733a2f2f692e696d6775722e636f6d2f626a723855785a2e676966.gif)](https://camo.githubusercontent.com/e0232f054269f4da8df572c3dea4f08def189df3/68747470733a2f2f692e696d6775722e636f6d2f626a723855785a2e676966)

## maven 

- aliyun maven

{% gist 47a98f1cbde1179f1fc6227734e4e2e8 %}