title: HttpMessageConverter 原理和源码
tags: spring
category: web
date: 2016-11-29 02:48:45
---

## 架构
![](arch.jpg)

## HttpMessageConverter接口

![](http-message-converter.jpg)

>`HttpMessageConverter` used to
marshal objects into the HTTP request body and to unmarshal any response back into an object.

提供将Java中的对象和http请求、响应相互转换的功能

### spring 中的配置

xml配置示例：

```xml
<mvc:annotation-driven conversion-service="conversionService">
    <mvc:message-converters>
        <bean class="org.springframework.http.converter.StringHttpMessageConverter"/>
        <bean class="org.springframework.http.converter.json.MappingJackson2HttpMessageConverter">
            <property name="objectMapper" ref="jsonObjectMapper"/>
        </bean>
    </mvc:message-converters>
</mvc:annotation-driven>
```

java配置示例：

```java
@Configuration
public class WebConfig extends DelegatingWebMvcConfiguration {

    @Override
    public void addInterceptors(InterceptorRegistry registry){
    // ...
    }

    @Override
    @Bean
    public RequestMappingHandlerAdapter requestMappingHandlerAdapter() {
    // Create or let "super" create the adapter
    // Then customize one of its properties
    }
}
```

### 接口描述
```java
package org.springframework.http.converter;

import java.io.IOException;
import java.util.List;

import org.springframework.http.HttpInputMessage;
import org.springframework.http.HttpOutputMessage;
import org.springframework.http.MediaType;

/**
 * Strategy interface that specifies a converter that can convert from and to HTTP requests and responses.
 *
 * @author Arjen Poutsma
 * @author Juergen Hoeller
 * @since 3.0
 */
public interface HttpMessageConverter<T> {

	/**
	 * Indicates whether the given class can be read by this converter.
	 * @param clazz the class to test for readability
	 * @param mediaType the media type to read, can be {@code null} if not specified.
	 * Typically the value of a {@code Content-Type} header.
	 * @return {@code true} if readable; {@code false} otherwise
	 */
	boolean canRead(Class<?> clazz, MediaType mediaType);

	/**
	 * Indicates whether the given class can be written by this converter.
	 * @param clazz the class to test for writability
	 * @param mediaType the media type to write, can be {@code null} if not specified.
	 * Typically the value of an {@code Accept} header.
	 * @return {@code true} if writable; {@code false} otherwise
	 */
	boolean canWrite(Class<?> clazz, MediaType mediaType);

	/**
	 * Return the list of {@link MediaType} objects supported by this converter.
	 * @return the list of supported media types
	 */
	List<MediaType> getSupportedMediaTypes();

	/**
	 * Read an object of the given type form the given input message, and returns it.
	 * @param clazz the type of object to return. This type must have previously been passed to the
	 * {@link #canRead canRead} method of this interface, which must have returned {@code true}.
	 * @param inputMessage the HTTP input message to read from
	 * @return the converted object
	 * @throws IOException in case of I/O errors
	 * @throws HttpMessageNotReadableException in case of conversion errors
	 */
	T read(Class<? extends T> clazz, HttpInputMessage inputMessage)
			throws IOException, HttpMessageNotReadableException;

	/**
	 * Write an given object to the given output message.
	 * @param t the object to write to the output message. The type of this object must have previously been
	 * passed to the {@link #canWrite canWrite} method of this interface, which must have returned {@code true}.
	 * @param contentType the content type to use when writing. May be {@code null} to indicate that the
	 * default content type of the converter must be used. If not {@code null}, this media type must have
	 * previously been passed to the {@link #canWrite canWrite} method of this interface, which must have
	 * returned {@code true}.
	 * @param outputMessage the message to write to
	 * @throws IOException in case of I/O errors
	 * @throws HttpMessageNotWritableException in case of conversion errors
	 */
	void write(T t, MediaType contentType, HttpOutputMessage outputMessage)
			throws IOException, HttpMessageNotWritableException;

}

```

### spring 提供的实现类

![](inherit.jpg)

|名称|
|---|
|ByteArrayHttpMessageConverter|
|FormHttpMessageConverter|
|XmlAwareFormHttpMessageConverter|
|ResourceHttpMessageConverter|
|SourceHttpMessageConverter|
|StringHttpMessageConverter|
|SimpleXmlHttpMessageConverter|
|MappingJackson2HttpMessageConverter|
|GsonHttpMessageConverter|
|SyndFeedHttpMessageConverter|
|RssChannelHttpMessageConverter|
|AtomFeedHttpMessageConverter|

