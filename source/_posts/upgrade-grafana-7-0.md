---
title: 升级到grafana7.0
tags: grafana
category: linux
toc: true
typora-root-url: upgrade-grafana-7-0
typora-copy-images-to: upgrade-grafana-7-0
date: 2020-05-28 13:55:04
---



最近grafana上有些报警没有报出来，而且旧的版本bug也比较多，今天看了下最新版本是7.0。升级之后发现图片渲染出了问题：

![image-20200528134401349](/image-20200528134401349.png)

翻了下官网的文档：

> Starting from Grafana v7.0.0, all PhantomJS support has been removed. Please use the Grafana Image Renderer plugin or remote rendering service.

> ## Breaking changes
>
> - **Removed PhantomJS**: PhantomJS was deprecated in [Grafana v6.4](https://grafana.com/docs/grafana/latest/guides/whats-new-in-v6-4/#phantomjs-deprecation) and starting from Grafana v7.0.0, all PhantomJS support has been removed. This means that Grafana no longer ships with a built-in image renderer, and we advise you to install the [Grafana Image Renderer plugin](https://grafana.com/grafana/plugins/grafana-image-renderer).

grafana已经废弃了phantomJS的支持，推荐使用` Grafana Image Renderer plugin`， 安装之后图片仍然没有渲染出来。打开渲染的debug日志：

```ini
[log]
# Either "console", "file", "syslog". Default is console and  file
# Use space to separate multiple modes, e.g. "console file"
;mode = console file

# Either "debug", "info", "warn", "error", "critical", default is "info"
;level = info

# optional settings to set different levels for specific loggers. Ex filters = sqlstore:debug
filters = rendering:debug
```

查看日志输出：

```bah
[qisheng.li@yd-devops-web grafana]$ tail -200f grafana.log | grep "render"
t=2020-05-28T13:25:12+0800 lvl=info msg="Request Completed" logger=context userId=0 orgId=0 uname= method=GET path=/public/img/attachments/rendering_plugin_not_installed.png status=302 remote_addr=127.0.0.1 time_ms=0 size=29 referer=
t=2020-05-28T13:25:13+0800 lvl=info msg="Request Completed" logger=context userId=0 orgId=0 uname= method=GET path=/public/img/attachments/rendering_plugin_not_installed.png status=302 remote_addr=127.0.0.1 time_ms=0 size=29 referer=
t=2020-05-28T13:25:14+0800 lvl=info msg="Request Completed" logger=context userId=0 orgId=0 uname= method=GET path=/public/img/attachments/rendering_plugin_not_installed.png status=302 remote_addr=127.0.0.1 time_ms=0 size=29 referer=
t=2020-05-28T13:25:16+0800 lvl=info msg="Request Completed" logger=context userId=0 orgId=0 uname= method=GET path=/public/img/attachments/rendering_plugin_not_installed.png status=302 remote_addr=127.0.0.1 time_ms=0 size=29 referer=
t=2020-05-28T13:25:17+0800 lvl=info msg="Request Completed" logger=context userId=0 orgId=0 uname= method=GET path=/public/img/attachments/rendering_plugin_not_installed.png status=302 remote_addr=127.0.0.1 time_ms=0 size=29 referer=
t=2020-05-28T13:25:19+0800 lvl=info msg="Request Completed" logger=context userId=0 orgId=0 uname= method=GET path=/public/img/attachments/rendering_plugin_not_installed.png status=302 remote_addr=127.0.0.1 time_ms=0 size=29 referer=
t=2020-05-28T13:25:20+0800 lvl=info msg="Request Completed" logger=context userId=0 orgId=0 uname= method=GET path=/public/img/attachments/rendering_plugin_not_installed.png status=302 remote_addr=127.0.0.1 time_ms=0 size=29 referer=
t=2020-05-28T13:25:22+0800 lvl=info msg="Request Completed" logger=context userId=0 orgId=0 uname= method=GET path=/public/img/attachments/rendering_plugin_not_installed.png status=302 remote_addr=127.0.0.1 time_ms=0 size=29 referer=
t=2020-05-28T13:25:31+0800 lvl=info msg=Rendering logger=rendering renderer=plugin path="d-solo/000000007/appapi-cduan-hou-duan?orgId=1&panelId=169"
t=2020-05-28T13:25:31+0800 lvl=dbug msg="Calling renderer plugin" logger=rendering renderer=plugin req="url:\"http://localhost:3000/d-solo/000000007/appapi-cduan-hou-duan?orgId=1&panelId=169&render=1\" width:1000 height:500 deviceScaleFactor:1 filePath:\"/var/lib/grafana/png/8vQ97TwPoIheP7612fWI.png\" renderKey:\"Lf95eHcZsqM109rj6Jt2Z7BrpPd5Pgz7\" domain:\"localhost\" timeout:15 "
t=2020-05-28T13:25:31+0800 lvl=eror msg="Render request failed" logger=plugins.backend pluginId=grafana-image-renderer url="http://localhost:3000/d-solo/000000007/appapi-cduan-hou-duan?orgId=1&panelId=169&render=1" error="Error: Failed to launch chrome!\n/var/lib/grafana/plugins/grafana-image-renderer/chrome-linux/chrome: error while loading shared libraries: libXcomposite.so.1: cannot open shared object file: No such file or directory\n\n\nTROUBLESHOOTING: https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md\n"
t=2020-05-28T13:25:31+0800 lvl=eror msg="Failed to render and upload alert panel image." logger=alerting.notifier ruleId=359 error="Rendering failed: Error: Failed to launch chrome!\n/var/lib/grafana/plugins/grafana-image-renderer/chrome-linux/chrome: error while loading shared libraries: libXcomposite.so.1: cannot open shared object file: No such file or directory\n\n\nTROUBLESHOOTING: https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md\n"
t=2020-05-28T13:25:52+0800 lvl=info msg="Request Completed" logger=context userId=0 orgId=0 uname= method=GET path=/public/img/attachments/rendering_plugin_not_installed.png status=302 remote_addr=127.0.0.1 time_ms=0 size=29 referer=
t=2020-05-28T13:25:52+0800 lvl=info msg="Request Completed" logger=context userId=0 orgId=0 uname= method=GET path=/public/img/attachments/rendering_plugin_not_installed.png status=302 remote_addr=127.0.0.1 time_ms=0 size=29 referer=
t=2020-05-28T13:26:08+0800 lvl=info msg=Rendering logger=rendering renderer=plugin path="d-solo/000000060/paycenter-zhi-fu-zhong-xin?orgId=1&panelId=19"
t=2020-05-28T13:26:08+0800 lvl=dbug msg="Calling renderer plugin" logger=rendering renderer=plugin req="url:\"http://localhost:3000/d-solo/000000060/paycenter-zhi-fu-zhong-xin?orgId=1&panelId=19&render=1\" width:1000 height:500 deviceScaleFactor:1 filePath:\"/var/lib/grafana/png/GpCvZ4Nnxx2WCJuFA8xb.png\" renderKey:\"ES6mxhCatZmmW3c7Hxo4l6DteEkTugoW\" domain:\"localhost\" timeout:15 "
t=2020-05-28T13:26:08+0800 lvl=eror msg="Render request failed" logger=plugins.backend pluginId=grafana-image-renderer url="http://localhost:3000/d-solo/000000060/paycenter-zhi-fu-zhong-xin?orgId=1&panelId=19&render=1" error="Error: Failed to launch chrome!\n/var/lib/grafana/plugins/grafana-image-renderer/chrome-linux/chrome: error while loading shared libraries: libXcomposite.so.1: cannot open shared object file: No such file or directory\n\n\nTROUBLESHOOTING: https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md\n"
t=2020-05-28T13:26:08+0800 lvl=eror msg="Failed to render and upload alert panel image." logger=alerting.notifier ruleId=379 error="Rendering failed: Error: Failed to launch chrome!\n/var/lib/grafana/plugins/grafana-image-renderer/chrome-linux/chrome: error while loading shared libraries: libXcomposite.so.1: cannot open shared object file: No such file or directory\n\n\nTROUBLESHOOTING: https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md\n"
t=2020-05-28T13:26:09+0800 lvl=info msg="Request Completed" logger=context userId=0 orgId=0 uname= method=GET path=/public/img/attachments/rendering_plugin_not_installed.png status=302 remote_addr=127.0.0.1 time_ms=0 size=29 referer=
t=2020-05-28T13:26:10+0800 lvl=info msg="Request Completed" logger=context userId=0 orgId=0 uname= method=GET path=/public/img/attachments/rendering_plugin_not_installed.png status=302 remote_addr=127.0.0.1 time_ms=0 size=29 referer=
t=2020-05-28T13:27:40+0800 lvl=info msg=Rendering logger=rendering renderer=plugin path="d-solo/000000060/paycenter-zhi-fu-zhong-xin?orgId=1&panelId=19"
t=2020-05-28T13:27:40+0800 lvl=dbug msg="Calling renderer plugin" logger=rendering renderer=plugin req="url:\"http://localhost:3000/d-solo/000000060/paycenter-zhi-fu-zhong-xin?orgId=1&panelId=19&render=1\" width:1000 height:500 deviceScaleFactor:1 filePath:\"/var/lib/grafana/png/LX8fSgQxPjq3dYJCqNCb.png\" renderKey:\"Dria3M9GEhOgGyc1e2qz6mOhEroc1VHv\" domain:\"localhost\" timeout:15 "
t=2020-05-28T13:27:40+0800 lvl=eror msg="Render request failed" logger=plugins.backend pluginId=grafana-image-renderer url="http://localhost:3000/d-solo/000000060/paycenter-zhi-fu-zhong-xin?orgId=1&panelId=19&render=1" error="Error: Failed to launch chrome!\n/var/lib/grafana/plugins/grafana-image-renderer/chrome-linux/chrome: error while loading shared libraries: libXcomposite.so.1: cannot open shared object file: No such file or directory\n\n\nTROUBLESHOOTING: https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md\n"
t=2020-05-28T13:27:40+0800 lvl=eror msg="Failed to render and upload alert panel image." logger=alerting.notifier ruleId=379 error="Rendering failed: Error: Failed to launch chrome!\n/var/lib/grafana/plugins/grafana-image-renderer/chrome-linux/chrome: error while loading shared libraries: libXcomposite.so.1: cannot open shared object file: No such file or directory\n\n\nTROUBLESHOOTING: https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md\n"
```

> Error: Failed to launch chrome!\n/var/lib/grafana/plugins/grafana-image-renderer/chrome-linux/chrome: error while loading shared libraries: libXcomposite.so.1: cannot open shared object file: No such file or directory\n\n\nTROUBLESHOOTING: https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md\n"

ldd查看依赖：

```bash
[qisheng.li@yd-devops-web grafana]$ ldd /var/lib/grafana/plugins/grafana-image-renderer/chrome-linux/chrome | grep "not found"
	libXcomposite.so.1 => not found
	libXcursor.so.1 => not found
	libXi.so.6 => not found
	libXtst.so.6 => not found
	libXss.so.1 => not found
	libXrandr.so.2 => not found
	libatk-1.0.so.0 => not found
	libatk-bridge-2.0.so.0 => not found
	libpangocairo-1.0.so.0 => not found
	libpango-1.0.so.0 => not found
	libatspi.so.0 => not found
	libgtk-3.so.0 => not found
	libgdk-3.so.0 => not found
	libgdk_pixbuf-2.0.so.0 => not found
```

缺了好多图形相关的包，装上就行了

```bash
yum -y install libatk-bridge* libXss* libgtk*
```

![image-20200528135213082](/image-20200528135213082.png)

## 参考

- [Grafana Image Renderer plugin for Grafana | Grafana Labs](https://grafana.com/grafana/plugins/grafana-image-renderer/installation)
- [Image rendering | Grafana Labs](https://grafana.com/docs/grafana/latest/administration/image_rendering/)
- [grafana安装grafana-image-renderer插件后使用IMAGE获取图片功能不成功_运维_火云邪神的博客-CSDN博客](https://blog.csdn.net/weixin_42320932/article/details/102937351)