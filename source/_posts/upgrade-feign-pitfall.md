---
title: 升级feign版本遇到的坑
tags: feign
category: feign
toc: true
typora-root-url: 升级feign版本遇到的坑
typora-copy-images-to: 升级feign版本遇到的坑
date: 2020-07-26 01:13:41
---





## 现象

```bash
inner/user/checkLogin?ticket=af9fec70d1044ff8953bba62c5452fe6&system=CRM
{"code":10001,"message":"参数错误","result":null}
```

回滚

```bash
/inner/user/checkLogin?ticket=7377d3e51c8548ec9e1ec0ab6ecddc21&serviceTicket=&system=CRM
{"code":0,"message":null,"result":{"userInfo":null,"token":null,"userLogin":false,"serviceLogin":false,"noPermission":false}}
```

差别是正常的请求多了一个`&serviceTicket=`， 代码升级了feign的版本和httpclient的版本，肯定是这俩中的一个出问题了。

```java
//feign.template.QueryTemplate#create(java.lang.String, java.lang.Iterable<java.lang.String>, java.nio.charset.Charset, feign.CollectionFormat)
 public static QueryTemplate create(String name,
                                     Iterable<String> values,
                                     Charset charset,
                                     CollectionFormat collectionFormat) {
    if (name == null || name.isEmpty()) {
      throw new IllegalArgumentException("name is required.");
    }

    if (values == null) {
      throw new IllegalArgumentException("values are required");
    }

    /* remove all empty values from the array */
    // 问题在这里，直接给干掉了
    Collection<String> remaining = StreamSupport.stream(values.spliterator(), false)
        .filter(Util::isNotBlank)
        .collect(Collectors.toList());

    StringBuilder template = new StringBuilder();
    Iterator<String> iterator = remaining.iterator();
    while (iterator.hasNext()) {
      template.append(iterator.next());
      if (iterator.hasNext()) {
        template.append(",");
      }
    }

    return new QueryTemplate(template.toString(), name, remaining, charset, collectionFormat);
  }
```

虽然上面的写法也不太合常理，但是feign直接给干掉了也不太兼容。幸亏代码库里上面的写法少，直接改掉之后就ok了。

## 参考：

- [Empty query params shouldn't be filtered out in RequestTemplate · Issue #872 · OpenFeign/feign](https://github.com/OpenFeign/feign/issues/872)

  

