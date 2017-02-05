---
title: Spring MVC 中的异常处理
tags: exception
category: spring
toc: true
date: 2017-01-09 01:57:08
---


## Spring MVC的异常处理

Spring中的异常处理主要有两种方式，*一种*是实现`HandlerExceptionResolver`接口，

这个接口中只有一个方法`resolveException`，返回值是一个`ModelAndView`的对象; 

*另外一种*是使用`@ExceptionHandler`注解作用在方法上，注解的值来指定这个方法能处理的异常的类，

如果注解的值是空的，能处理的类以方法的参数为准。

```java
public interface HandlerExceptionResolver {

    /**
     * Try to resolve the given exception that got thrown during handler execution,
     * returning a {@link ModelAndView} that represents a specific error page if appropriate.
     * <p>The returned {@code ModelAndView} may be {@linkplain ModelAndView#isEmpty() empty}
     * to indicate that the exception has been resolved successfully but that no view
     * should be rendered, for instance by setting a status code.
     * @param request current HTTP request
     * @param response current HTTP response
     * @param handler the executed handler, or {@code null} if none chosen at the
     * time of the exception (for example, if multipart resolution failed)
     * @param ex the exception that got thrown during handler execution
     * @return a corresponding {@code ModelAndView} to forward to, or {@code null}
     * for default processing
     */
    ModelAndView resolveException(
            HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex);

}

//@ExceptionHandler
@Controller
public class SimpleController {

    // @RequestMapping methods omitted ...

    @ExceptionHandler(IOException.class)
    public ResponseEntity<String> handleIOException(IOException ex) {
        // prepare responseEntity
        return responseEntity;
    }

}
```

### 异常相关的类

{% pullquote mindmap %}
#Spring MVC Exception
##HandlerExceptionResolver
###SimpleMappingExceptionResolver
###DefaultHandlerExceptionResolver
##@ExceptionHandler
###@ControllerAdvice
###ResponseEntityExceptionHandler
##Default Servlet Container Error Page
##@ResponseStatus
###ResponseStatusExceptionResolver
{% endpullquote %}

### `SimpleMappingExceptionResolver`

> The SimpleMappingExceptionResolver enables you to take the
class name of any exception that might be thrown and map it to a view name. 

这个Resolver可以将异常对应的类名映射到一个对应的view name上。

```xml
<bean class="org.springframework.web.servlet.handler.SimpleMappingExceptionResolver">
    <property name="exceptionMappings">
        <props>
            <prop key="com.howtodoinjava.demo.exception.AuthException">
                error/authExceptionView
            </prop>
        </props>
    </property>
    <property name="defaultErrorView" value="error/genericView"/>
</bean>
```

### `DefaultHandlerExceptionResolver`

> The DefaultHandlerExceptionResolver translates Spring MVC exceptions to specific error
status codes.

这个Resolver的作用就是将Spring MVC产生的一些异常翻译成对应的http status code。Spring MVC中

默认注册了这个Resolver。

转换列表：

| Exception   |                    HTTP Status Code|
| --- | ----- |
| BindException   |                   400 (Bad Request)|
| ConversionNotSupportedException   |                   500 (Internal Server Error)|
| HttpMediaTypeNotAcceptableException   |                   406 (Not Acceptable)|
| HttpMediaTypeNotSupportedException   |                   415 (Unsupported Media Type)|
| HttpMessageNotReadableException   |                   400 (Bad Request)|
| HttpMessageNotWritableException   |                   500 (Internal Server Error)|
| HttpRequestMethodNotSupportedException   |                   405 (Method Not Allowed)|
| MethodArgumentNotValidException   |                   400 (Bad Request)|
| MissingPathVariableException   |                   500 (Internal Server Error)|
| MissingServletRequestParameterException   |                   400 (Bad Request)|
| MissingServletRequestPartException   |                   400 (Bad Request)|
| NoHandlerFoundException   |                   404 (Not Found)|
| NoSuchRequestHandlingMethodException   |                   404 (Not Found)|

### @ExceptionHandler和@ControllerAdvice

`@ExceptionHandler` 可以指定异常的处理类，`@ControllerAdvice`则可以实现全局的异常统一处理。

两者可配合使用，达到统一处理异常的效果。


> The @ControllerAdvice annotation is a component annotation allowing implementation classes
to be auto-detected through classpath scanning. It is automatically enabled when using the MVC
namespace or the MVC Java config.

`@ControllerAdvice`默认在Spring MVC的命名空间中启用。

> Classes annotated with @ControllerAdvice can contain @ExceptionHandler, @InitBinder,
and @ModelAttribute annotated methods, and these methods will apply to @RequestMapping
methods across all controller hierarchies as opposed to the controller hierarchy within which they are
declared.

`@ControllerAdvice`声明的异常处理方法默认对全局都是有效的。

