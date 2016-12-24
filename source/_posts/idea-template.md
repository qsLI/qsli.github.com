title: idea文件模板
tags: template
category: idea
toc: true

date: 2016-12-23 01:10:59
---


# 版权信息

代码前面一般都会有相应的版权信息，拿guava的代码为例

```java
/*
 * Copyright (C) 2007 The Guava Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.google.common.collect;

```

## idea自动生成版权信息

`File` > `Settings` > `Copyright` > `Copyright Profiles`

新建一个profile，填入如下的内容
```
/* * Copyright (c) $today.year xx.com. All Rights Reserved. */
```

`$today.year`代表当前的年

{%  asset_img   profiles.jpg  %}




新建java文件时就自动生成了版权信息：

```java
/*
 *  * Copyright (c) 2016 Qunar.com. All Rights Reserved. 
 */

package com.xxx.handler;
```


# 作者、日期、邮箱等

`File` > `Settings` > `File and Ocde Templates` > `Includes` > `File Header`

```java
#set( $email = "xx@xx.com")
#set( $author = "xxx")

/**
 * @author ${author}
 * @email ${email}
 * @date ${DATE} ${TIME}
 */

```

这个使用的`velocity`渲染的，可以参考`velocity`的语法

