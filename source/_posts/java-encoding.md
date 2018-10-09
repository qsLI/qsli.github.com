title: java中encoding总结
tags: encoding
category: java
toc: true
date: 2018-08-12 23:18:44
---


# URLConnection 乱码

```java
URL realUrl = new URL(""urlNameString"");
URLConnection connection = realUrl.openConnection();
OutputStreamWriter out = new OutputStreamWriter(connection  
        .getOutputStream(), "UTF-8"); 
```

在获取`OutputStreamWriter`需要指定编码格式， 否则使用的是默认的编码， 查看`OutputStreamWriter`的没有指定编码的构造函数:

```java
    /**
     * Creates an OutputStreamWriter that uses the default character encoding.
     *
     * @param  out  An OutputStream
     */
    public OutputStreamWriter(OutputStream out) {
        super(out);
        try {
            se = StreamEncoder.forOutputStreamWriter(out, this, (String)null);
        } catch (UnsupportedEncodingException e) {
            throw new Error(e);
        }
    }
```

查看`StreamEncoder`的`forOutputStreamWriter`方法：

```java
// Factories for java.io.OutputStreamWriter
    public static StreamEncoder forOutputStreamWriter(OutputStream out,
                                                      Object lock,
                                                      String charsetName)
        throws UnsupportedEncodingException
    {
        String csn = charsetName;
        if (csn == null)
            csn = Charset.defaultCharset().name();
        try {
            if (Charset.isSupported(csn))
                return new StreamEncoder(out, lock, Charset.forName(csn));
        } catch (IllegalCharsetNameException x) { }
        throw new UnsupportedEncodingException (csn);
    }
```

可以看到， 如果没有传入编码名称，用的是默认的编码方式，这个`Charset.defaultCharset().name()`在windows上默认是`GBK`，这个可以在`JDK`启动的时候指定参数：

```bash
-Dfile.encoding=UTF-8
```



# Tomcat乱码

## URI编码

指定为`UTF-8`

```xml
<Connector port="8080" maxThreads="150" minSpareThreads="25" 
maxSpareThreads="75" enableLookups="false" redirectPort="8443" 
acceptCount="100" debug="99" connectionTimeout="20000" 
disableUploadTimeout="true" URIEncoding="UTF-8"/>
```

tomcat 对URI默认的编码是`ISO-8859-1`，在`Connector`中配置**URIEncoding="UTF-8"** 就可以指定编码。

tomcat中关于编码的代码:

```java
//org.apache.catalina.connector.CoyoteAdapter#convertURI
 /**
     * Character conversion of the URI.
     */
    protected void convertURI(MessageBytes uri, Request request)
        throws Exception {

        ByteChunk bc = uri.getByteChunk();
        int length = bc.getLength();
        CharChunk cc = uri.getCharChunk();
        cc.allocate(length, -1);

        String enc = connector.getURIEncoding();
        if (enc != null) {
            B2CConverter conv = request.getURIConverter();
            try {
                if (conv == null) {
                    conv = new B2CConverter(enc, true);
                    request.setURIConverter(conv);
                } else {
                    conv.recycle();
                }
            } catch (IOException e) {
                log.error("Invalid URI encoding; using HTTP default");
                connector.setURIEncoding(null);
            }
            if (conv != null) {
                try {
                    conv.convert(bc, cc, true);
                    uri.setChars(cc.getBuffer(), cc.getStart(), cc.getLength());
                    return;
                } catch (IOException ioe) {
                    // Should never happen as B2CConverter should replace
                    // problematic characters
                    request.getResponse().sendError(
                            HttpServletResponse.SC_BAD_REQUEST);
                }
            }
        }

        // Default encoding: fast conversion for ISO-8859-1
        byte[] bbuf = bc.getBuffer();
        char[] cbuf = cc.getBuffer();
        int start = bc.getStart();
        for (int i = 0; i < length; i++) {
            cbuf[i] = (char) (bbuf[i + start] & 0xff);
        }
        uri.setChars(cbuf, 0, length);
    }
```

## Request的编码

设置了上述编码后，获取request的参数还是有可能乱码， 此时需要指定对应的filter。

## Tomcat

tomcat中也实现了一个编码的filter：

