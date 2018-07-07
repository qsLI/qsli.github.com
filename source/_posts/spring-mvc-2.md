title: Spring Mvc源码剖析(二)
tags: spring mvc
category: spring
toc: true
date: 2018-05-06 17:16:48
---



启动流程的分析见: {% post_link spring-mvc %}

{%  asset_img   spring-mvc.png  %}

## 源码版本

>4.3.6.RELEASE

## HandlerExecutionChain

*request -> executionchain*

// RequestMappingHandlerMapping
遍历已有的`HandlerMapping`, 找到第一个能处理的`HandlerMapping`

```java
protected HandlerExecutionChain getHandler(HttpServletRequest request) throws Exception {
		for (HandlerMapping hm : this.handlerMappings) {
			if (logger.isTraceEnabled()) {
				logger.trace(
						"Testing handler map [" + hm + "] in DispatcherServlet with name '" + getServletName() + "'");
			}
			HandlerExecutionChain handler = hm.getHandler(request);
			if (handler != null) {
				return handler;
			}
		}
		return null;
	}
```

handlerMappings的值默认是:

```
this.handlerMappings = {ArrayList@5980}  size = 2
 0 = {RequestMappingHandlerMapping@5997} 
 1 = {BeanNameUrlHandlerMapping@6002} 
```

org.springframework.web.servlet.handler.AbstractHandlerMapping#getHandler

executionchain就是interceptor和实际处理方法的结合体


### 映射关系

*url -> HandlerMethod*

org.springframework.web.servlet.handler.AbstractHandlerMethodMapping#getHandlerInternal

`HandlerMethod`是具体的controller对应的方法.

```
mappingLookup = {LinkedHashMap@6069}  size = 4
 0 = {LinkedHashMap$Entry@6077} "{[/async]}" -> "public java.util.concurrent.Callable<java.lang.String> com.air.mvc.AsyncController.asyncProcess()"
 1 = {LinkedHashMap$Entry@6078} "{[/asyncV2]}" -> "public org.springframework.web.context.request.async.DeferredResult<java.lang.String> com.air.mvc.AsyncController.aysncProcess2()"
 2 = {LinkedHashMap$Entry@6079} "{[/mvc/echo]}" -> "private java.lang.String com.air.mvc.SampleController.echo(javax.servlet.http.HttpServletRequest)"
 3 = {LinkedHashMap$Entry@6080} "{[/mvc/test]}" -> "private java.lang.String com.air.mvc.SampleController.echo(java.lang.String)"
```


### interceptor

*url -> interceptors*

```java
//  /mvc/test
String lookupPath = this.urlPathHelper.getLookupPathForRequest(request);
		for (HandlerInterceptor interceptor : this.adaptedInterceptors) {
			if (interceptor instanceof MappedInterceptor) {
				MappedInterceptor mappedInterceptor = (MappedInterceptor) interceptor;
				if (mappedInterceptor.matches(lookupPath, this.pathMatcher)) {
					chain.addInterceptor(mappedInterceptor.getInterceptor());
				}
			}
			else {
				chain.addInterceptor(interceptor);
			}
		}
```


## HandlerAdapter

*HandlerMethod -> HandlerAdapter*

// RequestMappingHandlerAdapter
org.springframework.web.servlet.DispatcherServlet#getHandlerAdapter

遍历所有的`HandlerAdapters`, 找到第一个能处理的`HandlerAdapter`

```java
protected HandlerAdapter getHandlerAdapter(Object handler) throws ServletException {
		for (HandlerAdapter ha : this.handlerAdapters) {
			if (logger.isTraceEnabled()) {
				logger.trace("Testing handler adapter [" + ha + "]");
			}
			if (ha.supports(handler)) {
				return ha;
			}
		}
		throw new ServletException("No adapter for handler [" + handler +
				"]: The DispatcherServlet configuration needs to include a HandlerAdapter that supports this handler");
	}
```
默认的`HandlerAdapters`

```
this.handlerAdapters = {ArrayList@5983}  size = 3
 0 = {RequestMappingHandlerAdapter@4845} 
 1 = {HttpRequestHandlerAdapter@6268} 
 2 = {SimpleControllerHandlerAdapter@6269} 
```

涉及到的请求处理:

    a. org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter#invokeHandlerMethod
        调用对应的controller方法

    b. org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter#getModelAndView
        返回模型和视图

## ServletInvocableHandlerMethod

*HandlerMethod -> ServletInvocableHandlerMethod*

org.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod#invokeAndHandle

   a. InvocableHandlerMethod#invokeForRequest

        1. 解析传递的参数, 必要时进行转换(resolver负责映射输入的参数名称和controller方法对应的参数, dataBinder负责类型转换和校验)
        2. 反射调用对应的方法

    b. returnValueHandlers#handleReturnValue
        从所有的handler中找到第一个支持对应返回值类型的处理返回值, 可能涉及`HttpMessageConverter`

### argumentResolvers

