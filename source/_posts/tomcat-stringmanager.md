---
title: tomcat中的StringManager
tags: string-manager
category: tomcat
toc: true
abbrlink: 27008
date: 2017-02-06 00:45:02
---


tomcat中使用StringManager来管理错误提示信息，错误信息存储在`LocalStrings.properties`文件中，支持包级别的文件配置。


## StringManager

构造函数私有，通过静态方法`getManager`获取对应package的实例

```java

    private static final Hashtable<String, StringManager> managers =
            new Hashtable<>();

    /**
     * Get the StringManager for a particular package. If a manager for
     * a package already exists, it will be reused, else a new
     * StringManager will be created and returned.
     *
     * @param packageName The package name
     */
    public static final synchronized StringManager getManager(String packageName) {
        StringManager mgr = managers.get(packageName);
        if (mgr == null) {
            mgr = new StringManager(packageName);
            managers.put(packageName, mgr);
        }
        return mgr;
    }
```

## LocalStrings

本身支持国际化(i18n), LocalStrings.properties（英文）、LocalStrings_es.properties（西班牙语）、LocalStrings_ja.properties（日语）

文件示例：

```
contextBindings.unknownContext=Unknown context name : {0}
contextBindings.noContextBoundToThread=No naming context bound to this thread
contextBindings.noContextBoundToCL=No naming context bound to this class loader
selectorContext.noJavaUrl=This context must be accessed through a java: URL
selectorContext.methodUsingName=Call to method ''{0}'' with a Name of ''{1}''
```

## 参考

1. 《How tomcat works》