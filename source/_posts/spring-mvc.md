---
title: Spring Mvc源码剖析
tags: spring mvc
category: spring
toc: true
abbrlink: '96837423'
date: 2016-10-02 22:14:25
---

## 架构
{%  asset_img   arch.jpg  %}




SpringMVC的核心是 `DispatcherServlet`

## 本质

我们通过在`web.xml`中配置如下的语句，引入SpringMVC

``` xml
<servlet>
    <servlet-name>mvc-dispatcher</servlet-name>
    <servlet-class>org.springframework.web.servlet.DispatcherServlet</servlet-class>
    <init-param>
        <param-name>contextConfigLocation</param-name>
        <param-value>classpath:/spring/mvc/mvc-dispatcher-servlet.xml</param-value>
    </init-param>
    <load-on-startup>1</load-on-startup>
</servlet>
```

上述代码段指定了servlet的class是spring的`DispatcherServlet`，初始化配置文件是`mvc-dispatcher-servlet.xml`,以及servlet的加载顺序。

既然`DispatcherServlet`也是一个`Servlet`，那他肯定也遵从servlet的规范。
我们知道Servlet定义了如下的接口：
{%  asset_img   servlet-interface.jpg  %}



其中比较重要的是`init`和`service`接口
`init`方法在servlet的一生中只初始化一次，`service`接口是Servlet对外提供服务的接口
Servlet的生命周期如下:
{%  asset_img   Servlet_LifeCycle.jpg  %}




我们来看下`DispatcherServlet`的继承结构：

{%  asset_img   hierachy.jpg  %}




### init方法

直接去看`DispatcherServlet`的源码是没有发现`init`方法的， 它的`init`方法继承自`HttpServletBean`，源码如下：
```java
    /**
		 * Map config parameters onto bean properties of this servlet, and
		 * invoke subclass initialization.
		 * @throws ServletException if bean properties are invalid (or required
		 * properties are missing), or if subclass initialization fails.
		 */
		@Override
		public final void init() throws ServletException {
			if (logger.isDebugEnabled()) {
				logger.debug("Initializing servlet '" + getServletName() + "'");
			}

			// Set bean properties from init parameters.
			try {
				PropertyValues pvs = new ServletConfigPropertyValues(getServletConfig(), this.requiredProperties);
				BeanWrapper bw = PropertyAccessorFactory.forBeanPropertyAccess(this);
				ResourceLoader resourceLoader = new ServletContextResourceLoader(getServletContext());
				bw.registerCustomEditor(Resource.class, new ResourceEditor(resourceLoader, getEnvironment()));
				initBeanWrapper(bw);
				bw.setPropertyValues(pvs, true);
			}
			catch (BeansException ex) {
				logger.error("Failed to set bean properties on servlet '" + getServletName() + "'", ex);
				throw ex;
			}

			// Let subclasses do whatever initialization they like.
			initServletBean();

			if (logger.isDebugEnabled()) {
				logger.debug("Servlet '" + getServletName() + "' configured successfully");
			}
		}
```

在这个方法中，主要完成了bean属性的配置，并且给子类留下了相应的hook

``` java
// Let subclasses do whatever initialization they like.
initServletBean();
```

这个方法在FrameworkServlet中有具体的实现，现在看下FrameworkServlet中的实现。

``` java
/**
	 * Overridden method of {@link HttpServletBean}, invoked after any bean properties
	 * have been set. Creates this servlet's WebApplicationContext.
	 */
	@Override
	protected final void initServletBean() throws ServletException {
		getServletContext().log("Initializing Spring FrameworkServlet '" + getServletName() + "'");
		if (this.logger.isInfoEnabled()) {
			this.logger.info("FrameworkServlet '" + getServletName() + "': initialization started");
		}
		long startTime = System.currentTimeMillis();

		try {
			this.webApplicationContext = initWebApplicationContext();
			initFrameworkServlet();
		}
		catch (ServletException ex) {
			this.logger.error("Context initialization failed", ex);
			throw ex;
		}
		catch (RuntimeException ex) {
			this.logger.error("Context initialization failed", ex);
			throw ex;
		}

		if (this.logger.isInfoEnabled()) {
			long elapsedTime = System.currentTimeMillis() - startTime;
			this.logger.info("FrameworkServlet '" + getServletName() + "': initialization completed in " +
					elapsedTime + " ms");
		}
	}
```
`webApplicationContext`在此进行初始化，并且给子类留下了一个hook
``` java
this.webApplicationContext = initWebApplicationContext();
initFrameworkServlet();
```
`initFrameworkServlet`在本类中并没有实现，用于子类控制

