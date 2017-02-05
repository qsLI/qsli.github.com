---
title: xstream教程
toc: true
tags: xml
category: java
date: 2016-12-27 23:26:55
---

# 使用

![](http://x-stream.github.io/logo.gif)

## pom依赖

```xml
<!-- https://mvnrepository.com/artifact/com.thoughtworks.xstream/xstream -->
<dependency>
    <groupId>com.thoughtworks.xstream</groupId>
    <artifactId>xstream</artifactId>
    <version>1.3.1</version>
</dependency>
```

## 输出xml

### 手动配置

Author 类

```java
public class Author {

    private String name;

    public Author(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }
}
```

Entry 类

```java
public class Entry {

    private String title, description;

    public Entry(String title, String description) {
        this.title = title;
        this.description = description;
    }
}
```

Blog 类

```java
public class Blog {

    private Author writer;

    private List entries = new ArrayList();

    public Blog(Author writer) {
        this.writer = writer;
    }

    public void add(Entry entry) {
        entries.add(entry);
    }

    public List getContent() {
        return entries;
    }

    public static void main(String[] args) {
        Blog teamBlog = new Blog(new Author("qisheng.li"));
        teamBlog.add(new Entry("first", "first blog entry"));
        teamBlog.add(new Entry("second", "second blog entry"));

        XStream xStream = new XStream();
        System.out.println(xStream.toXML(teamBlog));        
    }
}
```

输出的内容为:

```xml
<com.air.xml.xstream.alias.Blog>
  <writer>
    <name>qisheng.li</name>
  </writer>
  <entries>
    <com.air.xml.xstream.alias.Entry>
      <title>first</title>
      <description>first blog entry</description>
    </com.air.xml.xstream.alias.Entry>
    <com.air.xml.xstream.alias.Entry>
      <title>second</title>
      <description>second blog entry</description>
    </com.air.xml.xstream.alias.Entry>
  </entries>
</com.air.xml.xstream.alias.Blog>
```
- *默认输出的类，是fully qualified name，可以手动设置别名*

```java
//alias
        xStream.alias("blog", Blog.class);
        xStream.alias("entry", Entry.class);
```

输出:

```xml
<blog>
  <writer>
    <name>qisheng.li</name>
  </writer>
  <entries>
    <entry>
      <title>first</title>
      <description>first blog entry</description>
    </entry>
    <entry>
      <title>second</title>
      <description>second blog entry</description>
    </entry>
  </entries>
</blog>
```

- *也可以设置属性级别的别名*

```java
xStream.aliasField("author", Blog.class, "writter");
```

输出：

```xml
<blog>
  <author>
    <name>qisheng.li</name>
  </author>
  <entries>
    <entry>
      <title>first</title>
      <description>first blog entry</description>
    </entry>
    <entry>
      <title>second</title>
      <description>second blog entry</description>
    </entry>
  </entries>
</blog>
```

- *包级别的别名*

```java
        xStream.aliasPackage("aliased.pachage.name", "com.air.xml.xstream.alias");
```

输出的xml:

```xml
<aliased.pachage.name.Blog author="qisheng.li">
  <entry>
    <title>first</title>
    <description>first blog entry</description>
  </entry>
  <entry>
    <title>second</title>
    <description>second blog entry</description>
  </entry>
</aliased.pachage.name.Blog>
```

#### Implicit Collections

> implicit collection: whenever you have a collection which doesn't need to display it's root tag, you can map it as an implicit collection.

如果不想展示一个集合的root节点，比如上述的`entries`，可以将其当做一个`implicit collection`

```java
    //implicit collection
    xStream.addImplicitCollection(Blog.class, "entries");
```

输出:

```xml
<blog>
  <author>
    <name>qisheng.li</name>
  </author>
  <entry>
    <title>first</title>
    <description>first blog entry</description>
  </entry>
  <entry>
    <title>second</title>
    <description>second blog entry</description>
  </entry>
</blog>
```

可以看到`entries`这个节点已经没有了

#### field输出为属性值

接着上面的例子，我们现在想让Blog的writer输出为Blog标签的属性值。

实现步骤：

1.创建一个转换器

```java
public class AuthorConverter  implements SingleValueConverter {

    @Override
    public String toString(Object obj) {
        return ((Author) obj).getName();
    }

    @Override
    public Object fromString(String str) {
        return new Author(str);
    }

    @Override
    public boolean canConvert(Class type) {
        return type.equals(Author.class);
    }
}
```

2.注册这个转换器

```java
xStream.registerConverter(new AuthorConverter());
```

3.告诉XStream

```java
//attribute aliasing
xStream.useAttributeFor(Blog.class, "writer");
xStream.registerConverter(new AuthorConverter());
//field alias
xStream.aliasField("author", Blog.class, "writer");
```

输出的xml：

```xml
<blog author="qisheng.li">
  <entry>
    <title>first</title>
    <description>first blog entry</description>
  </entry>
  <entry>
    <title>second</title>
    <description>second blog entry</description>
  </entry>
</blog>
```


### 基于注解

主要使用的是`XStreamAlias`注解来标记别名

```java
@XStreamAlias("message")
public class RendezvousMessage {

    @XStreamAlias("type")
    private int messageType;

    public RendezvousMessage(int messageType) {
        this.messageType = messageType;
    }

    public static void main(String[] args) {
        XStream xStream = new XStream();
        xStream.processAnnotations(RendezvousMessage.class);
        RendezvousMessage rendezvousMessage = new RendezvousMessage(12);
        System.out.println(xStream.toXML(rendezvousMessage));
    }
}

```

xml 输出

```xml
<message>
  <type>12</type>
</message>
```

- ImplicitCollection

使用 `@XstreamImplicit(itemFieldName = "xxx")`来处理

```java
    @XStreamImplicit(itemFieldName = "part")
    private List<String> content;
```

```xml
<message>
  <type>12</type>
  <part>first content</part>
  <part>second content</part>
</message>
```
- converter

添加一个属性字段并指明他使用的转换器, 和一个基本类型——boolean

```java
    @XStreamConverter(value=BooleanConverter.class)
    private boolean important;

    @XStreamConverter(SingleValueCalendarConverter.class)
    private Calendar created = new GregorianCalendar();
```

转化器代码

```java
public class SingleValueCalendarConverter implements Converter {
    @Override
    public void marshal(Object source, HierarchicalStreamWriter writer, MarshallingContext context) {
        Calendar calendar = (Calendar) source;
        writer.setValue(String.valueOf(calendar.getTime().getTime()));
    }

    @Override
    public Object unmarshal(HierarchicalStreamReader reader, UnmarshallingContext context) {
        GregorianCalendar calendar = new GregorianCalendar();
        calendar.setTime(new Date(Long.parseLong(reader.getValue())));
        return calendar;
    }

    @Override
    public boolean canConvert(Class type) {
        return type.equals(GregorianCalendar.class);
    }
}
```

输出的xml结果：

```xml
<message>
  <type>12</type>
  <part>first content</part>
  <part>second content</part>
  <important>false</important>
  <created>1482856467282</created>
</message>
```

- 属性

```java
    @XStreamAlias("type")
    @XStreamAsAttribute
    private int messageType;
```

输出结果

```xml
<message type="12">
  <part>first content</part>
  <part>second content</part>
  <important>false</important>
  <created>1482856554517</created>
</message>
```

- 忽略一些字段

```xml
<message type="12">
  <part>first content</part>
  <part>second content</part>
  <created>1482856661757</created>
</message>
```

`important` 属性已经被隐藏


#### 自动扫描注解

```java
xStream.autodetectAnnotations(true);
```

## xml转对象

 ```java
        RendezvousMessage deserializedMessage = (RendezvousMessage) xStream.fromXML("<message type=\"12\">\n" +
                "  <part>first content</part>\n" +
                "  <part>second content</part>\n" +
                "  <created>1482859234272</created>\n" +
                "</message>");
 ```
 
# 参考

1. [About XStream](http://x-stream.github.io/index.html)

2. [Alias Tutorial](http://x-stream.github.io/alias-tutorial.html)

3. [Annotations Tutorial](http://x-stream.github.io/annotations-tutorial.html)

