title: Spring占位符（property-placeholder），源码阅读
tags: placeholder
category: spring
date: 2016-10-31 00:22:23
---


##  `<context:property-placeholder location='xxx' />`的解析过程

### schema

在idea中`ctrl` + `b`或者，`ctrl` + 鼠标左键点击即可打开schema具体的位置

![](location.jpg)

`sping.handlers`中内容如下:

```xml
http\://www.springframework.org/schema/context=org.springframework.context.config.ContextNamespaceHandler
http\://www.springframework.org/schema/jee=org.springframework.ejb.config.JeeNamespaceHandler
http\://www.springframework.org/schema/lang=org.springframework.scripting.config.LangNamespaceHandler
http\://www.springframework.org/schema/task=org.springframework.scheduling.config.TaskNamespaceHandler
http\://www.springframework.org/schema/cache=org.springframework.cache.config.CacheNamespaceHandler
```
`spring.schemas`中的内容如下：

```xml
http\://www.springframework.org/schema/context/spring-context-2.5.xsd=org/springframework/context/config/spring-context-2.5.xsd
http\://www.springframework.org/schema/context/spring-context-3.0.xsd=org/springframework/context/config/spring-context-3.0.xsd
http\://www.springframework.org/schema/context/spring-context-3.1.xsd=org/springframework/context/config/spring-context-3.1.xsd
http\://www.springframework.org/schema/context/spring-context-3.2.xsd=org/springframework/context/config/spring-context-3.2.xsd
http\://www.springframework.org/schema/context/spring-context-4.0.xsd=org/springframework/context/config/spring-context-4.0.xsd
http\://www.springframework.org/schema/context/spring-context-4.1.xsd=org/springframework/context/config/spring-context-4.1.xsd
http\://www.springframework.org/schema/context/spring-context-4.2.xsd=org/springframework/context/config/spring-context-4.2.xsd
http\://www.springframework.org/schema/context/spring-context.xsd=org/springframework/context/config/spring-context-4.2.xsd
http\://www.springframework.org/schema/jee/spring-jee-2.0.xsd=org/springframework/ejb/config/spring-jee-2.0.xsd
http\://www.springframework.org/schema/jee/spring-jee-2.5.xsd=org/springframework/ejb/config/spring-jee-2.5.xsd
http\://www.springframework.org/schema/jee/spring-jee-3.0.xsd=org/springframework/ejb/config/spring-jee-3.0.xsd
http\://www.springframework.org/schema/jee/spring-jee-3.1.xsd=org/springframework/ejb/config/spring-jee-3.1.xsd
http\://www.springframework.org/schema/jee/spring-jee-3.2.xsd=org/springframework/ejb/config/spring-jee-3.2.xsd
http\://www.springframework.org/schema/jee/spring-jee-4.0.xsd=org/springframework/ejb/config/spring-jee-4.0.xsd
http\://www.springframework.org/schema/jee/spring-jee-4.1.xsd=org/springframework/ejb/config/spring-jee-4.1.xsd
http\://www.springframework.org/schema/jee/spring-jee-4.2.xsd=org/springframework/ejb/config/spring-jee-4.2.xsd
http\://www.springframework.org/schema/jee/spring-jee.xsd=org/springframework/ejb/config/spring-jee-4.2.xsd
http\://www.springframework.org/schema/lang/spring-lang-2.0.xsd=org/springframework/scripting/config/spring-lang-2.0.xsd
http\://www.springframework.org/schema/lang/spring-lang-2.5.xsd=org/springframework/scripting/config/spring-lang-2.5.xsd
http\://www.springframework.org/schema/lang/spring-lang-3.0.xsd=org/springframework/scripting/config/spring-lang-3.0.xsd
http\://www.springframework.org/schema/lang/spring-lang-3.1.xsd=org/springframework/scripting/config/spring-lang-3.1.xsd
http\://www.springframework.org/schema/lang/spring-lang-3.2.xsd=org/springframework/scripting/config/spring-lang-3.2.xsd
http\://www.springframework.org/schema/lang/spring-lang-4.0.xsd=org/springframework/scripting/config/spring-lang-4.0.xsd
http\://www.springframework.org/schema/lang/spring-lang-4.1.xsd=org/springframework/scripting/config/spring-lang-4.1.xsd
http\://www.springframework.org/schema/lang/spring-lang-4.2.xsd=org/springframework/scripting/config/spring-lang-4.2.xsd
http\://www.springframework.org/schema/lang/spring-lang.xsd=org/springframework/scripting/config/spring-lang-4.2.xsd
http\://www.springframework.org/schema/task/spring-task-3.0.xsd=org/springframework/scheduling/config/spring-task-3.0.xsd
http\://www.springframework.org/schema/task/spring-task-3.1.xsd=org/springframework/scheduling/config/spring-task-3.1.xsd
http\://www.springframework.org/schema/task/spring-task-3.2.xsd=org/springframework/scheduling/config/spring-task-3.2.xsd
http\://www.springframework.org/schema/task/spring-task-4.0.xsd=org/springframework/scheduling/config/spring-task-4.0.xsd
http\://www.springframework.org/schema/task/spring-task-4.1.xsd=org/springframework/scheduling/config/spring-task-4.1.xsd
http\://www.springframework.org/schema/task/spring-task-4.2.xsd=org/springframework/scheduling/config/spring-task-4.2.xsd
http\://www.springframework.org/schema/task/spring-task.xsd=org/springframework/scheduling/config/spring-task-4.2.xsd
http\://www.springframework.org/schema/cache/spring-cache-3.1.xsd=org/springframework/cache/config/spring-cache-3.1.xsd
http\://www.springframework.org/schema/cache/spring-cache-3.2.xsd=org/springframework/cache/config/spring-cache-3.2.xsd
http\://www.springframework.org/schema/cache/spring-cache-4.0.xsd=org/springframework/cache/config/spring-cache-4.0.xsd
http\://www.springframework.org/schema/cache/spring-cache-4.1.xsd=org/springframework/cache/config/spring-cache-4.1.xsd
http\://www.springframework.org/schema/cache/spring-cache-4.2.xsd=org/springframework/cache/config/spring-cache-4.2.xsd
http\://www.springframework.org/schema/cache/spring-cache.xsd=org/springframework/cache/config/spring-cache-4.2.xsd
```
### NamespaceHandlerSupport