```java
/**
* This method will be invoked after any bean properties have been set and
* the WebApplicationContext has been loaded. The default implementation is empty;
* subclasses may override this method to perform any initialization they require.
* @throws ServletException in case of an initialization exception
*/
protected void initFrameworkServlet() throws ServletException {
}
```

在initWebApplicationContext方法中，有一个空实现的方法onRefresh()
```java
/**
* Template method which can be overridden to add servlet-specific refresh work.
* Called after successful context refresh.
* <p>This implementation is empty.
* @param context the current WebApplicationContext
* @see #refresh()
*/
protected void onRefresh(ApplicationContext context) {
// For subclasses: do nothing by default.
}
```

这个方法也是钩子方法，DispatcherServlet正是实现了这个方法。

```java

/**
	* This implementation calls {@link #initStrategies}.
	*/
	@Override
	protected void onRefresh(ApplicationContext context) {
		initStrategies(context);
	}


	/**
		 * Initialize the strategy objects that this servlet uses.
		 * <p>May be overridden in subclasses in order to initialize further strategy objects.
		 */
		protected void initStrategies(ApplicationContext context) {
			initMultipartResolver(context);
			initLocaleResolver(context);
			initThemeResolver(context);
			initHandlerMappings(context);
			initHandlerAdapters(context);
			initHandlerExceptionResolvers(context);
			initRequestToViewNameTranslator(context);
			initViewResolvers(context);
			initFlashMapManager(context);
		}
```

onRefresh方法中又调用了initStrategies方法，在这个方法中进行了大量的初始化工作。

视图解析器和HandlerMappings都是在这个方法中初始化的。

重点看一下initHandlerMappings方法，这个方法是初始化url映射的

```java
/**
	 * Initialize the HandlerMappings used by this class.
	 * <p>If no HandlerMapping beans are defined in the BeanFactory for this namespace,
	 * we default to BeanNameUrlHandlerMapping.
	 */
	private void initHandlerMappings(ApplicationContext context) {
		this.handlerMappings = null;

		if (this.detectAllHandlerMappings) {
			// Find all HandlerMappings in the ApplicationContext, including ancestor contexts.
			Map<String, HandlerMapping> matchingBeans =
					BeanFactoryUtils.beansOfTypeIncludingAncestors(context, HandlerMapping.class, true, false);
			if (!matchingBeans.isEmpty()) {
				this.handlerMappings = new ArrayList<HandlerMapping>(matchingBeans.values());
				// We keep HandlerMappings in sorted order.
				AnnotationAwareOrderComparator.sort(this.handlerMappings);
			}
		}
		else {
			try {
				HandlerMapping hm = context.getBean(HANDLER_MAPPING_BEAN_NAME, HandlerMapping.class);
				this.handlerMappings = Collections.singletonList(hm);
			}
			catch (NoSuchBeanDefinitionException ex) {
				// Ignore, we'll add a default HandlerMapping later.
			}
		}

		// Ensure we have at least one HandlerMapping, by registering
		// a default HandlerMapping if no other mappings are found.
		if (this.handlerMappings == null) {
			this.handlerMappings = getDefaultStrategies(context, HandlerMapping.class);
			if (logger.isDebugEnabled()) {
				logger.debug("No HandlerMappings found in servlet '" + getServletName() + "': using default");
			}
		}
	}
  ```
  其根据 this.detectAllHandlerMappings 的值来确定是否扫描祖先定义的handlermappings，如果用户没有配置的话，就会使用默认的HandlerMapping
```java
/** Detect all HandlerMappings or just expect "handlerMapping" bean? */
private boolean detectAllHandlerMappings = true;
```

### service方法

servlet接口中另外一个重要的方法叫做`service`