```java
//org.apache.catalina.filters.SetCharacterEncodingFilter
/**
     * Select and set (if specified) the character encoding to be used to
     * interpret request parameters for this request.
     *
     * @param request The servlet request we are processing
     * @param response The servlet response we are creating
     * @param chain The filter chain we are processing
     *
     * @exception IOException if an input/output error occurs
     * @exception ServletException if a servlet error occurs
     */
    @Override
    public void doFilter(ServletRequest request, ServletResponse response,
                         FilterChain chain)
        throws IOException, ServletException {

        // Conditionally select and set the character encoding to be used
        if (ignore || (request.getCharacterEncoding() == null)) {
            String characterEncoding = selectEncoding(request);
            if (characterEncoding != null) {
                request.setCharacterEncoding(characterEncoding);
            }
        }

        // Pass control on to the next filter
        chain.doFilter(request, response);
    }
```

在`web.xml`中的配置：

```xml
<filter>
    <filter-name>SetCharacterEncoding</filter-name>
    <filter-class>filters.SetCharacterEncodingFilter</filter-class>
    <init-param>
        <param-name>encoding</param-name>
        <param-value>GBK</param-value>
    </init-param>
</filter>
<filter-mapping>
    <filter-name>SetCharacterEncoding</filter-name>
    <url-pattern>/*</url-pattern>
</filter-mapping>  
```



## SpringMVC

在spring mvc中可以做如下的配置：

```xml
<filter>
    <filter-name>encodingFilter</filter-name>
    <filter-class>org.springframework.web.filter.CharacterEncodingFilter</filter-class>
    <init-param>
        <param-name>encoding</param-name>
        <param-value>UTF-8</param-value>
    </init-param>
    <init-param>
        <param-name>forceEncoding</param-name>
        <param-value>true</param-value>
    </init-param>
    <async-supported>true</async-supported>
</filter>
<filter-mapping>
    <filter-name>encodingFilter</filter-name>
    <url-pattern>/*</url-pattern>
</filter-mapping>
```

一定要配置成**第一个**`filter`，否则还是不会生效。

它的实现也很简单：

```java
//org.springframework.web.filter.CharacterEncodingFilter#doFilterInternal

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String encoding = getEncoding();
        if (encoding != null) {
            if (isForceRequestEncoding() || request.getCharacterEncoding() == null) {
                request.setCharacterEncoding(encoding);
            }
            if (isForceResponseEncoding()) {
                response.setCharacterEncoding(encoding);
            }
        }
        filterChain.doFilter(request, response);
    }
```

`setCharacterEncoding`是Servlet规范中定义的方法， 看下`tomcat`的实现：

```java
//org.apache.catalina.core.ApplicationHttpRequest#mergeParameters
  /**
     * Merge the parameters from the saved query parameter string (if any), and
     * the parameters already present on this request (if any), such that the
     * parameter values from the query string show up first if there are
     * duplicate parameter names.
     */
    private void mergeParameters() {

        if ((queryParamString == null) || (queryParamString.length() < 1))
            return;

        HashMap<String, String[]> queryParameters = new HashMap<String, String[]>();
        String encoding = getCharacterEncoding();
        if (encoding == null)
            encoding = "ISO-8859-1";
        RequestUtil.parseParameters(queryParameters, queryParamString,
                encoding);
        Iterator<String> keys = parameters.keySet().iterator();
        while (keys.hasNext()) {
            String key = keys.next();
            Object value = queryParameters.get(key);
            if (value == null) {
                queryParameters.put(key, parameters.get(key));
                continue;
            }
            queryParameters.put
                (key, mergeValues(value, parameters.get(key)));
        }
        parameters = queryParameters;

    }
```

可以看到默认的编码是`"ISO-8859-1"`, 为什么要设置成第一个filter呢，找到调用的地方看：

```java
//org.apache.catalina.core.ApplicationHttpRequest#parseParameters
 /**
     * Parses the parameters of this request.
     *
     * If parameters are present in both the query string and the request
     * content, they are merged.
     */
    void parseParameters() {

        if (parsedParams) {
            return;
        }

        parameters = new HashMap<String, String[]>();
        parameters = copyMap(getRequest().getParameterMap());
        mergeParameters();
        parsedParams = true;
    }
```

可以看到，`parseParameters`只会调用一次，如果在前面的`filter`中尝试获取`Parameters`中的参数，这个tomcat就会用默认的编码去解析传入的参数了。



# 参考

- [UrlConnection post请求中文参数乱码问题 - CSDN博客](https://blog.csdn.net/u010001043/article/details/53203576)
- [设置Java JDK的默认编码为UTF-8 - CSDN博客](https://blog.csdn.net/huangshaotian/article/details/7472662)