从`handler`中我们可以找出`context`标签的处理类是`org.springframework.context.config.ContextNamespaceHandler`,内容如下：

```java
public class ContextNamespaceHandler extends NamespaceHandlerSupport {

	@Override
	public void init() {
		registerBeanDefinitionParser("property-placeholder", new PropertyPlaceholderBeanDefinitionParser());
		registerBeanDefinitionParser("property-override", new PropertyOverrideBeanDefinitionParser());
		registerBeanDefinitionParser("annotation-config", new AnnotationConfigBeanDefinitionParser());
		registerBeanDefinitionParser("component-scan", new ComponentScanBeanDefinitionParser());
		registerBeanDefinitionParser("load-time-weaver", new LoadTimeWeaverBeanDefinitionParser());
		registerBeanDefinitionParser("spring-configured", new SpringConfiguredBeanDefinitionParser());
		registerBeanDefinitionParser("mbean-export", new MBeanExportBeanDefinitionParser());
		registerBeanDefinitionParser("mbean-server", new MBeanServerBeanDefinitionParser());
	}
}
```
顺藤摸瓜就能找到`property-placeholder`的处理类是`PropertyPlaceholderBeanDefinitionParser`

### PropertyPlaceholderBeanDefinitionParser

继承关系：

![](hierarchy.jpg)