`service`方法最早是在`HttpServlet`类中实现的，代码如下：
```java
/**
     * Dispatches client requests to the protected
     * <code>service</code> method. There's no need to
     * override this method.
     *
     * @param req   the {@link HttpServletRequest} object that
     *                  contains the request the client made of
     *                  the servlet
     *
     * @param res   the {@link HttpServletResponse} object that
     *                  contains the response the servlet returns
     *                  to the client                                
     *
     * @exception IOException   if an input or output error occurs
     *                              while the servlet is handling the
     *                              HTTP request
     *
     * @exception ServletException  if the HTTP request cannot
     *                                  be handled
     *
     * @see javax.servlet.Servlet#service
     */
    public void service(ServletRequest req, ServletResponse res)
        throws ServletException, IOException
    {
        HttpServletRequest  request;
        HttpServletResponse response;

        if (!(req instanceof HttpServletRequest &&
                res instanceof HttpServletResponse)) {
            throw new ServletException("non-HTTP request or response");
        }

        request = (HttpServletRequest) req;
        response = (HttpServletResponse) res;

        service(request, response);
    }
}

```
它又调用自身的一个`service`方法:
```java
/**
    * Receives standard HTTP requests from the public
    * <code>service</code> method and dispatches
    * them to the <code>do</code><i>XXX</i> methods defined in
    * this class. This method is an HTTP-specific version of the
    * {@link javax.servlet.Servlet#service} method. There's no
    * need to override this method.
    *
    * @param req   the {@link HttpServletRequest} object that
    *                  contains the request the client made of
    *                  the servlet
    *
    * @param resp  the {@link HttpServletResponse} object that
    *                  contains the response the servlet returns
    *                  to the client                                
    *
    * @exception IOException   if an input or output error occurs
    *                              while the servlet is handling the
    *                              HTTP request
    *
    * @exception ServletException  if the HTTP request
    *                                  cannot be handled
    *
    * @see javax.servlet.Servlet#service
    */
   protected void service(HttpServletRequest req, HttpServletResponse resp)
       throws ServletException, IOException
   {
       String method = req.getMethod();

       if (method.equals(METHOD_GET)) {
           long lastModified = getLastModified(req);
           if (lastModified == -1) {
               // servlet doesn't support if-modified-since, no reason
               // to go through further expensive logic
               doGet(req, resp);
           } else {
               long ifModifiedSince = req.getDateHeader(HEADER_IFMODSINCE);
               if (ifModifiedSince < lastModified) {
                   // If the servlet mod time is later, call doGet()
                   // Round down to the nearest second for a proper compare
                   // A ifModifiedSince of -1 will always be less
                   maybeSetLastModified(resp, lastModified);
                   doGet(req, resp);
               } else {
                   resp.setStatus(HttpServletResponse.SC_NOT_MODIFIED);
               }
           }

       } else if (method.equals(METHOD_HEAD)) {
           long lastModified = getLastModified(req);
           maybeSetLastModified(resp, lastModified);
           doHead(req, resp);

       } else if (method.equals(METHOD_POST)) {
           doPost(req, resp);

       } else if (method.equals(METHOD_PUT)) {
           doPut(req, resp);

       } else if (method.equals(METHOD_DELETE)) {
           doDelete(req, resp);

       } else if (method.equals(METHOD_OPTIONS)) {
           doOptions(req,resp);

       } else if (method.equals(METHOD_TRACE)) {
           doTrace(req,resp);

       } else {
           //
           // Note that this means NO servlet supports whatever
           // method was requested, anywhere on this server.
           //

           String errMsg = lStrings.getString("http.method_not_implemented");
           Object[] errArgs = new Object[1];
           errArgs[0] = method;
           errMsg = MessageFormat.format(errMsg, errArgs);

           resp.sendError(HttpServletResponse.SC_NOT_IMPLEMENTED, errMsg);
       }
   }
```

这段代码就是根据请求的类型调用相应的处理方法

这个方法又在`FrameWorkServlet`中被重写，如下：

```java
/**
 * Override the parent class implementation in order to intercept PATCH requests.
 */
@Override
protected void service(HttpServletRequest request, HttpServletResponse response)
    throws ServletException, IOException {

  if (HttpMethod.PATCH.matches(request.getMethod())) {
    processRequest(request, response);
  }
  else {
    super.service(request, response);
  }
}
```

又增加了一个处理PATCH请求的方法，其他的还是调用`HttpServlet`的实现。