```java
// Target all Controllers annotated with @RestController
@ControllerAdvice(annotations = RestController.class)
public class AnnotationAdvice {}

// Target all Controllers within specific packages
@ControllerAdvice("org.example.controllers")
public class BasePackageAdvice {}

// Target all Controllers assignable to specific classes
@ControllerAdvice(assignableTypes = {ControllerInterface.class, AbstractController.class})
public class AssignableTypesAdvice {}
```

还有一个`@RestControllerAdvice`和`@ControllerAdvice`相似，只是假定`@ResponseBody`出现在`@ExceptionHandler`上

> @RestControllerAdvice is an alternative where @ExceptionHandler methods assume
@ResponseBody semantics by default.

### `ResponseEntityExceptionHandler`

如果你想使用`@ExceptionHandler`来处理异常的话， 你可以继承这个类。

这个类中定义好了一个异常处理的方法，来处理Spring MVC 的标准异常。

```java
/**
     * Provides handling for standard Spring MVC exceptions.
     * @param ex the target exception
     * @param request the current request
     */
    @ExceptionHandler({
            NoSuchRequestHandlingMethodException.class,
            HttpRequestMethodNotSupportedException.class,
            HttpMediaTypeNotSupportedException.class,
            HttpMediaTypeNotAcceptableException.class,
            MissingPathVariableException.class,
            MissingServletRequestParameterException.class,
            ServletRequestBindingException.class,
            ConversionNotSupportedException.class,
            TypeMismatchException.class,
            HttpMessageNotReadableException.class,
            HttpMessageNotWritableException.class,
            MethodArgumentNotValidException.class,
            MissingServletRequestPartException.class,
            BindException.class,
            NoHandlerFoundException.class
        })
    public final ResponseEntity<Object> handleException(Exception ex, WebRequest request) {

            HttpHeaders headers = new HttpHeaders();

            if (ex instanceof NoSuchRequestHandlingMethodException) {
                HttpStatus status = HttpStatus.NOT_FOUND;
                return handleNoSuchRequestHandlingMethod((NoSuchRequestHandlingMethodException) ex, headers, status, request);
            }
            ...
            ...
    }
```



### @ResponseStatus

用于在自定义异常，设置http的状态码

```java
    @ResponseStatus(value=HttpStatus.NOT_FOUND, reason="No such Order")  // 404
    public class OrderNotFoundException extends RuntimeException {
        // ...
    }
```

Spring MVC 中默认开启了`ResponseStatusExceptionResolver`，这个Resolver会处理上面

设置的Http status code。

> A business exception can be annotated with @ResponseStatus. When the exception is raised, the
ResponseStatusExceptionResolver handles it by setting the status of the response accordingly.
By default the DispatcherServlet registers the ResponseStatusExceptionResolver and it is
available for use.

```java
@Override
    protected ModelAndView doResolveException(HttpServletRequest request, HttpServletResponse response,
            Object handler, Exception ex) {

        ResponseStatus responseStatus = AnnotatedElementUtils.findMergedAnnotation(ex.getClass(), ResponseStatus.class);
        if (responseStatus != null) {
            try {
                return resolveResponseStatus(responseStatus, request, response, handler, ex);
            }
            catch (Exception resolveEx) {
                logger.warn("Handling of @ResponseStatus resulted in Exception", resolveEx);
            }
        }
        else if (ex.getCause() instanceof Exception) {
            ex = (Exception) ex.getCause();
            return doResolveException(request, response, handler, ex);
        }
        return null;
    }
```

通过工具类拿到注解上的值，然后调用内部的`resolveResponseStatus`

```java
protected ModelAndView resolveResponseStatus(ResponseStatus responseStatus, HttpServletRequest request,
            HttpServletResponse response, Object handler, Exception ex) throws Exception {

        int statusCode = responseStatus.code().value();
        String reason = responseStatus.reason();
        if (this.messageSource != null) {
            reason = this.messageSource.getMessage(reason, null, reason, LocaleContextHolder.getLocale());
        }
        if (!StringUtils.hasLength(reason)) {
            response.sendError(statusCode);
        }
        else {
            response.sendError(statusCode, reason);
        }
        return new ModelAndView();
    }
```

最终将http status code 设置到reponse中。



### 源码


Spring MVC 的异常处理在`DispatcherServlet`的`doDispatch`方法中

```java
protected void doDispatch(HttpServletRequest request, HttpServletResponse response) throws Exception {
        HttpServletRequest processedRequest = request;
        HandlerExecutionChain mappedHandler = null;
        boolean multipartRequestParsed = false;

        WebAsyncManager asyncManager = WebAsyncUtils.getAsyncManager(request);

        try {
            ModelAndView mv = null;
            Exception dispatchException = null;

            try {
                //do Handle
                ...
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
            //post process
        }
}

```
在内层的`try-catch`中有一个方法`processDispatchResult`, 在这个方法之前的catch块已经将处理过程可能出现的异常catch住了，并赋值给 `dispatchException`.