```java
class PropertyPlaceholderBeanDefinitionParser extends AbstractPropertyLoadingBeanDefinitionParser {

	private static final String SYSTEM_PROPERTIES_MODE_ATTRIBUTE = "system-properties-mode";

	private static final String SYSTEM_PROPERTIES_MODE_DEFAULT = "ENVIRONMENT";


	@Override
	protected Class<?> getBeanClass(Element element) {
		// As of Spring 3.1, the default value of system-properties-mode has changed from
		// 'FALLBACK' to 'ENVIRONMENT'. This latter value indicates that resolution of
		// placeholders against system properties is a function of the Environment and
		// its current set of PropertySources.
		if (SYSTEM_PROPERTIES_MODE_DEFAULT.equals(element.getAttribute(SYSTEM_PROPERTIES_MODE_ATTRIBUTE))) {
			return PropertySourcesPlaceholderConfigurer.class;
		}

		// The user has explicitly specified a value for system-properties-mode: revert to
		// PropertyPlaceholderConfigurer to ensure backward compatibility with 3.0 and earlier.
		return PropertyPlaceholderConfigurer.class;
	}

	@Override
	protected void doParse(Element element, BeanDefinitionBuilder builder) {
		super.doParse(element, builder);

		builder.addPropertyValue("ignoreUnresolvablePlaceholders",
				Boolean.valueOf(element.getAttribute("ignore-unresolvable")));

		String systemPropertiesModeName = element.getAttribute(SYSTEM_PROPERTIES_MODE_ATTRIBUTE);
		if (StringUtils.hasLength(systemPropertiesModeName) &&
				!systemPropertiesModeName.equals(SYSTEM_PROPERTIES_MODE_DEFAULT)) {
			builder.addPropertyValue("systemPropertiesModeName", "SYSTEM_PROPERTIES_MODE_" + systemPropertiesModeName);
		}

		if (element.hasAttribute("value-separator")) {    
			builder.addPropertyValue("valueSeparator", element.getAttribute("value-separator"));
		}

		if (element.hasAttribute("null-value")) {
			builder.addPropertyValue("nullValue", element.getAttribute("null-value"));
		}
	}

}
```
在`getBeanClass`中，根据标签中的`system-properties-mode`属性来返回不同的类，来指明要实例化的类。

再来看上述的`parse`方法，首先就是调用父类的`doParse`方法，然后就是解析标签中的相应属性，放到`BeanDefinitionBuilder`中，剩下的工作就交给spring这个框架来完成了。

#### `system-properties-mode`

决定解析placeholder的顺序。这个属性的取值如下：

>	**"ENVIRONMENT"** indicates placeholders should be resolved against the current Environment and against any local properties;

>	**"NEVER"** indicates placeholders should be resolved only against local properties and never against system properties;

>	**"FALLBACK"** indicates placeholders should be resolved against any local properties and then against system properties;

>	**"OVERRIDE"** indicates placeholders should be resolved first against system properties and then against any local properties;

这个属性的默认值是`ENVIRONMENT`,也就是先从环境变量中解析，然后才从我们定义的properties文件中解析，如果环境中的变量名和配置文件中的变量名冲突，

就会使用环境变量中的。

>所以配置文件中的变量名最好带一个前缀，如`jdbc.username=`, 笔者在Ubuntu下就遇到过不带前缀的`username`和系统的'username'冲突的情况

#### `ignore-unresolvable`

>	Specifies if failure to find the property value to replace a key should be ignored.
	Default is "false", meaning that this placeholder configurer will raise an exception
	if it cannot resolve a key. Set to "true" to allow the configurer to pass on the key
	to any others in the context that have not yet visited the key in question.

这个属性很关键，他决定遇到无法解析的变量时是否抛出异常，默认是`fale`（抛出异常）,在有多个配置文件的时候应该设置为`true`。

#### `value-separator`

placeHolder默认值得分隔符，默认是`:`

> The separating character between the placeholder variable and the associated 	default value: by default, a ':' symbol.