同时，`FrameWorkServlet`又将`HttpServlet`中对应的各种HTTP请求的方法都进行了重写，如下：
```java
/**
	 * Delegate GET requests to processRequest/doService.
	 * <p>Will also be invoked by HttpServlet's default implementation of {@code doHead},
	 * with a {@code NoBodyResponse} that just captures the content length.
	 * @see #doService
	 * @see #doHead
	 */
	@Override
	protected final void doGet(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {

		processRequest(request, response);
	}
```

所有的请求都被委托给了`processRequest`这个方法，它的实现如下：

```java
/**
	 * Process this request, publishing an event regardless of the outcome.
	 * <p>The actual event handling is performed by the abstract
	 * {@link #doService} template method.
	 */
	protected final void processRequest(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {

		long startTime = System.currentTimeMillis();
		Throwable failureCause = null;

		LocaleContext previousLocaleContext = LocaleContextHolder.getLocaleContext();
		LocaleContext localeContext = buildLocaleContext(request);

		RequestAttributes previousAttributes = RequestContextHolder.getRequestAttributes();
		ServletRequestAttributes requestAttributes = buildRequestAttributes(request, response, previousAttributes);

		WebAsyncManager asyncManager = WebAsyncUtils.getAsyncManager(request);
		asyncManager.registerCallableInterceptor(FrameworkServlet.class.getName(), new RequestBindingInterceptor());

		initContextHolders(request, localeContext, requestAttributes);

		try {
			doService(request, response);
		}
		catch (ServletException ex) {
			failureCause = ex;
			throw ex;
		}
		catch (IOException ex) {
			failureCause = ex;
			throw ex;
		}
		catch (Throwable ex) {
			failureCause = ex;
			throw new NestedServletException("Request processing failed", ex);
		}

		finally {
			resetContextHolders(request, previousLocaleContext, previousAttributes);
			if (requestAttributes != null) {
				requestAttributes.requestCompleted();
			}

			if (logger.isDebugEnabled()) {
				if (failureCause != null) {
					this.logger.debug("Could not complete request", failureCause);
				}
				else {
					if (asyncManager.isConcurrentHandlingStarted()) {
						logger.debug("Leaving response open for concurrent processing");
					}
					else {
						this.logger.debug("Successfully completed request");
					}
				}
			}

			publishRequestHandledEvent(request, response, startTime, failureCause);
		}
	}

```

上述代码的异常处理很值得借鉴，上述代码中`doService(request, response)`是核心。

它是`FrameWorkServlet`中定义的一个接口，它在`DispatcherServlet`中被实现。
```java
/**
 * Subclasses must implement this method to do the work of request handling,
 * receiving a centralized callback for GET, POST, PUT and DELETE.
 * <p>The contract is essentially the same as that for the commonly overridden
 * {@code doGet} or {@code doPost} methods of HttpServlet.
 * <p>This class intercepts calls to ensure that exception handling and
 * event publication takes place.
 * @param request current HTTP request
 * @param response current HTTP response
 * @throws Exception in case of any kind of processing failure
 * @see javax.servlet.http.HttpServlet#doGet
 * @see javax.servlet.http.HttpServlet#doPost
 */
protected abstract void doService(HttpServletRequest request, HttpServletResponse response)
    throws Exception;
```