```
this.argumentResolvers = {HandlerMethodArgumentResolverComposite@4853} 
 logger = {SLF4JLocationAwareLog@6533} 
 argumentResolvers = {LinkedList@6534}  size = 26
  0 = {RequestParamMethodArgumentResolver@5292} 
  1 = {RequestParamMapMethodArgumentResolver@6541} 
  2 = {PathVariableMethodArgumentResolver@6542} 
  3 = {PathVariableMapMethodArgumentResolver@6543} 
  4 = {MatrixVariableMethodArgumentResolver@6544} 
  5 = {MatrixVariableMapMethodArgumentResolver@6545} 
  6 = {ServletModelAttributeMethodProcessor@6546} 
  7 = {RequestResponseBodyMethodProcessor@6547} 
  8 = {RequestPartMethodArgumentResolver@6548} 
  9 = {RequestHeaderMethodArgumentResolver@6549} 
  10 = {RequestHeaderMapMethodArgumentResolver@6550} 
  11 = {ServletCookieValueMethodArgumentResolver@6551} 
  12 = {ExpressionValueMethodArgumentResolver@6552} 
  13 = {SessionAttributeMethodArgumentResolver@6553} 
  14 = {RequestAttributeMethodArgumentResolver@6554} 
  15 = {ServletRequestMethodArgumentResolver@6555} 
  16 = {ServletResponseMethodArgumentResolver@6556} 
  17 = {HttpEntityMethodProcessor@6557} 
  18 = {RedirectAttributesMethodArgumentResolver@6558} 
  19 = {ModelMethodProcessor@6559} 
  20 = {MapMethodProcessor@6560} 
  21 = {ErrorsMethodArgumentResolver@6561} 
  22 = {SessionStatusMethodArgumentResolver@6562} 
  23 = {UriComponentsBuilderMethodArgumentResolver@6563} 
  24 = {RequestParamMethodArgumentResolver@6564} 
  25 = {ServletModelAttributeMethodProcessor@6565} 
 argumentResolverCache = {ConcurrentHashMap@6535}  size = 1
  0 = {ConcurrentHashMap$MapEntry@6538} "method 'echo' parameter 0" -> 
   key = {HandlerMethod$HandlerMethodParameter@5293} "method 'echo' parameter 0"
   value = {RequestParamMethodArgumentResolver@5292} 
```


### returnValueHandlers

```
this.returnValueHandlers = {HandlerMethodReturnValueHandlerComposite@4855} 
 logger = {SLF4JLocationAwareLog@6567} 
 returnValueHandlers = {ArrayList@6568}  size = 15
  0 = {ModelAndViewMethodReturnValueHandler@6570} 
  1 = {ModelMethodProcessor@6571} 
  2 = {ViewMethodReturnValueHandler@6572} 
  3 = {ResponseBodyEmitterReturnValueHandler@6573} 
  4 = {StreamingResponseBodyReturnValueHandler@6574} 
  5 = {HttpEntityMethodProcessor@6575} 
  6 = {HttpHeadersReturnValueHandler@6576} 
  7 = {CallableMethodReturnValueHandler@6577} 
  8 = {DeferredResultMethodReturnValueHandler@6578} 
  9 = {AsyncTaskMethodReturnValueHandler@6579} 
  10 = {ModelAttributeMethodProcessor@6580} 
  11 = {RequestResponseBodyMethodProcessor@6581} 
  12 = {ViewNameMethodReturnValueHandler@6582} 
  13 = {MapMethodProcessor@6583} 
  14 = {ModelAttributeMethodProcessor@6584} 
```

### binderFactory