#### `null-value`

>	A value that should be treated as 'null' when resolved as a placeholder value:
	e.g. "" (empty String) or "null". By default, no such null value is defined.

**这些属性都可以在相应的`xsd`schema中找到。**


### AbstractPropertyLoadingBeanDefinitionParser

这是上面的那个解析类的父类。

```java
abstract class AbstractPropertyLoadingBeanDefinitionParser extends AbstractSingleBeanDefinitionParser {

	@Override
	protected boolean shouldGenerateId() {
		return true;
	}

	@Override
	protected void doParse(Element element, BeanDefinitionBuilder builder) {
		String location = element.getAttribute("location");
		if (StringUtils.hasLength(location)) {
			String[] locations = StringUtils.commaDelimitedListToStringArray(location);
			builder.addPropertyValue("locations", locations);
		}

		String propertiesRef = element.getAttribute("properties-ref");
		if (StringUtils.hasLength(propertiesRef)) {
			builder.addPropertyReference("properties", propertiesRef);
		}

		String fileEncoding = element.getAttribute("file-encoding");
		if (StringUtils.hasLength(fileEncoding)) {
			builder.addPropertyValue("fileEncoding", fileEncoding);
		}

		String order = element.getAttribute("order");
		if (StringUtils.hasLength(order)) {
			builder.addPropertyValue("order", Integer.valueOf(order));
		}

		builder.addPropertyValue("ignoreResourceNotFound",
				Boolean.valueOf(element.getAttribute("ignore-resource-not-found")));

		builder.addPropertyValue("localOverride",
				Boolean.valueOf(element.getAttribute("local-override")));

		builder.setRole(BeanDefinition.ROLE_INFRASTRUCTURE);
	}

}

```

#### shouldGenerateId

```java
/**
 * Should an ID be generated instead of read from the passed in {@link Element}?
 * <p>Disabled by default; subclasses can override this to enable ID generation.
 * Note that this flag is about <i>always</i> generating an ID; the parser
 * won't even check for an "id" attribute in this case.
 * @return whether the parser should always generate an id
 */
protected boolean shouldGenerateId() {
  return false;
}
```

#### doParse

这个方法负责解析配置文件的location、file-encoding等通用的属性，并放置到`builder`中。

## Spring 调用handler的过程

spring将特定的标签的解析委托给我们自己定义的handler的过程主要是在`DefaultBeanDefinitionDocumentReader`中
```java
/**
	 * Parse the elements at the root level in the document:
	 * "import", "alias", "bean".
	 * @param root the DOM root element of the document
	 */
	protected void parseBeanDefinitions(Element root, BeanDefinitionParserDelegate delegate) {
		if (delegate.isDefaultNamespace(root)) {
			NodeList nl = root.getChildNodes();
			for (int i = 0; i < nl.getLength(); i++) {
				Node node = nl.item(i);
				if (node instanceof Element) {
					Element ele = (Element) node;
					if (delegate.isDefaultNamespace(ele)) {
						parseDefaultElement(ele, delegate);
					}
					else {
						delegate.parseCustomElement(ele);
					}
				}
			}
		}
		else {
			delegate.parseCustomElement(root);
		}
	}
```
`context`不是默认命名空间的标签，所以走`parseCustomElement`分支。

走到`BeanDefinitionParserDelegate`的`parseCustomElement`方法中
```java
public BeanDefinition parseCustomElement(Element ele) {
		return parseCustomElement(ele, null);
	}

	public BeanDefinition parseCustomElement(Element ele, BeanDefinition containingBd) {
		String namespaceUri = getNamespaceURI(ele);
		NamespaceHandler handler = this.readerContext.getNamespaceHandlerResolver().resolve(namespaceUri);
		if (handler == null) {
			error("Unable to locate Spring NamespaceHandler for XML schema namespace [" + namespaceUri + "]", ele);
			return null;
		}
		return handler.parse(ele, new ParserContext(this.readerContext, this, containingBd));
	}
```