`DispatcherServlet`中的`doService`接口代码如下：
```java
/**
	 * Exposes the DispatcherServlet-specific request attributes and delegates to {@link #doDispatch}
	 * for the actual dispatching.
	 */
	@Override
	protected void doService(HttpServletRequest request, HttpServletResponse response) throws Exception {
		if (logger.isDebugEnabled()) {
			String resumed = WebAsyncUtils.getAsyncManager(request).hasConcurrentResult() ? " resumed" : "";
			logger.debug("DispatcherServlet with name '" + getServletName() + "'" + resumed +
					" processing " + request.getMethod() + " request for [" + getRequestUri(request) + "]");
		}

		// Keep a snapshot of the request attributes in case of an include,
		// to be able to restore the original attributes after the include.
		Map<String, Object> attributesSnapshot = null;
		if (WebUtils.isIncludeRequest(request)) {
			attributesSnapshot = new HashMap<String, Object>();
			Enumeration<?> attrNames = request.getAttributeNames();
			while (attrNames.hasMoreElements()) {
				String attrName = (String) attrNames.nextElement();
				if (this.cleanupAfterInclude || attrName.startsWith("org.springframework.web.servlet")) {
					attributesSnapshot.put(attrName, request.getAttribute(attrName));
				}
			}
		}

		// Make framework objects available to handlers and view objects.
		request.setAttribute(WEB_APPLICATION_CONTEXT_ATTRIBUTE, getWebApplicationContext());
		request.setAttribute(LOCALE_RESOLVER_ATTRIBUTE, this.localeResolver);
		request.setAttribute(THEME_RESOLVER_ATTRIBUTE, this.themeResolver);
		request.setAttribute(THEME_SOURCE_ATTRIBUTE, getThemeSource());

		FlashMap inputFlashMap = this.flashMapManager.retrieveAndUpdate(request, response);
		if (inputFlashMap != null) {
			request.setAttribute(INPUT_FLASH_MAP_ATTRIBUTE, Collections.unmodifiableMap(inputFlashMap));
		}
		request.setAttribute(OUTPUT_FLASH_MAP_ATTRIBUTE, new FlashMap());
		request.setAttribute(FLASH_MAP_MANAGER_ATTRIBUTE, this.flashMapManager);

		try {
			doDispatch(request, response);
		}
		finally {
			if (!WebAsyncUtils.getAsyncManager(request).isConcurrentHandlingStarted()) {
				// Restore the original attribute snapshot, in case of an include.
				if (attributesSnapshot != null) {
					restoreAttributesAfterInclude(request, attributesSnapshot);
				}
			}
		}
	}

```

每次请求过来都会将系统的一些属性塞到request的attribute中，以便后面的handlers和view能够访问到。

其中比较重要的是 `doDispatch(request, response)`，正是这个方法使得请求被真正的转发。

```java
/**
	 * Process the actual dispatching to the handler.
	 * <p>The handler will be obtained by applying the servlet's HandlerMappings in order.
	 * The HandlerAdapter will be obtained by querying the servlet's installed HandlerAdapters
	 * to find the first that supports the handler class.
	 * <p>All HTTP methods are handled by this method. It's up to HandlerAdapters or handlers
	 * themselves to decide which methods are acceptable.
	 * @param request current HTTP request
	 * @param response current HTTP response
	 * @throws Exception in case of any kind of processing failure
	 */
	protected void doDispatch(HttpServletRequest request, HttpServletResponse response) throws Exception {
		HttpServletRequest processedRequest = request;
		HandlerExecutionChain mappedHandler = null;
		boolean multipartRequestParsed = false;

		WebAsyncManager asyncManager = WebAsyncUtils.getAsyncManager(request);

		try {
			ModelAndView mv = null;
			Exception dispatchException = null;

			try {
				processedRequest = checkMultipart(request);
				multipartRequestParsed = (processedRequest != request);

				// Determine handler for the current request.
				mappedHandler = getHandler(processedRequest);
				if (mappedHandler == null || mappedHandler.getHandler() == null) {
					noHandlerFound(processedRequest, response);
					return;
				}

				// Determine handler adapter for the current request.
				HandlerAdapter ha = getHandlerAdapter(mappedHandler.getHandler());

				// Process last-modified header, if supported by the handler.
				String method = request.getMethod();
				boolean isGet = "GET".equals(method);
				if (isGet || "HEAD".equals(method)) {
					long lastModified = ha.getLastModified(request, mappedHandler.getHandler());
					if (logger.isDebugEnabled()) {
						logger.debug("Last-Modified value for [" + getRequestUri(request) + "] is: " + lastModified);
					}
					if (new ServletWebRequest(request, response).checkNotModified(lastModified) && isGet) {
						return;
					}
				}

				if (!mappedHandler.applyPreHandle(processedRequest, response)) {
					return;
				}

				// Actually invoke the handler.
				mv = ha.handle(processedRequest, response, mappedHandler.getHandler());

				if (asyncManager.isConcurrentHandlingStarted()) {
					return;
				}

				applyDefaultViewName(processedRequest, mv);
				mappedHandler.applyPostHandle(processedRequest, response, mv);
			}
			catch (Exception ex) {
				dispatchException = ex;
			}
			processDispatchResult(processedRequest, response, mappedHandler, mv, dispatchException);
		}
		catch (Exception ex) {
			triggerAfterCompletion(processedRequest, response, mappedHandler, ex);
		}
		catch (Error err) {
			triggerAfterCompletionWithError(processedRequest, response, mappedHandler, err);
		}
		finally {
			if (asyncManager.isConcurrentHandlingStarted()) {
				// Instead of postHandle and afterCompletion
				if (mappedHandler != null) {
					mappedHandler.applyAfterConcurrentHandlingStarted(processedRequest, response);
				}
			}
			else {
				// Clean up any resources used by a multipart request.
				if (multipartRequestParsed) {
					cleanupMultipart(processedRequest);
				}
			}
		}
	}
```

