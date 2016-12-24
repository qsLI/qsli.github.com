title: spring-resource源码剖析
date: 2016-11-20 20:12:14
tags: resource
category: spring
toc: true

---


# Spring Resource

## Why not Java URL类

原因： 对底层资源的支持不足。

1. there is no standardized URL implementation that may be used to access a resource that needs to be obtained from the classpath,or relative to a ServletContext.

2. 不自定义URL handler的原因：

  a. 过于复杂
  b. lack some desirable functionality（如对URL所指资源是否存在的判断）


## Resource 接口

```java

public interface InputStreamSource {

	/**
	 * Return an {@link InputStream}.
	 * <p>It is expected that each call creates a <i>fresh</i> stream.
	 * <p>This requirement is particularly important when you consider an API such
	 * as JavaMail, which needs to be able to read the stream multiple times when
	 * creating mail attachments. For such a use case, it is <i>required</i>
	 * that each {@code getInputStream()} call returns a fresh stream.
	 * @return the input stream for the underlying resource (must not be {@code null})
	 * @throws IOException if the stream could not be opened
	 * @see org.springframework.mail.javamail.MimeMessageHelper#addAttachment(String, InputStreamSource)
	 */
	InputStream getInputStream() throws IOException;

}



public interface Resource extends InputStreamSource {

	/**
	 * Return whether this resource actually exists in physical form.
	 * <p>This method performs a definitive existence check, whereas the
	 * existence of a {@code Resource} handle only guarantees a
	 * valid descriptor handle.
	 */
	boolean exists();

	/**
	 * Return whether the contents of this resource can be read,
	 * e.g. via {@link #getInputStream()} or {@link #getFile()}.
	 * <p>Will be {@code true} for typical resource descriptors;
	 * note that actual content reading may still fail when attempted.
	 * However, a value of {@code false} is a definitive indication
	 * that the resource content cannot be read.
	 * @see #getInputStream()
	 */
	boolean isReadable();

	/**
	 * Return whether this resource represents a handle with an open
	 * stream. If true, the InputStream cannot be read multiple times,
	 * and must be read and closed to avoid resource leaks.
	 * <p>Will be {@code false} for typical resource descriptors.
	 */
	boolean isOpen();

	/**
	 * Return a URL handle for this resource.
	 * @throws IOException if the resource cannot be resolved as URL,
	 * i.e. if the resource is not available as descriptor
	 */
	URL getURL() throws IOException;

	/**
	 * Return a URI handle for this resource.
	 * @throws IOException if the resource cannot be resolved as URI,
	 * i.e. if the resource is not available as descriptor
	 */
	URI getURI() throws IOException;

	/**
	 * Return a File handle for this resource.
	 * @throws IOException if the resource cannot be resolved as absolute
	 * file path, i.e. if the resource is not available in a file system
	 */
	File getFile() throws IOException;

	/**
	 * Determine the content length for this resource.
	 * @throws IOException if the resource cannot be resolved
	 * (in the file system or as some other known physical resource type)
	 */
	long contentLength() throws IOException;

	/**
	 * Determine the last-modified timestamp for this resource.
	 * @throws IOException if the resource cannot be resolved
	 * (in the file system or as some other known physical resource type)
	 */
	long lastModified() throws IOException;

	/**
	 * Create a resource relative to this resource.
	 * @param relativePath the relative path (relative to this resource)
	 * @return the resource handle for the relative resource
	 * @throws IOException if the relative resource cannot be determined
	 */
	Resource createRelative(String relativePath) throws IOException;

	/**
	 * Determine a filename for this resource, i.e. typically the last
	 * part of the path: for example, "myfile.txt".
	 * <p>Returns {@code null} if this type of resource does not
	 * have a filename.
	 */
	String getFilename();

	/**
	 * Return a description for this resource,
	 * to be used for error output when working with the resource.
	 * <p>Implementations are also encouraged to return this value
	 * from their {@code toString} method.
	 * @see Object#toString()
	 */
	String getDescription();

}
```
### 继承体系

{%  asset_img   resource.jpg  %}




## ResourceLoader