这里从`NamespaceHandlerResolver`中根据`namespaceUri`获取到对应的`NamespaceHandler`,然后调用`handler`的`parse`
方法进行解析，返回一个`BeanDefinition`，然后就注册到spring中了。

这里的handler就是前面我们看到的实现了`NamespaceHandlerSupport `的那个`ContextNamespaceHandler`,`NamespaceHandlerSupport `继承自`NamespaceHandler`,它的parse 方法如下：

```java
/**
	 * Parses the supplied {@link Element} by delegating to the {@link BeanDefinitionParser} that is
	 * registered for that {@link Element}.
	 */
	@Override
	public BeanDefinition parse(Element element, ParserContext parserContext) {
		return findParserForElement(element, parserContext).parse(element, parserContext);
	}

	/**
	 * Locates the {@link BeanDefinitionParser} from the register implementations using
	 * the local name of the supplied {@link Element}.
	 */
	private BeanDefinitionParser findParserForElement(Element element, ParserContext parserContext) {
		String localName = parserContext.getDelegate().getLocalName(element);
		BeanDefinitionParser parser = this.parsers.get(localName);
		if (parser == null) {
			parserContext.getReaderContext().fatal(
					"Cannot locate BeanDefinitionParser for element [" + localName + "]", element);
		}
		return parser;
	}

```
就是从在`init()`方法中注册的`Parser`,根据对应的标签前缀，获取到parser，对xml元素进行解析。


## 生效过程

生效过程是在`BeanFactoryPostProcessor`被调用的过程中生效的, 继承关系

![](post-processors.jpg)

可以看到里面有两个熟悉的类——`PropertySourcesPlaceholderConfigurer`和`PropertyPlaceholderConfigurer`，正是`PropertyPlaceholderBeanDefinitionParser.getBeanClass`返回的两种类型, 也就是说他们两个是`BeanFactoryPostProcessor`.


### PropertySourcesPlaceholderConfigurer
```java
/**
	 * {@inheritDoc}
	 * <p>Processing occurs by replacing ${...} placeholders in bean definitions by resolving each
	 * against this configurer's set of {@link PropertySources}, which includes:
	 * <ul>
	 * <li>all {@linkplain org.springframework.core.env.ConfigurableEnvironment#getPropertySources
	 * environment property sources}, if an {@code Environment} {@linkplain #setEnvironment is present}
	 * <li>{@linkplain #mergeProperties merged local properties}, if {@linkplain #setLocation any}
	 * {@linkplain #setLocations have} {@linkplain #setProperties been}
	 * {@linkplain #setPropertiesArray specified}
	 * <li>any property sources set by calling {@link #setPropertySources}
	 * </ul>
	 * <p>If {@link #setPropertySources} is called, <strong>environment and local properties will be
	 * ignored</strong>. This method is designed to give the user fine-grained control over property
	 * sources, and once set, the configurer makes no assumptions about adding additional sources.
	 */
	@Override
	public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {
		if (this.propertySources == null) {
			this.propertySources = new MutablePropertySources();
			if (this.environment != null) {
				this.propertySources.addLast(
					new PropertySource<Environment>(ENVIRONMENT_PROPERTIES_PROPERTY_SOURCE_NAME, this.environment) {
						@Override
						public String getProperty(String key) {
							return this.source.getProperty(key);
						}
					}
				);
			}
			try {
				PropertySource<?> localPropertySource =
						new PropertiesPropertySource(LOCAL_PROPERTIES_PROPERTY_SOURCE_NAME, mergeProperties());
				if (this.localOverride) {
					this.propertySources.addFirst(localPropertySource);
				}
				else {
					this.propertySources.addLast(localPropertySource);
				}
			}
			catch (IOException ex) {
				throw new BeanInitializationException("Could not load properties", ex);
			}
		}

		processProperties(beanFactory, new PropertySourcesPropertyResolver(this.propertySources));
		this.appliedPropertySources = this.propertySources;
	}

```