handler 获取的顺序是从DispatcherServlet的HandlerMapping中按顺序取出的

Handler对应的HandlerAdapter会从安装的HandlerAdapter找，将返回第一个合适的Adapter

```java
  HandlerExecutionChain mappedHandler = null;

  // Determine handler for the current request.
  mappedHandler = getHandler(processedRequest);
              ...
  // Determine handler adapter for the current request.
  HandlerAdapter ha = getHandlerAdapter(mappedHandler.getHandler());
              ...

  if (!mappedHandler.applyPreHandle(processedRequest, response)) {
          return;
  }
  // Actually invoke the handler.
  mv = ha.handle(processedRequest, response, mappedHandler.getHandler());

  mappedHandler.applyPostHandle(processedRequest, response, mv);

  processDispatchResult(processedRequest, response, mappedHandler, mv, dispatchException);
```
在applyPreHandle中也是检查拦截器的操作，并根据拦截器返回的布尔类型，判断是否进一步处理

其中在applyPostHandle中又检查是否有各种拦截器,调用拦截器的postHandle方法

处理完毕后，调用processDispatchResult方法将处理后的请求和mv进行分发

```java
//HandlerExecutionChain.java

		/**
	 * Apply preHandle methods of registered interceptors.
	 * @return {@code true} if the execution chain should proceed with the
	 * next interceptor or the handler itself. Else, DispatcherServlet assumes
	 * that this interceptor has already dealt with the response itself.
	 */
	boolean applyPreHandle(HttpServletRequest request, HttpServletResponse response) throws Exception {
		HandlerInterceptor[] interceptors = getInterceptors();
		if (!ObjectUtils.isEmpty(interceptors)) {
			for (int i = 0; i < interceptors.length; i++) {
				HandlerInterceptor interceptor = interceptors[i];
				if (!interceptor.preHandle(request, response, this.handler)) {
					triggerAfterCompletion(request, response, null);
					return false;
				}
				this.interceptorIndex = i;
			}
		}
		return true;
	}

	/**
	* Apply postHandle methods of registered interceptors.
	*/
	void applyPostHandle(HttpServletRequest request, HttpServletResponse response, ModelAndView mv) throws Exception {
	HandlerInterceptor[] interceptors = getInterceptors();
	if (!ObjectUtils.isEmpty(interceptors)) {
		for (int i = interceptors.length - 1; i >= 0; i--) {
			HandlerInterceptor interceptor = interceptors[i];
			interceptor.postHandle(request, response, this.handler, mv);
		}
	}
```

handler处理后的结果是通过processDispatchResult传出去的

```java
//DispatcherServlet.java

	/**
	 * Handle the result of handler selection and handler invocation, which is
	 * either a ModelAndView or an Exception to be resolved to a ModelAndView.
	 */
	private void processDispatchResult(HttpServletRequest request, HttpServletResponse response,
			HandlerExecutionChain mappedHandler, ModelAndView mv, Exception exception) throws Exception {

		boolean errorView = false;

		if (exception != null) {
			if (exception instanceof ModelAndViewDefiningException) {
				logger.debug("ModelAndViewDefiningException encountered", exception);
				mv = ((ModelAndViewDefiningException) exception).getModelAndView();
			}
			else {
				Object handler = (mappedHandler != null ? mappedHandler.getHandler() : null);
				mv = processHandlerException(request, response, handler, exception);
				errorView = (mv != null);
			}
		}

		// Did the handler return a view to render?
		if (mv != null && !mv.wasCleared()) {
			render(mv, request, response);
			if (errorView) {
				WebUtils.clearErrorRequestAttributes(request);
			}
		}
		else {
			if (logger.isDebugEnabled()) {
				logger.debug("Null ModelAndView returned to DispatcherServlet with name '" + getServletName() +
						"': assuming HandlerAdapter completed request handling");
			}
		}

		if (WebAsyncUtils.getAsyncManager(request).isConcurrentHandlingStarted()) {
			// Concurrent handling started during a forward
			return;
		}

		if (mappedHandler != null) {
			mappedHandler.triggerAfterCompletion(request, response, null);
		}
	}
```