```
binderFactory = {ServletRequestDataBinderFactory@6498} 
 binderMethods = {ArrayList@6585}  size = 0
 initializer = {ConfigurableWebBindingInitializer@4859} 
  autoGrowNestedPaths = true
  directFieldAccess = false
  messageCodesResolver = null
  bindingErrorProcessor = null
  validator = null
  conversionService = {DefaultFormattingConversionService@6586} "ConversionService converters =\n\t@org.springframework.format.annotation.DateTimeFormat java.lang.Long -> java.lang.String: org.springframework.format.datetime.DateTimeFormatAnnotationFormatterFactory@6e62d1c,@org.springframework.format.annotation.NumberFormat java.lang.Long -> java.lang.String: org.springframework.format.number.NumberFormatAnnotationFormatterFactory@44f758c9\n\t@org.springframework.format.annotation.DateTimeFormat java.time.LocalDate -> java.lang.String: org.springframework.format.datetime.standard.Jsr310DateTimeFormatAnnotationFormatterFactory@30fbf8e3,java.time.LocalDate -> java.lang.String : org.springframework.format.datetime.standard.TemporalAccessorPrinter@4ec42ea0\n\t@org.springframework.format.annotation.DateTimeFormat java.time.LocalDateTime -> java.lang.String: org.springframework.format.datetime.standard.Jsr310DateTimeFormatAnnotationFormatterFactory@30fbf8e3,java.time.LocalDateTime -> java.lang.String : org.springframework.format.datetime.standard.TemporalAccess"
   embeddedValueResolver = {EmbeddedValueResolver@6003} 
   cachedPrinters = {ConcurrentHashMap@6588}  size = 0
   cachedParsers = {ConcurrentHashMap@6589}  size = 0
   converters = {GenericConversionService$Converters@6590} "ConversionService converters =\n\t@org.springframework.format.annotation.DateTimeFormat java.lang.Long -> java.lang.String: org.springframework.format.datetime.DateTimeFormatAnnotationFormatterFactory@6e62d1c,@org.springframework.format.annotation.NumberFormat java.lang.Long -> java.lang.String: org.springframework.format.number.NumberFormatAnnotationFormatterFactory@44f758c9\n\t@org.springframework.format.annotation.DateTimeFormat java.time.LocalDate -> java.lang.String: org.springframework.format.datetime.standard.Jsr310DateTimeFormatAnnotationFormatterFactory@30fbf8e3,java.time.LocalDate -> java.lang.String : org.springframework.format.datetime.standard.TemporalAccessorPrinter@4ec42ea0\n\t@org.springframework.format.annotation.DateTimeFormat java.time.LocalDateTime -> java.lang.String: org.springframework.format.datetime.standard.Jsr310DateTimeFormatAnnotationFormatterFactory@30fbf8e3,java.time.LocalDateTime -> java.lang.String : org.springframework.format.datetime.standard.TemporalAccess"
    globalConverters = {LinkedHashSet@6593}  size = 0
    converters = {LinkedHashMap@6594}  size = 118
     0 = {LinkedHashMap$Entry@6597} "java.lang.Number -> java.lang.Number" -> "java.lang.Number -> java.lang.Number : org.springframework.core.convert.support.NumberToNumberConverterFactory@76561efa"
     1 = {LinkedHashMap$Entry@6598} "java.lang.String -> java.lang.Number" -> "java.lang.String -> java.lang.Number : org.springframework.core.convert.support.StringToNumberConverterFactory@1bf7855e"
     2 = {LinkedHashMap$Entry@6599} "java.lang.Number -> java.lang.String" -> "java.lang.Number -> java.lang.String : org.springframework.core.convert.support.ObjectToStringConverter@3932e255"
     3 = {LinkedHashMap$Entry@6600} "java.lang.String -> java.lang.Character" -> "java.lang.String -> java.lang.Character : org.springframework.core.convert.support.StringToCharacterConverter@55a6b63f"
     4 = {LinkedHashMap$Entry@6601} "java.lang.Character -> java.lang.String" -> "java.lang.Character -> java.lang.String : org.springframework.core.convert.support.ObjectToStringConverter@1341d3bf"
     5 = {LinkedHashMap$Entry@6602} "java.lang.Number -> java.lang.Character" -> "java.lang.Number -> java.lang.Character : org.springframework.core.convert.support.NumberToCharacterConverter@34bb79fc"
     6 = {LinkedHashMap$Entry@6603} "java.lang.Character -> java.lang.Number" -> "java.lang.Character -> java.lang.Number : org.springframework.core.convert.support.CharacterToNumberFactory@1ab51574"
     7 = {LinkedHashMap$Entry@6604} "java.lang.String -> java.lang.Boolean" -> "java.lang.String -> java.lang.Boolean : org.springframework.core.convert.support.StringToBooleanConverter@7ac24f53"
     8 = {LinkedHashMap$Entry@6605} "java.lang.Boolean -> java.lang.String" -> "java.lang.Boolean -> java.lang.String : org.springframework.core.convert.support.ObjectToStringConverter@6703b79f"
     9 = {LinkedHashMap$Entry@6606} "java.lang.String -> java.lang.Enum" -> "java.lang.String -> java.lang.Enum : org.springframework.core.convert.support.StringToEnumConverterFactory@898561a"
     10 = {LinkedHashMap$Entry@6607} "java.lang.Enum -> java.lang.String" -> "java.lang.Enum -> java.lang.String : org.springframework.core.convert.support.EnumToStringConverter@3a34ecc8"
     11 = {LinkedHashMap$Entry@6608} "java.lang.Integer -> java.lang.Enum" -> "java.lang.Integer -> java.lang.Enum : org.springframework.core.convert.support.IntegerToEnumConverterFactory@52e4840a"
     12 = {LinkedHashMap$Entry@6609} "java.lang.Enum -> java.lang.Integer" -> "java.lang.Enum -> java.lang.Integer : org.springframework.core.convert.support.EnumToIntegerConverter@28217e86"
     13 = {LinkedHashMap$Entry@6610} "java.lang.String -> java.util.Locale" -> "java.lang.String -> java.util.Locale : org.springframework.core.convert.support.StringToLocaleConverter@6243d51e"
     14 = {LinkedHashMap$Entry@6611} "java.util.Locale -> java.lang.String" -> "java.util.Locale -> java.lang.String : org.springframework.core.convert.support.ObjectToStringConverter@7f8c2732"
     15 = {LinkedHashMap$Entry@6612} "java.lang.String -> java.nio.charset.Charset" -> "java.lang.String -> java.nio.charset.Charset : org.springframework.core.convert.support.StringToCharsetConverter@93e281d"
     16 = {LinkedHashMap$Entry@6613} "java.nio.charset.Charset -> java.lang.String" -> "java.nio.charset.Charset -> java.lang.String : org.springframework.core.convert.support.ObjectToStringConverter@2ac8a2f2"
     17 = {LinkedHashMap$Entry@6614} "java.lang.String -> java.util.Currency" -> "java.lang.String -> java.util.Currency : org.springframework.core.convert.support.StringToCurrencyConverter@565f7990"
     18 = {LinkedHashMap$Entry@6615} "java.util.Currency -> java.lang.String" -> "java.util.Currency -> java.lang.String : org.springframework.core.convert.support.ObjectToStringConverter@487461de"
     19 = {LinkedHashMap$Entry@6616} "java.lang.String -> java.util.Properties" -> "java.lang.String -> java.util.Properties : org.springframework.core.convert.support.StringToPropertiesConverter@3072d60d"
     20 = {LinkedHashMap$Entry@6617} "java.util.Properties -> java.lang.String" -> "java.util.Properties -> java.lang.String : org.springframework.core.convert.support.PropertiesToStringConverter@5f423dc3"
     21 = {LinkedHashMap$Entry@6618} "java.lang.String -> java.util.UUID" -> "java.lang.String -> java.util.UUID : org.springframework.core.convert.support.StringToUUIDConverter@72fc4c42"
     22 = {LinkedHashMap$Entry@6619} "java.util.UUID -> java.lang.String" -> "java.util.UUID -> java.lang.String : org.springframework.core.convert.support.ObjectToStringConverter@196db952"
     23 = {LinkedHashMap$Entry@6620} "[Ljava.lang.Object; -> java.util.Collection" -> "org.springframework.core.convert.support.ArrayToCollectionConverter@3f09c6cc"
     24 = {LinkedHashMap$Entry@6621} "java.util.Collection -> [Ljava.lang.Object;" -> "org.springframework.core.convert.support.CollectionToArrayConverter@716b58cb"
     25 = {LinkedHashMap$Entry@6622} "[Ljava.lang.Object; -> [Ljava.lang.Object;" -> "org.springframework.core.convert.support.ArrayToArrayConverter@61e594f8"
     26 = {LinkedHashMap$Entry@6623} "java.util.Collection -> java.util.Collection" -> "org.springframework.core.convert.support.CollectionToCollectionConverter@153616bf"
     27 = {LinkedHashMap$Entry@6624} "java.util.Map -> java.util.Map" -> "org.springframework.core.convert.support.MapToMapConverter@64f88d73"
     28 = {LinkedHashMap$Entry@6625} "[Ljava.lang.Object; -> java.lang.String" -> "org.springframework.core.convert.support.ArrayToStringConverter@4f7e3c27"
     29 = {LinkedHashMap$Entry@6626} "java.lang.String -> [Ljava.lang.Object;" -> "org.springframework.core.convert.support.StringToArrayConverter@2713364"
     30 = {LinkedHashMap$Entry@6627} "[Ljava.lang.Object; -> java.lang.Object" -> "org.springframework.core.convert.support.ArrayToObjectConverter@27574e7b"
     31 = {LinkedHashMap$Entry@6628} "java.lang.Object -> [Ljava.lang.Object;" -> "org.springframework.core.convert.support.ObjectToArrayConverter@7e4ccf7"
     32 = {LinkedHashMap$Entry@6629} "java.util.Collection -> java.lang.String" -> "org.springframework.core.convert.support.CollectionToStringConverter@39455728"
     33 = {LinkedHashMap$Entry@6630} "java.lang.String -> java.util.Collection" -> "org.springframework.core.convert.support.StringToCollectionConverter@32a4a977"
     34 = {LinkedHashMap$Entry@6631} "java.util.Collection -> java.lang.Object" -> "org.springframework.core.convert.support.CollectionToObjectConverter@2f1d1dce"
     35 = {LinkedHashMap$Entry@6632} "java.lang.Object -> java.util.Collection" -> "org.springframework.core.convert.support.ObjectToCollectionConverter@ebfffae"
     36 = {LinkedHashMap$Entry@6633} "[Ljava.lang.Object; -> java.util.stream.Stream" -> "org.springframework.core.convert.support.StreamConverter@1d500546"
     37 = {LinkedHashMap$Entry@6634} "java.util.Collection -> java.util.stream.Stream" -> "org.springframework.core.convert.support.StreamConverter@1d500546"
     38 = {LinkedHashMap$Entry@6635} "java.util.stream.Stream -> java.util.Collection" -> "org.springframework.core.convert.support.StreamConverter@1d500546"
     39 = {LinkedHashMap$Entry@6636} "java.util.stream.Stream -> [Ljava.lang.Object;" -> "org.springframework.core.convert.support.StreamConverter@1d500546"
     40 = {LinkedHashMap$Entry@6637} "java.nio.ByteBuffer -> [B" -> "org.springframework.core.convert.support.ByteBufferConverter@aa8e88a"
     41 = {LinkedHashMap$Entry@6638} "java.nio.ByteBuffer -> java.lang.Object" -> "org.springframework.core.convert.support.ByteBufferConverter@aa8e88a"
     42 = {LinkedHashMap$Entry@6639} "java.lang.Object -> java.nio.ByteBuffer" -> "org.springframework.core.convert.support.ByteBufferConverter@aa8e88a"
     43 = {LinkedHashMap$Entry@6640} "[B -> java.nio.ByteBuffer" -> "org.springframework.core.convert.support.ByteBufferConverter@aa8e88a"
     44 = {LinkedHashMap$Entry@6641} "java.lang.String -> java.util.TimeZone" -> "java.lang.String -> java.util.TimeZone : org.springframework.core.convert.support.StringToTimeZoneConverter@4d1c677c"
     45 = {LinkedHashMap$Entry@6642} "java.time.ZoneId -> java.util.TimeZone" -> "java.time.ZoneId -> java.util.TimeZone : org.springframework.core.convert.support.ZoneIdToTimeZoneConverter@3c2fb3fe"
     46 = {LinkedHashMap$Entry@6643} "java.time.ZonedDateTime -> java.util.Calendar" -> "java.time.ZonedDateTime -> java.util.Calendar : org.springframework.core.convert.support.ZonedDateTimeToCalendarConverter@2148eb08"
     47 = {LinkedHashMap$Entry@6644} "java.lang.Object -> java.lang.Object" -> "org.springframework.core.convert.support.IdToEntityConverter@6c69ab13,org.springframework.core.convert.support.ObjectToObjectConverter@42600665"
     48 = {LinkedHashMap$Entry@6645} "java.lang.Object -> java.lang.String" -> "org.springframework.core.convert.support.FallbackObjectToStringConverter@311fd94"
     49 = {LinkedHashMap$Entry@6646} "java.lang.Object -> java.util.Optional" -> "org.springframework.core.convert.support.ObjectToOptionalConverter@65e75655"
     50 = {LinkedHashMap$Entry@6647} "java.lang.Integer -> java.lang.String" -> "@org.springframework.format.annotation.NumberFormat java.lang.Integer -> java.lang.String: org.springframework.format.number.NumberFormatAnnotationFormatterFactory@44f758c9"
     51 = {LinkedHashMap$Entry@6648} "java.lang.String -> java.lang.Integer" -> "java.lang.String -> @org.springframework.format.annotation.NumberFormat java.lang.Integer: org.springframework.format.number.NumberFormatAnnotationFormatterFactory@44f758c9"
     52 = {LinkedHashMap$Entry@6649} "java.lang.Float -> java.lang.String" -> "@org.springframework.format.annotation.NumberFormat java.lang.Float -> java.lang.String: org.springframework.format.number.NumberFormatAnnotationFormatterFactory@44f758c9"
     53 = {LinkedHashMap$Entry@6650} "java.lang.String -> java.lang.Float" -> "java.lang.String -> @org.springframework.format.annotation.NumberFormat java.lang.Float: org.springframework.format.number.NumberFormatAnnotationFormatterFactory@44f758c9"
     54 = {LinkedHashMap$Entry@6651} "java.math.BigInteger -> java.lang.String" -> "@org.springframework.format.annotation.NumberFormat java.math.BigInteger -> java.lang.String: org.springframework.format.number.NumberFormatAnnotationFormatterFactory@44f758c9"
     55 = {LinkedHashMap$Entry@6652} "java.lang.String -> java.math.BigInteger" -> "java.lang.String -> @org.springframework.format.annotation.NumberFormat java.math.BigInteger: org.springframework.format.number.NumberFormatAnnotationFormatterFactory@44f758c9"
     56 = {LinkedHashMap$Entry@6653} "java.lang.Byte -> java.lang.String" -> "@org.springframework.format.annotation.NumberFormat java.lang.Byte -> java.lang.String: org.springframework.format.number.NumberFormatAnnotationFormatterFactory@44f758c9"
     57 = {LinkedHashMap$Entry@6654} "java.lang.String -> java.lang.Byte" -> "java.lang.String -> @org.springframework.format.annotation.NumberFormat java.lang.Byte: org.springframework.format.number.NumberFormatAnnotationFormatterFactory@44f758c9"
     58 = {LinkedHashMap$Entry@6655} "java.lang.Double -> java.lang.String" -> "@org.springframework.format.annotation.NumberFormat java.lang.Double -> java.lang.String: org.springframework.format.number.NumberFormatAnnotationFormatterFactory@44f758c9"
     59 = {LinkedHashMap$Entry@6656} "java.lang.String -> java.lang.Double" -> "java.lang.String -> @org.springframework.format.annotation.NumberFormat java.lang.Double: org.springframework.format.number.NumberFormatAnnotationFormatterFactory@44f758c9"
     60 = {LinkedHashMap$Entry@6657} "java.lang.Short -> java.lang.String" -> "@org.springframework.format.annotation.NumberFormat java.lang.Short -> java.lang.String: org.springframework.format.number.NumberFormatAnnotationFormatterFactory@44f758c9"
     61 = {LinkedHashMap$Entry@6658} "java.lang.String -> java.lang.Short" -> "java.lang.String -> @org.springframework.format.annotation.NumberFormat java.lang.Short: org.springframework.format.number.NumberFormatAnnotationFormatterFactory@44f758c9"
     62 = {LinkedHashMap$Entry@6659} "java.lang.Long -> java.lang.String" -> "@org.springframework.format.annotation.DateTimeFormat java.lang.Long -> java.lang.String: org.springframework.format.datetime.DateTimeFormatAnnotationFormatterFactory@6e62d1c,@org.springframework.format.annotation.NumberFormat java.lang.Long -> java.lang.String: org.springframework.format.number.NumberFormatAnnotationFormatterFactory@44f758c9"
     63 = {LinkedHashMap$Entry@6660} "java.lang.String -> java.lang.Long" -> "java.lang.String -> @org.springframework.format.annotation.DateTimeFormat java.lang.Long: org.springframework.format.datetime.DateTimeFormatAnnotationFormatterFactory@6e62d1c,java.lang.String -> @org.springframework.format.annotation.NumberFormat java.lang.Long: org.springframework.format.number.NumberFormatAnnotationFormatterFactory@44f758c9"
     64 = {LinkedHashMap$Entry@6661} "java.math.BigDecimal -> java.lang.String" -> "@org.springframework.format.annotation.NumberFormat java.math.BigDecimal -> java.lang.String: org.springframework.format.number.NumberFormatAnnotationFormatterFactory@44f758c9"
     65 = {LinkedHashMap$Entry@6662} "java.lang.String -> java.math.BigDecimal" -> "java.lang.String -> @org.springframework.format.annotation.NumberFormat java.math.BigDecimal: org.springframework.format.number.NumberFormatAnnotationFormatterFactory@44f758c9"
     66 = {LinkedHashMap$Entry@6663} "java.util.Date -> java.lang.Long" -> "java.util.Date -> java.lang.Long : org.springframework.format.datetime.DateFormatterRegistrar$DateToLongConverter@a178d09,java.util.Date -> java.lang.Long : org.springframework.format.datetime.DateFormatterRegistrar$DateToLongConverter@551d27e0"
     67 = {LinkedHashMap$Entry@6664} "java.util.Date -> java.util.Calendar" -> "java.util.Date -> java.util.Calendar : org.springframework.format.datetime.DateFormatterRegistrar$DateToCalendarConverter@2bd20c9a,java.util.Date -> java.util.Calendar : org.springframework.format.datetime.DateFormatterRegistrar$DateToCalendarConverter@1c6b5a31"
     68 = {LinkedHashMap$Entry@6665} "java.util.Calendar -> java.util.Date" -> "java.util.Calendar -> java.util.Date : org.springframework.format.datetime.DateFormatterRegistrar$CalendarToDateConverter@2aa2f370,java.util.Calendar -> java.util.Date : org.springframework.format.datetime.DateFormatterRegistrar$CalendarToDateConverter@163cf3e3"
     69 = {LinkedHashMap$Entry@6666} "java.util.Calendar -> java.lang.Long" -> "java.util.Calendar -> java.lang.Long : org.springframework.format.datetime.DateFormatterRegistrar$CalendarToLongConverter@2db18b62,java.util.Calendar -> java.lang.Long : org.springframework.format.datetime.DateFormatterRegistrar$CalendarToLongConverter@6bcdf637"
     70 = {LinkedHashMap$Entry@6667} "java.lang.Long -> java.util.Date" -> "java.lang.Long -> java.util.Date : org.springframework.format.datetime.DateFormatterRegistrar$LongToDateConverter@56c9b14d,java.lang.Long -> java.util.Date : org.springframework.format.datetime.DateFormatterRegistrar$LongToDateConverter@271bf39c"
     71 = {LinkedHashMap$Entry@6668} "java.lang.Long -> java.util.Calendar" -> "java.lang.Long -> java.util.Calendar : org.springframework.format.datetime.DateFormatterRegistrar$LongToCalendarConverter@6d08686,java.lang.Long -> java.util.Calendar : org.springframework.format.datetime.DateFormatterRegistrar$LongToCalendarConverter@2a8b425"
     72 = {LinkedHashMap$Entry@6669} "java.time.LocalDateTime -> java.time.LocalDate" -> "java.time.LocalDateTime -> java.time.LocalDate : org.springframework.format.datetime.standard.DateTimeConverters$LocalDateTimeToLocalDateConverter@19f02ee4"
     73 = {LinkedHashMap$Entry@6670} "java.time.LocalDateTime -> java.time.LocalTime" -> "java.time.LocalDateTime -> java.time.LocalTime : org.springframework.format.datetime.standard.DateTimeConverters$LocalDateTimeToLocalTimeConverter@618fb955"
     74 = {LinkedHashMap$Entry@6671} "java.time.ZonedDateTime -> java.time.LocalDate" -> "java.time.ZonedDateTime -> java.time.LocalDate : org.springframework.format.datetime.standard.DateTimeConverters$ZonedDateTimeToLocalDateConverter@63e9f754"
     75 = {LinkedHashMap$Entry@6672} "java.time.ZonedDateTime -> java.time.LocalTime" -> "java.time.ZonedDateTime -> java.time.LocalTime : org.springframework.format.datetime.standard.DateTimeConverters$ZonedDateTimeToLocalTimeConverter@24a76e90"
     76 = {LinkedHashMap$Entry@6673} "java.time.ZonedDateTime -> java.time.LocalDateTime" -> "java.time.ZonedDateTime -> java.time.LocalDateTime : org.springframework.format.datetime.standard.DateTimeConverters$ZonedDateTimeToLocalDateTimeConverter@3cb8e3ee"
     77 = {LinkedHashMap$Entry@6674} "java.time.ZonedDateTime -> java.time.OffsetDateTime" -> "java.time.ZonedDateTime -> java.time.OffsetDateTime : org.springframework.format.datetime.standard.DateTimeConverters$ZonedDateTimeToOffsetDateTimeConverter@2061a03d"
     78 = {LinkedHashMap$Entry@6675} "java.time.ZonedDateTime -> java.time.Instant" -> "java.time.ZonedDateTime -> java.time.Instant : org.springframework.format.datetime.standard.DateTimeConverters$ZonedDateTimeToInstantConverter@c1ea032"
     79 = {LinkedHashMap$Entry@6676} "java.time.OffsetDateTime -> java.time.LocalDate" -> "java.time.OffsetDateTime -> java.time.LocalDate : org.springframework.format.datetime.standard.DateTimeConverters$OffsetDateTimeToLocalDateConverter@13d29ccf"
     80 = {LinkedHashMap$Entry@6677} "java.time.OffsetDateTime -> java.time.LocalTime" -> "java.time.OffsetDateTime -> java.time.LocalTime : org.springframework.format.datetime.standard.DateTimeConverters$OffsetDateTimeToLocalTimeConverter@680eaac8"
     81 = {LinkedHashMap$Entry@6678} "java.time.OffsetDateTime -> java.time.LocalDateTime" -> "java.time.OffsetDateTime -> java.time.LocalDateTime : org.springframework.format.datetime.standard.DateTimeConverters$OffsetDateTimeToLocalDateTimeConverter@45438fbc"
     82 = {LinkedHashMap$Entry@6679} "java.time.OffsetDateTime -> java.time.ZonedDateTime" -> "java.time.OffsetDateTime -> java.time.ZonedDateTime : org.springframework.format.datetime.standard.DateTimeConverters$OffsetDateTimeToZonedDateTimeConverter@3ca5a816"
     83 = {LinkedHashMap$Entry@6680} "java.time.OffsetDateTime -> java.time.Instant" -> "java.time.OffsetDateTime -> java.time.Instant : org.springframework.format.datetime.standard.DateTimeConverters$OffsetDateTimeToInstantConverter@3b166fa9"
     84 = {LinkedHashMap$Entry@6681} "java.util.Calendar -> java.time.ZonedDateTime" -> "java.util.Calendar -> java.time.ZonedDateTime : org.springframework.format.datetime.standard.DateTimeConverters$CalendarToZonedDateTimeConverter@2653dae9"
     85 = {LinkedHashMap$Entry@6682} "java.util.Calendar -> java.time.OffsetDateTime" -> "java.util.Calendar -> java.time.OffsetDateTime : org.springframework.format.datetime.standard.DateTimeConverters$CalendarToOffsetDateTimeConverter@7f348ff0"
     86 = {LinkedHashMap$Entry@6683} "java.util.Calendar -> java.time.LocalDate" -> "java.util.Calendar -> java.time.LocalDate : org.springframework.format.datetime.standard.DateTimeConverters$CalendarToLocalDateConverter@6e407d18"
     87 = {LinkedHashMap$Entry@6684} "java.util.Calendar -> java.time.LocalTime" -> "java.util.Calendar -> java.time.LocalTime : org.springframework.format.datetime.standard.DateTimeConverters$CalendarToLocalTimeConverter@66a32c5e"
     88 = {LinkedHashMap$Entry@6685} "java.util.Calendar -> java.time.LocalDateTime" -> "java.util.Calendar -> java.time.LocalDateTime : org.springframework.format.datetime.standard.DateTimeConverters$CalendarToLocalDateTimeConverter@5e9f36f1"
     89 = {LinkedHashMap$Entry@6686} "java.util.Calendar -> java.time.Instant" -> "java.util.Calendar -> java.time.Instant : org.springframework.format.datetime.standard.DateTimeConverters$CalendarToInstantConverter@50f69dd"
     90 = {LinkedHashMap$Entry@6687} "java.lang.Long -> java.time.Instant" -> "java.lang.Long -> java.time.Instant : org.springframework.format.datetime.standard.DateTimeConverters$LongToInstantConverter@684a7cd9"
     91 = {LinkedHashMap$Entry@6688} "java.time.Instant -> java.lang.Long" -> "java.time.Instant -> java.lang.Long : org.springframework.format.datetime.standard.DateTimeConverters$InstantToLongConverter@17f47c52"
     92 = {LinkedHashMap$Entry@6689} "java.time.LocalDate -> java.lang.String" -> "@org.springframework.format.annotation.DateTimeFormat java.time.LocalDate -> java.lang.String: org.springframework.format.datetime.standard.Jsr310DateTimeFormatAnnotationFormatterFactory@30fbf8e3,java.time.LocalDate -> java.lang.String : org.springframework.format.datetime.standard.TemporalAccessorPrinter@4ec42ea0"
     93 = {LinkedHashMap$Entry@6690} "java.lang.String -> java.time.LocalDate" -> "java.lang.String -> @org.springframework.format.annotation.DateTimeFormat java.time.LocalDate: org.springframework.format.datetime.standard.Jsr310DateTimeFormatAnnotationFormatterFactory@30fbf8e3,java.lang.String -> java.time.LocalDate: org.springframework.format.datetime.standard.TemporalAccessorParser@75d32f15"
     94 = {LinkedHashMap$Entry@6691} "java.time.LocalTime -> java.lang.String" -> "@org.springframework.format.annotation.DateTimeFormat java.time.LocalTime -> java.lang.String: org.springframework.format.datetime.standard.Jsr310DateTimeFormatAnnotationFormatterFactory@30fbf8e3,java.time.LocalTime -> java.lang.String : org.springframework.format.datetime.standard.TemporalAccessorPrinter@41f1db11"
     95 = {LinkedHashMap$Entry@6692} "java.lang.String -> java.time.LocalTime" -> "java.lang.String -> @org.springframework.format.annotation.DateTimeFormat java.time.LocalTime: org.springframework.format.datetime.standard.Jsr310DateTimeFormatAnnotationFormatterFactory@30fbf8e3,java.lang.String -> java.time.LocalTime: org.springframework.format.datetime.standard.TemporalAccessorParser@2ea20f2c"
     96 = {LinkedHashMap$Entry@6693} "java.time.LocalDateTime -> java.lang.String" -> "@org.springframework.format.annotation.DateTimeFormat java.time.LocalDateTime -> java.lang.String: org.springframework.format.datetime.standard.Jsr310DateTimeFormatAnnotationFormatterFactory@30fbf8e3,java.time.LocalDateTime -> java.lang.String : org.springframework.format.datetime.standard.TemporalAccessorPrinter@41fc9576"
     97 = {LinkedHashMap$Entry@6694} "java.lang.String -> java.time.LocalDateTime" -> "java.lang.String -> @org.springframework.format.annotation.DateTimeFormat java.time.LocalDateTime: org.springframework.format.datetime.standard.Jsr310DateTimeFormatAnnotationFormatterFactory@30fbf8e3,java.lang.String -> java.time.LocalDateTime: org.springframework.format.datetime.standard.TemporalAccessorParser@2dbba1db"
     98 = {LinkedHashMap$Entry@6695} "java.time.ZonedDateTime -> java.lang.String" -> "@org.springframework.format.annotation.DateTimeFormat java.time.ZonedDateTime -> java.lang.String: org.springframework.format.datetime.standard.Jsr310DateTimeFormatAnnotationFormatterFactory@30fbf8e3,java.time.ZonedDateTime -> java.lang.String : org.springframework.format.datetime.standard.TemporalAccessorPrinter@625dde2e"
     99 = {LinkedHashMap$Entry@6696} "java.lang.String -> java.time.ZonedDateTime" -> "java.lang.String -> @org.springframework.format.annotation.DateTimeFormat java.time.ZonedDateTime: org.springframework.format.datetime.standard.Jsr310DateTimeFormatAnnotationFormatterFactory@30fbf8e3,java.lang.String -> java.time.ZonedDateTime: org.springframework.format.datetime.standard.TemporalAccessorParser@5cb87626"
   converterCache = {ConcurrentReferenceHashMap@6591}  size = 1
    0 = {ConcurrentReferenceHashMap$Entry@7099} "ConverterCacheKey [sourceType = java.lang.String, targetType = @org.springframework.web.bind.annotation.RequestParam java.lang.String]" -> "NO_OP"
  propertyEditorRegistrars = null
```

### parameterNameDiscoverer

```
this.parameterNameDiscoverer = {DefaultParameterNameDiscoverer@4866} 
 parameterNameDiscoverers = {LinkedList@7309}  size = 2
  0 = {StandardReflectionParameterNameDiscoverer@7311} 
  1 = {LocalVariableTableParameterNameDiscoverer@7312} 
```


容器的启动过程以及一次请求的详细处理过程: [启动日志](springmvc.log)