注意上述的`localOverride`变量，它决定了是否用本地的替换系统的，主要是用加载的顺序呢控制的

```java
/**
* <p>Any local properties (e.g. those added via {@link #setProperties}, {@link #setLocations}
* et al.) are added as a {@code PropertySource}. Search precedence of local properties is
* based on the value of the {@link #setLocalOverride localOverride} property, which is by
* default {@code false} meaning that local properties are to be searched last, after all
* environment property sources.
*/
```
获取到所有的属性列表后，处理属性就交给了`processProperties`这个方法.

```java
/**
	 * Visit each bean definition in the given bean factory and attempt to replace ${...} property
	 * placeholders with values from the given properties.
	 */
	protected void processProperties(ConfigurableListableBeanFactory beanFactoryToProcess,
			final ConfigurablePropertyResolver propertyResolver) throws BeansException {

		propertyResolver.setPlaceholderPrefix(this.placeholderPrefix);
		propertyResolver.setPlaceholderSuffix(this.placeholderSuffix);
		propertyResolver.setValueSeparator(this.valueSeparator);

		StringValueResolver valueResolver = new StringValueResolver() {
			@Override
			public String resolveStringValue(String strVal) {
				String resolved = ignoreUnresolvablePlaceholders ?
						propertyResolver.resolvePlaceholders(strVal) :
						propertyResolver.resolveRequiredPlaceholders(strVal);
				return (resolved.equals(nullValue) ? null : resolved);
			}
		};

		doProcessProperties(beanFactoryToProcess, valueResolver);
	}
```

先设置propertyResolver的prefix（默认是${}）和suffix(默认是})，以及默认值得分隔符(默认是:).

然后创建了一个StringValueResolver, 这里根据`ignoreUnresolvablePlaceholders`的值来进行不同的解析，

这个值默认是false, 但是可以在标签中配置。

```xml
<xsd:attribute name="ignore-unresolvable" type="xsd:boolean" default="false">
			<xsd:annotation>
				<xsd:documentation><![CDATA[
	Specifies if failure to find the property value to replace a key should be ignored.
	Default is "false", meaning that this placeholder configurer will raise an exception
	if it cannot resolve a key. Set to "true" to allow the configurer to pass on the key
	to any others in the context that have not yet visited the key in question.
				]]></xsd:documentation>
			</xsd:annotation>
		</xsd:attribute>
```

`false`就以为者遇到无法解析的值就会直接抛出异常

接下来看看`doProcessProperties`

```java
protected void doProcessProperties(ConfigurableListableBeanFactory beanFactoryToProcess,
		StringValueResolver valueResolver) {

	BeanDefinitionVisitor visitor = new BeanDefinitionVisitor(valueResolver);

	String[] beanNames = beanFactoryToProcess.getBeanDefinitionNames();
	for (String curName : beanNames) {
		// Check that we're not parsing our own bean definition,
		// to avoid failing on unresolvable placeholders in properties file locations.
		if (!(curName.equals(this.beanName) && beanFactoryToProcess.equals(this.beanFactory))) {
			BeanDefinition bd = beanFactoryToProcess.getBeanDefinition(curName);
			try {
				visitor.visitBeanDefinition(bd);
			}
			catch (Exception ex) {
				throw new BeanDefinitionStoreException(bd.getResourceDescription(), curName, ex.getMessage(), ex);
			}
		}
	}

	// New in Spring 2.5: resolve placeholders in alias target names and aliases as well.
	beanFactoryToProcess.resolveAliases(valueResolver);

	// New in Spring 3.0: resolve placeholders in embedded values such as annotation attributes.
	beanFactoryToProcess.addEmbeddedValueResolver(valueResolver);
}
```
这里采用的是visitor模式，查看`BeanDefinitionVisitor#visitBeanDefinition`