去各种判断，核心的方法就在`render(mv, request, response)`;

它负责渲染返回的`ModelAndView`

```java
//DispatcherServlet.java

	/**
	* Render the given ModelAndView.
	* <p>This is the last stage in handling a request. It may involve resolving the view by name.
	* @param mv the ModelAndView to render
	* @param request current HTTP servlet request
	* @param response current HTTP servlet response
	* @throws ServletException if view is missing or cannot be resolved
	* @throws Exception if there's a problem rendering the view
	*/
	protected void render(ModelAndView mv, HttpServletRequest request, HttpServletResponse response) throws Exception {
		// Determine locale for request and apply it to the response.
		Locale locale = this.localeResolver.resolveLocale(request);
		response.setLocale(locale);

		View view;
		if (mv.isReference()) {
			// We need to resolve the view name.
			view = resolveViewName(mv.getViewName(), mv.getModelInternal(), locale, request);
			if (view == null) {
				throw new ServletException("Could not resolve view with name '" + mv.getViewName() +
						"' in servlet with name '" + getServletName() + "'");
			}
		}
		else {
			// No need to lookup: the ModelAndView object contains the actual View object.
			view = mv.getView();
			if (view == null) {
				throw new ServletException("ModelAndView [" + mv + "] neither contains a view name nor a " +
						"View object in servlet with name '" + getServletName() + "'");
			}
		}

		// Delegate to the View object for rendering.
		if (logger.isDebugEnabled()) {
			logger.debug("Rendering view [" + view + "] in DispatcherServlet with name '" + getServletName() + "'");
		}
		try {
			view.render(mv.getModelInternal(), request, response);
		}
		catch (Exception ex) {
			if (logger.isDebugEnabled()) {
				logger.debug("Error rendering view [" + view + "] in DispatcherServlet with name '" +
						getServletName() + "'", ex);
			}
			throw ex;
		}
	}
```

这个函数解析mv对象，如果是一个引用名就查找对应的view，最终返回一个View对象，

然后将渲染的工作委托给这个view对象，`view.render(mv.getModelInternal(), request, response);`

其中`resolveViewName`方法遍历 `DispatcherServlet`中注册的`viewResolver`，返回第一个非空的结果

查找视图名称的方法如下:
```java

/** List of ViewResolvers used by this servlet */
private List<ViewResolver> viewResolvers;


/**
	* Resolve the given view name into a View object (to be rendered).
	* <p>The default implementations asks all ViewResolvers of this dispatcher.
	* Can be overridden for custom resolution strategies, potentially based on
	* specific model attributes or request parameters.
	* @param viewName the name of the view to resolve
	* @param model the model to be passed to the view
	* @param locale the current locale
	* @param request current HTTP servlet request
	* @return the View object, or {@code null} if none found
	* @throws Exception if the view cannot be resolved
	* (typically in case of problems creating an actual View object)
	* @see ViewResolver#resolveViewName
	*/
	protected View resolveViewName(String viewName, Map<String, Object> model, Locale locale,
		HttpServletRequest request) throws Exception {

			for (ViewResolver viewResolver : this.viewResolvers) {
				View view = viewResolver.resolveViewName(viewName, locale);
				if (view != null) {
					return view;
				}
			}
			return null;
	}
```

最终视图的渲染是View中定义的`render`方法进行的，它是一个抽象的接口

```java
/**
	 * Render the view given the specified model.
	 * <p>The first step will be preparing the request: In the JSP case,
	 * this would mean setting model objects as request attributes.
	 * The second step will be the actual rendering of the view,
	 * for example including the JSP via a RequestDispatcher.
	 * @param model Map with name Strings as keys and corresponding model
	 * objects as values (Map can also be {@code null} in case of empty model)
	 * @param request current HTTP request
	 * @param response HTTP response we are building
	 * @throws Exception if rendering failed
	 */
	void render(Map<String, ?> model, HttpServletRequest request, HttpServletResponse response) throws Exception;
```
