---
title: hexo迁移到ubuntu
toc: false
tags: hexo
category: hexo
abbrlink: 48430
---

系统切换到ubuntu之后，使用的apt安装的node，默认权限是sudo。安装hexo之后也必须以sudo身份执行。
需要修改下node的权限，命令如下：

```
➜  qsli.github.com (hexo|✚1…)  npm config get prefix
/usr/local
```
修改owner

```
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
```

修改owner之后就可以正常执行hexo了。

## 参考

1. [03 - Fixing npm permissions | npm Documentation](https://docs.npmjs.com/getting-started/fixing-npm-permissions)