```java
/**
	 * Traverse the given BeanDefinition object and the MutablePropertyValues
	 * and ConstructorArgumentValues contained in them.
	 * @param beanDefinition the BeanDefinition object to traverse
	 * @see #resolveStringValue(String)
	 */
	public void visitBeanDefinition(BeanDefinition beanDefinition) {
		visitParentName(beanDefinition);
		visitBeanClassName(beanDefinition);
		visitFactoryBeanName(beanDefinition);
		visitFactoryMethodName(beanDefinition);
		visitScope(beanDefinition);
		visitPropertyValues(beanDefinition.getPropertyValues());
		ConstructorArgumentValues cas = beanDefinition.getConstructorArgumentValues();
		visitIndexedArgumentValues(cas.getIndexedArgumentValues());
		visitGenericArgumentValues(cas.getGenericArgumentValues());
	}
```
以其中的`visitParentName`为例：
```java
protected void visitParentName(BeanDefinition beanDefinition) {
	String parentName = beanDefinition.getParentName();
	if (parentName != null) {
		String resolvedName = resolveStringValue(parentName);
		if (!parentName.equals(resolvedName)) {
			beanDefinition.setParentName(resolvedName);
		}
	}
}

```
就是先获取`parentName`，然后替换相应的属性之后的`resolvedName`,如果和原来的不一样就设置`resolvedName`

为新的parentName

```java
/**
 * Resolve the given String value, for example parsing placeholders.
 * @param strVal the original String value
 * @return the resolved String value
 */
protected String resolveStringValue(String strVal) {
	if (this.valueResolver == null) {
		throw new IllegalStateException("No StringValueResolver specified - pass a resolver " +
				"object into the constructor or override the 'resolveStringValue' method");
	}
	String resolvedValue = this.valueResolver.resolveStringValue(strVal);
	// Return original String if not modified.
	return (strVal.equals(resolvedValue) ? strVal : resolvedValue);
}
```

顺藤摸瓜,看看`valueResolver`,就是之前的`StringValueResolver`

这是一个接口只有一个方法

```java
public interface StringValueResolver {

	/**
	 * Resolve the given String value, for example parsing placeholders.
	 * @param strVal the original String value
	 * @return the resolved String value
	 */
	String resolveStringValue(String strVal);

}
```

之前传入的其实就是对应`ConfigurablePropertyResolver`的两个方法, 之前传入的是它的子类

`PropertySourcesPropertyResolver`

```java
@Override
	public String resolvePlaceholders(String text) {
		if (this.nonStrictHelper == null) {
			this.nonStrictHelper = createPlaceholderHelper(true);
		}
		return doResolvePlaceholders(text, this.nonStrictHelper);
	}

	@Override
	public String resolveRequiredPlaceholders(String text) throws IllegalArgumentException {
		if (this.strictHelper == null) {
			this.strictHelper = createPlaceholderHelper(false);
		}
		return doResolvePlaceholders(text, this.strictHelper);
	}
```

调用的是内部方法:

```java
private String doResolvePlaceholders(String text, PropertyPlaceholderHelper helper) {
	return helper.replacePlaceholders(text, new PropertyPlaceholderHelper.PlaceholderResolver() {
		@Override
		public String resolvePlaceholder(String placeholderName) {
			return getPropertyAsRawString(placeholderName);
		}
	});
}

```

最终调用功能的是`PropertyPlaceholderHelper`的replacePlaceholders方法，

这个helper在构造是通过 `createPlaceholderHelper`方法构建的，他接受一个bool类型的参数

```java
private PropertyPlaceholderHelper createPlaceholderHelper(boolean ignoreUnresolvablePlaceholders) {
	return new PropertyPlaceholderHelper(this.placeholderPrefix, this.placeholderSuffix,
			this.valueSeparator, ignoreUnresolvablePlaceholders);
}
```

这个bool值就是表示是否要ignore掉不能解析的属性。