```java
public interface ResourceLoader {

	/** Pseudo URL prefix for loading from the class path: "classpath:" */
	String CLASSPATH_URL_PREFIX = ResourceUtils.CLASSPATH_URL_PREFIX;


	/**
	 * Return a Resource handle for the specified resource.
	 * The handle should always be a reusable resource descriptor,
	 * allowing for multiple {@link Resource#getInputStream()} calls.
	 * <p><ul>
	 * <li>Must support fully qualified URLs, e.g. "file:C:/test.dat".
	 * <li>Must support classpath pseudo-URLs, e.g. "classpath:test.dat".
	 * <li>Should support relative file paths, e.g. "WEB-INF/test.dat".
	 * (This will be implementation-specific, typically provided by an
	 * ApplicationContext implementation.)
	 * </ul>
	 * <p>Note that a Resource handle does not imply an existing resource;
	 * you need to invoke {@link Resource#exists} to check for existence.
	 * @param location the resource location
	 * @return a corresponding Resource handle
	 * @see #CLASSPATH_URL_PREFIX
	 * @see org.springframework.core.io.Resource#exists
	 * @see org.springframework.core.io.Resource#getInputStream
	 */
	Resource getResource(String location);

	/**
	 * Expose the ClassLoader used by this ResourceLoader.
	 * <p>Clients which need to access the ClassLoader directly can do so
	 * in a uniform manner with the ResourceLoader, rather than relying
	 * on the thread context ClassLoader.
	 * @return the ClassLoader (only {@code null} if even the system
	 * ClassLoader isn't accessible)
	 * @see org.springframework.util.ClassUtils#getDefaultClassLoader()
	 */
	ClassLoader getClassLoader();

}

```

ResourceLoader　负责加载Resource, 所有的application context都实现了这个接口。

```java
Resource template = ctx.getResource("some/resource/path/myTemplate.txt");
```

如果上述的ctx的类型是 ClassPathXmlApplicationContext，那么返回的Resource的具体类型就是

ClassPathResource； 如果ctx的类型是FileSystemXmlApplicationContext, 返回的类型就变成了

FileSystemResource。

### 指定返回的Resource类型
```java
Resource template = ctx.getResource("classpath:some/resource/path/myTemplate.txt");
```

通过显式的指定classpath前缀，返回的Resource的实际类型就是 ClassPathResource

对应的关系见表格：

|Prefix|Example|Explanation|
|-|-|-|
|classpath:|classpath:com/myapp/config.xml|Loaded from the classpath|
|file: | file:///data/config.xml | Loaded as a URL, from the system|
|http: | http://myserver/logo.png | Loaded as a URL |
|（none） | /data/config.xml | Depends on the underlying ApplicationContext |

#### classpath*

classpath*:conf/appContext.xml

这个特殊的前缀会使spring在所有的ClassPath中查找和指定的名字相同的资源，他们会合并形成最终的

上下文。

>This special prefix specifies that all classpath resources that match the given name must be obtained
(internally, this essentially happens via a ClassLoader.getResources(…) call), and then merged
to form the final application context definition.

### ResourceLoaderAware

```java
public interface ResourceLoaderAware extends Aware {

	/**
	 * Set the ResourceLoader that this object runs in.
	 * <p>This might be a ResourcePatternResolver, which can be checked
	 * through {@code instanceof ResourcePatternResolver}. See also the
	 * {@code ResourcePatternUtils.getResourcePatternResolver} method.
	 * <p>Invoked after population of normal bean properties but before an init callback
	 * like InitializingBean's {@code afterPropertiesSet} or a custom init-method.
	 * Invoked before ApplicationContextAware's {@code setApplicationContext}.
	 * @param resourceLoader ResourceLoader object to be used by this object
	 * @see org.springframework.core.io.support.ResourcePatternResolver
	 * @see org.springframework.core.io.support.ResourcePatternUtils#getResourcePatternResolver
	 */
	void setResourceLoader(ResourceLoader resourceLoader);

}
```

实现这个接口的类，可以获得所在容器的ResourceLoader实例，一般来说就是相应的Application Context。也可以当做

ApplicationContextAware的替代。

>   Interface to be implemented by any object that wishes to be notified of
  the <b>ResourceLoader</b> (typically the ApplicationContext) that it runs in.
  This is an alternative to a full ApplicationContext dependency via the
  ApplicationContextAware interface.


除了实现上述接口，还可以使用基于类型的注入，将ResourceLoader注入到需要的地方。
