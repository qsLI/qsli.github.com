---
title: mediawiki-plantuml
tags: plantuml
category: mediawiki
toc: true
typora-root-url: mediawiki-plantuml
typora-copy-images-to: mediawiki-plantuml
date: 2020-03-23 02:12:14
---



mediawiki的plantuml插件，在渲染中文的时候，发现文字丢了。

![WeChatWorkScreenshot_0e466b8c-c8f5-48c4-bcab-45db7ddbf597](/WeChatWorkScreenshot_0e466b8c-c8f5-48c4-bcab-45db7ddbf597.png)



方框里中文的说明都没有了，最后发现是缺少字体，这里mark下。

```bash
sudo yum install cjkuni-uming-fonts
```

安装完字体就好了:

![img](/uml-13d5bec9d5aa4740c2198be487d50707-b9db094fe17005d80a48cfc93309f835.png)