```java
/**
	 * Creates a new {@code PropertyPlaceholderHelper} that uses the supplied prefix and suffix.
	 * @param placeholderPrefix the prefix that denotes the start of a placeholder
	 * @param placeholderSuffix the suffix that denotes the end of a placeholder
	 * @param valueSeparator the separating character between the placeholder variable
	 * and the associated default value, if any
	 * @param ignoreUnresolvablePlaceholders indicates whether unresolvable placeholders should
	 * be ignored ({@code true}) or cause an exception ({@code false})
	 */
```
接着追

```java
/**
 * Replaces all placeholders of format {@code ${name}} with the value returned
 * from the supplied {@link PlaceholderResolver}.
 * @param value the value containing the placeholders to be replaced
 * @param placeholderResolver the {@code PlaceholderResolver} to use for replacement
 * @return the supplied value with placeholders replaced inline
 */
public String replacePlaceholders(String value, PlaceholderResolver placeholderResolver) {
	Assert.notNull(value, "'value' must not be null");
	return parseStringValue(value, placeholderResolver, new HashSet<String>());
}

protected String parseStringValue(
			String strVal, PlaceholderResolver placeholderResolver, Set<String> visitedPlaceholders) {

		StringBuilder result = new StringBuilder(strVal);

		int startIndex = strVal.indexOf(this.placeholderPrefix);
		while (startIndex != -1) {
			int endIndex = findPlaceholderEndIndex(result, startIndex);
			if (endIndex != -1) {
				String placeholder = result.substring(startIndex + this.placeholderPrefix.length(), endIndex);
				String originalPlaceholder = placeholder;
				if (!visitedPlaceholders.add(originalPlaceholder)) {
					throw new IllegalArgumentException(
							"Circular placeholder reference '" + originalPlaceholder + "' in property definitions");
				}
				// Recursive invocation, parsing placeholders contained in the placeholder key.
				placeholder = parseStringValue(placeholder, placeholderResolver, visitedPlaceholders);
				// Now obtain the value for the fully resolved key...
				String propVal = placeholderResolver.resolvePlaceholder(placeholder);
				if (propVal == null && this.valueSeparator != null) {
					int separatorIndex = placeholder.indexOf(this.valueSeparator);
					if (separatorIndex != -1) {
						String actualPlaceholder = placeholder.substring(0, separatorIndex);
						String defaultValue = placeholder.substring(separatorIndex + this.valueSeparator.length());
						propVal = placeholderResolver.resolvePlaceholder(actualPlaceholder);
						if (propVal == null) {
							propVal = defaultValue;
						}
					}
				}
				if (propVal != null) {
					// Recursive invocation, parsing placeholders contained in the
					// previously resolved placeholder value.
					propVal = parseStringValue(propVal, placeholderResolver, visitedPlaceholders);
					result.replace(startIndex, endIndex + this.placeholderSuffix.length(), propVal);
					if (logger.isTraceEnabled()) {
						logger.trace("Resolved placeholder '" + placeholder + "'");
					}
					startIndex = result.indexOf(this.placeholderPrefix, startIndex + propVal.length());
				}
				else if (this.ignoreUnresolvablePlaceholders) {
					// Proceed with unprocessed value.
					startIndex = result.indexOf(this.placeholderPrefix, endIndex + this.placeholderSuffix.length());
				}
				else {
					throw new IllegalArgumentException("Could not resolve placeholder '" +
							placeholder + "'" + " in string value \"" + strVal + "\"");
				}
				visitedPlaceholders.remove(originalPlaceholder);
			}
			else {
				startIndex = -1;
			}
		}

		return result.toString();
	}

```

实际解析的代码都在这里：

1. 取出placeHolder的名称.
2. 判断有没有循环引用的情况.
3. 递归替换，获取对应的值.
4. 如果值为空，解析默认值.


### PropertyPlaceholderConfigurer

应该和上面的类似，抽时间补。