然后调用`processDispatchResult`分发给能处理这个异常的`ExceptionResolver`。

```java
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

protected ModelAndView processHandlerException(HttpServletRequest request, HttpServletResponse response,
            Object handler, Exception ex) throws Exception {

        // Check registered HandlerExceptionResolvers...
        ModelAndView exMv = null;
        for (HandlerExceptionResolver handlerExceptionResolver : this.handlerExceptionResolvers) {
            exMv = handlerExceptionResolver.resolveException(request, response, handler, ex);
            if (exMv != null) {
                break;
            }
        }
        if (exMv != null) {
            if (exMv.isEmpty()) {
                request.setAttribute(EXCEPTION_ATTRIBUTE, ex);
                return null;
            }
            // We might still need view name translation for a plain error model...
            if (!exMv.hasView()) {
                exMv.setViewName(getDefaultViewName(request));
            }
            if (logger.isDebugEnabled()) {
                logger.debug("Handler execution resulted in exception - forwarding to resolved error view: " + exMv, ex);
            }
            WebUtils.exposeErrorRequestAttributes(request, ex, getServletName());
            return exMv;
        }

        throw ex;
    }

```

这个异常的处理和之前，查找handler的过程是一样的。

遍历所有已经注册的`HandlerExceptionResolver`, 找到第一个能处理的。

#### @ExceptionHandler的处理

```java
/**
 * Implementation of the {@link org.springframework.web.portlet.HandlerExceptionResolver} interface that handles
 * exceptions through the {@link ExceptionHandler} annotation.
 *
 * <p>This exception resolver is enabled by default in the {@link org.springframework.web.portlet.DispatcherPortlet}.
 *
 * @author Arjen Poutsma
 * @author Juergen Hoeller
 * @since 3.0
 */
public class AnnotationMethodHandlerExceptionResolver extends AbstractHandlerExceptionResolver {
    ...

    @Override
    protected ModelAndView doResolveException(
            PortletRequest request, MimeResponse response, Object handler, Exception ex) {

        if (handler != null) {
            Method handlerMethod = findBestExceptionHandlerMethod(handler, ex);
            if (handlerMethod != null) {
                NativeWebRequest webRequest = new PortletWebRequest(request, response);
                try {
                    Object[] args = resolveHandlerArguments(handlerMethod, handler, webRequest, ex);
                    if (logger.isDebugEnabled()) {
                        logger.debug("Invoking request handler method: " + handlerMethod);
                    }
                    Object retVal = doInvokeMethod(handlerMethod, handler, args);
                    return getModelAndView(retVal);
                }
                catch (Exception invocationEx) {
                    logger.error("Invoking request method resulted in exception : " + handlerMethod, invocationEx);
                }
            }
        }
        return null;
    }

}

```

和普通的处理类似，从所有标注了`@ExceptionHandler`的方法中找到最佳匹配，然后解析参数，调用。

## web容器的错误处理

`WEB-INF/web.xml`

```xml
<error-page>
    <error-code>500</error-code>
    <location>/Error.jsp</location>
</error-page>

<error-page>
    <exception-type>java.lang.Exception</exception-type>
    <location>/Error.jsp</location>
</error-page>
```

location中的值可以是一个jsp，也可以是一个URL（包括`@Controller`注解的）

处理error的Controller示例：

```java
@Controller
public class ErrorController {

    @RequestMapping(path = "/error", produces = MediaType.APPLICATION_JSON_UTF8_VALUE)
    @ResponseBody
    public Map<String, Object> handle(HttpServletRequest request) {

        Map<String, Object> map = new HashMap<String, Object>();
        map.put("status", request.getAttribute("javax.servlet.error.status_code"));
        map.put("reason", request.getAttribute("javax.servlet.error.message"));

        return map;
    }

}
```

JSP示例：

```
<%@ page contentType="application/json" pageEncoding="UTF-8"%>
{
status:<%=request.getAttribute("javax.servlet.error.status_code") %>,
reason:<%=request.getAttribute("javax.servlet.error.message") %>
}
```


## 参考

1. [SpringMVC 异常处理 - 纵酒挥刀斩人头 - 博客园](http://www.cnblogs.com/hupengcool/p/4586910.html)

2. [22. Web MVC framework](https://docs.spring.io/spring/docs/current/spring-framework-reference/html/mvc.html#mvc-exceptionhandlers)

3. [Spring MVC Mapping Exceptions to Views Example | Spring MVC SimpleMappingExceptionResolver Example](http://howtodoinjava.com/spring/spring-mvc/spring-mvc-simplemappingexceptionresolver-example/)

4. [java - Custom Error Page in Tomcat 7 for Error Code 500 - Stack Overflow](http://stackoverflow.com/questions/15987212/custom-error-page-in-tomcat-7-for-error-code-500)