具体功能见 [RestTemplate Module](http://docs.spring.io/autorepo/docs/spring-android/1.0.x/reference/html/rest-template.html)

想研究源码的可以从最简单的 `StringHttpMessageConverter`看起

## Spring调用过程

在DispatcherServlet初始化的过程会调用一个叫做`initHandlerAdapters`的方法，
该方法内部会扫描容器中所有的类，以及他们的父类，找到所有实现了`HandlerAdapter`接口的类，
并将他们注册到`DispatcherServlet`的`HandlerAdapters`中。


如果没有扫描到的HandlerAdapter，这个方法会加载一些默认的HandlerAdapter。

> The default implementation uses the "DispatcherServlet.properties" file (in the same
  package as the DispatcherServlet class) to determine the class names. 

  ![](DispatcherServlet-properties.jpg)

Spring 4.3.2 中有一个实现了`HandlerAdapter`接口的类会被扫描到，这个类叫做`RequestMappingHandlerAdapter`

### RequestMappingHandlerAdapter
这个类在构造的时候就加载了许多messageConverter

```java
    public RequestMappingHandlerAdapter() {
        StringHttpMessageConverter stringHttpMessageConverter = new StringHttpMessageConverter();
        stringHttpMessageConverter.setWriteAcceptCharset(false);  // see SPR-7316

        this.messageConverters = new ArrayList<HttpMessageConverter<?>>(4);
        this.messageConverters.add(new ByteArrayHttpMessageConverter());
        this.messageConverters.add(stringHttpMessageConverter);
        this.messageConverters.add(new SourceHttpMessageConverter<Source>());
        this.messageConverters.add(new AllEncompassingFormHttpMessageConverter());
    }
```
其中`AllEncompassingFormHttpMessageConverter`继承自`FormHttpMessageConverter`， 它有一个变量叫做
`partConverters`，存储了一系列的`HttpMessageConverter`
```java
    private List<HttpMessageConverter<?>> partConverters = new ArrayList<HttpMessageConverter<?>>();
    public FormHttpMessageConverter() {
        this.supportedMediaTypes.add(MediaType.APPLICATION_FORM_URLENCODED);
        this.supportedMediaTypes.add(MediaType.MULTIPART_FORM_DATA);
        this.partConverters.add(new ByteArrayHttpMessageConverter());
        StringHttpMessageConverter stringHttpMessageConverter = new StringHttpMessageConverter();
        stringHttpMessageConverter.setWriteAcceptCharset(false);
        this.partConverters.add(stringHttpMessageConverter);
        this.partConverters.add(new ResourceHttpMessageConverter());
    }
```
在`AllEncompassingFormHttpMessageConverter`中又根据classPath中是否包含jackson、Gson等jar包来动态的
注册了一些`HttpMessageConverter`:

```java
public class AllEncompassingFormHttpMessageConverter extends FormHttpMessageConverter {

    private static final boolean jaxb2Present =
            ClassUtils.isPresent("javax.xml.bind.Binder", AllEncompassingFormHttpMessageConverter.class.getClassLoader());

    private static final boolean jackson2Present =
            ClassUtils.isPresent("com.fasterxml.jackson.databind.ObjectMapper", AllEncompassingFormHttpMessageConverter.class.getClassLoader()) &&
                    ClassUtils.isPresent("com.fasterxml.jackson.core.JsonGenerator", AllEncompassingFormHttpMessageConverter.class.getClassLoader());

    private static final boolean jackson2XmlPresent =
            ClassUtils.isPresent("com.fasterxml.jackson.dataformat.xml.XmlMapper", AllEncompassingFormHttpMessageConverter.class.getClassLoader());

    private static final boolean gsonPresent =
            ClassUtils.isPresent("com.google.gson.Gson", AllEncompassingFormHttpMessageConverter.class.getClassLoader());


    public AllEncompassingFormHttpMessageConverter() {
        addPartConverter(new SourceHttpMessageConverter<Source>());

        if (jaxb2Present && !jackson2Present) {
            addPartConverter(new Jaxb2RootElementHttpMessageConverter());
        }

        if (jackson2Present) {
            addPartConverter(new MappingJackson2HttpMessageConverter());
        }
        else if (gsonPresent) {
            addPartConverter(new GsonHttpMessageConverter());
        }

        if (jackson2XmlPresent) {
            addPartConverter(new MappingJackson2XmlHttpMessageConverter());
        }
    }

}
```

至于这些转换器是怎么使用的，要看`RequestMappingHandlerAdapter`中的`getDefaultArgumentResolver`

```java
/**
     * Return the list of argument resolvers to use including built-in resolvers
     * and custom resolvers provided via {@link #setCustomArgumentResolvers}.
     */
    private List<HandlerMethodArgumentResolver> getDefaultArgumentResolvers() {
        List<HandlerMethodArgumentResolver> resolvers = new ArrayList<HandlerMethodArgumentResolver>();

        // Annotation-based argument resolution
        resolvers.add(new RequestParamMethodArgumentResolver(getBeanFactory(), false));
        resolvers.add(new RequestParamMapMethodArgumentResolver());
        resolvers.add(new PathVariableMethodArgumentResolver());
        resolvers.add(new PathVariableMapMethodArgumentResolver());
        resolvers.add(new MatrixVariableMethodArgumentResolver());
        resolvers.add(new MatrixVariableMapMethodArgumentResolver());
        resolvers.add(new ServletModelAttributeMethodProcessor(false));
        resolvers.add(new RequestResponseBodyMethodProcessor(getMessageConverters(), this.requestResponseBodyAdvice));
        resolvers.add(new RequestPartMethodArgumentResolver(getMessageConverters(), this.requestResponseBodyAdvice));
        resolvers.add(new RequestHeaderMethodArgumentResolver(getBeanFactory()));
        resolvers.add(new RequestHeaderMapMethodArgumentResolver());
        resolvers.add(new ServletCookieValueMethodArgumentResolver(getBeanFactory()));
        resolvers.add(new ExpressionValueMethodArgumentResolver(getBeanFactory()));

        // Type-based argument resolution
        resolvers.add(new ServletRequestMethodArgumentResolver());
        resolvers.add(new ServletResponseMethodArgumentResolver());
        resolvers.add(new HttpEntityMethodProcessor(getMessageConverters(), this.requestResponseBodyAdvice));
        resolvers.add(new RedirectAttributesMethodArgumentResolver());
        resolvers.add(new ModelMethodProcessor());
        resolvers.add(new MapMethodProcessor());
        resolvers.add(new ErrorsMethodArgumentResolver());
        resolvers.add(new SessionStatusMethodArgumentResolver());
        resolvers.add(new UriComponentsBuilderMethodArgumentResolver());

        // Custom arguments
        if (getCustomArgumentResolvers() != null) {
            resolvers.addAll(getCustomArgumentResolvers());
        }

        // Catch-all
        resolvers.add(new RequestParamMethodArgumentResolver(getBeanFactory(), true));
        resolvers.add(new ServletModelAttributeMethodProcessor(true));

        return resolvers;
    }
```

可以看到所有的Converter最终作为一个构造参数传入了`RequestResponseBodyMethodProcessor`和`RequestPartMethodArgumentResolver`。 前者其实是负责处理`@RequestBody`和`@ResponseBody`的, 
后者则是处理`@RequestPart`这个注解的。拿`RequestResponseBodyMethodProcessor`为例来看。

这个类的父类实现了`HandlerMethodReturnValueHandler`接口，这个接口的作用对照上面的系统整体架构图
可知，是处理Controller返回的结果值的，看其`handleReturnValue`方法 。

```java
    @Override
    public void handleReturnValue(Object returnValue, MethodParameter returnType,
            ModelAndViewContainer mavContainer, NativeWebRequest webRequest)
            throws IOException, HttpMediaTypeNotAcceptableException, HttpMessageNotWritableException {
        mavContainer.setRequestHandled(true);
        // Try even with null return value. ResponseBodyAdvice could get involved.
        writeWithMessageConverters(returnValue, returnType, webRequest);
    }
```
首先标记这个请求已经处理过了，然后调用了一个内部方法，从名字就可以看出来，是使用MessageConverter进行
转换。

```java
    /**
     * Writes the given return value to the given web request. Delegates to
     * {@link #writeWithMessageConverters(Object, MethodParameter, ServletServerHttpRequest, ServletServerHttpResponse)}
     */
    protected <T> void writeWithMessageConverters(T returnValue, MethodParameter returnType, NativeWebRequest webRequest)
            throws IOException, HttpMediaTypeNotAcceptableException, HttpMessageNotWritableException {

        ServletServerHttpRequest inputMessage = createInputMessage(webRequest);
        ServletServerHttpResponse outputMessage = createOutputMessage(webRequest);
        writeWithMessageConverters(returnValue, returnType, inputMessage, outputMessage);
    }

```
真正的逻辑还是内部的`writeWithMessageConveters()

```java
/**
     * Writes the given return type to the given output message.
     * @param returnValue the value to write to the output message
     * @param returnType the type of the value
     * @param inputMessage the input messages. Used to inspect the {@code Accept} header.
     * @param outputMessage the output message to write to
     * @throws IOException thrown in case of I/O errors
     * @throws HttpMediaTypeNotAcceptableException thrown when the conditions indicated by {@code Accept} header on
     * the request cannot be met by the message converters
     */
    @SuppressWarnings("unchecked")
    protected <T> void writeWithMessageConverters(T returnValue, MethodParameter returnType,
            ServletServerHttpRequest inputMessage, ServletServerHttpResponse outputMessage)
            throws IOException, HttpMediaTypeNotAcceptableException, HttpMessageNotWritableException {

        Class<?> returnValueClass = getReturnValueType(returnValue, returnType);
        Type returnValueType = getGenericType(returnType);
        HttpServletRequest servletRequest = inputMessage.getServletRequest();
        //从请求头获取可能的返回类型（默认会加载两种策略，比如从路径名的后缀上推断）
        List<MediaType> requestedMediaTypes = getAcceptableMediaTypes(servletRequest);
        //根据请求和返回的值得类型，推断可能的返回值类型
        List<MediaType> producibleMediaTypes = getProducibleMediaTypes(servletRequest, returnValueClass, returnValueType);

        if (returnValue != null && producibleMediaTypes.isEmpty()) {
            throw new IllegalArgumentException("No converter found for return value of type: " + returnValueClass);
        }
        
        //筛选
        Set<MediaType> compatibleMediaTypes = new LinkedHashSet<MediaType>();
        for (MediaType requestedType : requestedMediaTypes) {
            for (MediaType producibleType : producibleMediaTypes) {
                if (requestedType.isCompatibleWith(producibleType)) {
                    compatibleMediaTypes.add(getMostSpecificMediaType(requestedType, producibleType));
                }
            }
        }
        if (compatibleMediaTypes.isEmpty()) {
            if (returnValue != null) {
                throw new HttpMediaTypeNotAcceptableException(producibleMediaTypes);
            }
            return;
        }

        List<MediaType> mediaTypes = new ArrayList<MediaType>(compatibleMediaTypes);
        MediaType.sortBySpecificityAndQuality(mediaTypes);

        MediaType selectedMediaType = null;
        for (MediaType mediaType : mediaTypes) {
            if (mediaType.isConcrete()) {//具体的，没有通配符的
                selectedMediaType = mediaType;
                break;// 找到一个就跳出循环
            }
            else if (mediaType.equals(MediaType.ALL) || mediaType.equals(MEDIA_TYPE_APPLICATION)) {
                selectedMediaType = MediaType.APPLICATION_OCTET_STREAM;
                break;// 找到一个就跳出循环
            }
        }

            //找到能处理这种类型的HttpMessageConverter
        if (selectedMediaType != null) {
            selectedMediaType = selectedMediaType.removeQualityValue();
            for (HttpMessageConverter<?> messageConverter : this.messageConverters) {
                if (messageConverter instanceof GenericHttpMessageConverter) {
                    if (((GenericHttpMessageConverter<T>) messageConverter).canWrite(returnValueType,
                            returnValueClass, selectedMediaType)) {
                        returnValue = (T) getAdvice().beforeBodyWrite(returnValue, returnType, selectedMediaType,
                                (Class<? extends HttpMessageConverter<?>>) messageConverter.getClass(),
                                inputMessage, outputMessage);
                        if (returnValue != null) {
                            addContentDispositionHeader(inputMessage, outputMessage);
                            ((GenericHttpMessageConverter<T>) messageConverter).write(returnValue,
                                    returnValueType, selectedMediaType, outputMessage);
                            if (logger.isDebugEnabled()) {
                                logger.debug("Written [" + returnValue + "] as \"" +
                                        selectedMediaType + "\" using [" + messageConverter + "]");
                            }
                        }
                        return;
                    }
                }
                else if (messageConverter.canWrite(returnValueClass, selectedMediaType)) {
                    returnValue = (T) getAdvice().beforeBodyWrite(returnValue, returnType, selectedMediaType,
                            (Class<? extends HttpMessageConverter<?>>) messageConverter.getClass(),
                            inputMessage, outputMessage);
                    if (returnValue != null) {
                        addContentDispositionHeader(inputMessage, outputMessage);
                        ((HttpMessageConverter<T>) messageConverter).write(returnValue,
                                selectedMediaType, outputMessage);
                        if (logger.isDebugEnabled()) {
                            logger.debug("Written [" + returnValue + "] as \"" +
                                    selectedMediaType + "\" using [" + messageConverter + "]");
                        }
                    }
                    return;
                }
            }
        }

        if (returnValue != null) {
            throw new HttpMediaTypeNotAcceptableException(this.allSupportedMediaTypes);
        }
    }
```

至此，HttpMessageConverter如何工作的就真相大白了。

## 参考链接

1. [SpringMVC关于json、xml自动转换的原理研究(附带源码分析)](http://www.cnblogs.com/fangjian0423/p/springMVC-xml-json-convert.html)
