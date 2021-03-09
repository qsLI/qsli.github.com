---
title: spring-validator源码分析
tags: spring-validator
category: spring
toc: true
typora-root-url: spring-validator
typora-copy-images-to: spring-validator
date: 2021-03-05 14:56:11
---





# JSR-303和JSR-349

## `jsr-303`：——Bean Validation 1.0

> This document is the specification of the Java API for JavaBean validation in Java EE and Java SE. The technical objective of this work is to **provide a class level constraint declaration and validation facility** for the Java application developer, as well as a **constraint metadata** repository and query API.

目标：

> Validating data is a common task that occurs throughout an application, **from the presentation layer to the persistence layer.** Often the same validation logic is implemented in each layer, proving to be time consuming and error-prone. To avoid duplication of these validations in each layer, developers often bundle validation logic directly into the **domain model**, cluttering domain classes with validation code that is, **in fact, metadata about the class itself.**
>
> This JSR **defines a metadata model and API for JavaBean validation**. The default metadata source is annotations, with the ability to override and extend the meta-data through the use of XML validation descriptors.
>
> The validation API developed by this JSR is not intended for use in any one tier or programming model. It is specifically not tied to either the web tier or the persistence tier, and is **available for both server-side application programming, as well as rich client Swing application developers.** This API is seen as a **general extension to the JavaBeans object model,** and as such is expected to be used as a core component in other specifications. Ease of use and flexibility have influenced the design of this specification.

如果同样的校验逻辑会在每个层都存在，就会很容易出bug，而且写起来也很耗时；一般的做法是将校验逻辑带入领域层，但是这些校验逻辑只是对应类的一种元数据；JSR-303就是一种描述这种元数据的方式。用他们的口号来说，就是：

>  Constrain once, validate everywhere

## `jsr-349`——Bean Validation 1.1：

> Bean Validation 1.1 focused on the following topics:

- openness of the specification and its process
- method-level validation (validation of parameters or return values)
- dependency injection for Bean Validation components
- integration with Context and Dependency Injection (CDI)
- group conversion
- error message interpolation using EL expressions

1.1支持了方法级别的校验。

# API
## 配置

![image-20210303162356732](/image-20210303162356732.png)

### 第一种启动方式（Xml Config or Default）：

```java
ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
```

这种情况下， validator的提供是通过：

```
 /**
 * The chosen provider is defined as followed:
 *     <ul>
 *         <li>if the XML configuration defines a provider, this provider is used</li>
 *         <li>if the XML configuration does not define a provider or if no XML
 *         configuration is present the first provider returned by the
 *         {@link ValidationProviderResolver} instance is used.</li>
 *     </ul>
 **/
```

- 优先使用xml的配置：

```java
//javax.validation.Configuration
/**
 * <p/>
 * By default, the configuration information is retrieved from
 * {@code META-INF/validation.xml}.
 * It is possible to override the configuration retrieved from the XML file
 * by using one or more of the {@code Configuration} methods.
 * <p/>
 **/
```

`validation.xml`配置示例：

```xml
<validation-config xmlns="http://jboss.org/xml/ns/javax/validation/configuration"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
 xsi:schemaLocation="http://jboss.org/xml/ns/javax/validation/configuration">
    <default-provider>org.hibernate.validator.HibernateValidator</default-provider>
    <message-interpolator>org.hibernate.validator.engine.ResourceBundleMessageInterpolator</message-interpolator>
    <traversable-resolver>org.hibernate.validator.engine.resolver.DefaultTraversableResolver</traversable-resolver>
    <constraint-validator-factory>org.hibernate.validator.engine.ConstraintValidatorFactoryImpl</constraint-validator-factory>
    <constraint-mapping>/constraints-car.xml</constraint-mapping>
    <property name="prop1">value1</property>
    <property name="prop2">value2</property>
</validation-config>
```

  ![image-20210303181653486](/image-20210303181653486.png)

  

- 如果没有，就取SPI加载的第一个provider的配置：

> Bean Validation providers are identified by the presence of
> {@code META-INF/services/javax.validation.spi.ValidationProvider}


![image-20210303181422423](/image-20210303181422423.png)

一般都是用的这种方式

### 第二种启动方式（Java Config）：

```java
Configuration<?> configuration = Validation
                                .byDefaultProvider()
                                .providerResolver( new MyResolverStrategy() )
                                .configure();
ValidatorFactory factory = configuration.buildValidatorFactory();
```

可以配置一个自定义的`provider resolver`，来决定使用哪个validator。

xml的配置，可以通过编程的方式调用`javax.validation.Configuration`来实现. 另外, 你可以通过
API的方式来重写xml中的配置信息, 也可以通过调用 `Configuration.ignoreXmlConfiguration()`来完全的忽略掉xml的配置信息. 

### 第三种启动方式

```java
  ACMEConfiguration configuration = Validation
     .byProvider(ACMEProvider.class)
     .providerResolver( new MyResolverStrategy() )  // optionally set the provider resolver
     .configure();
  ValidatorFactory factory = configuration.buildValidatorFactory();
```

## 使用

定义好Constraint：

```java
package com.air.validation;

import com.air.validation.custom.CaseMode;
import com.air.validation.custom.CheckCase;
import lombok.Data;

import javax.validation.Valid;
import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

/**
 * @author 代故
 * @date 2021/3/3 11:31 AM
 */
@Data
public class Car {

    @NotNull
    private String manufacturer;

    @NotNull
    @Size(min = 2, max = 14)
    @CheckCase(CaseMode.UPPER)
    private String licensePlate;

    @Min(2)
    private int seatCount;

    /**
     * 嵌套校验
     * 如果标注了@Valid, 那么当主对象被校验的时候,这些集合对象中的元素都会被校验.
     */
    @NotNull
    @Valid
    private Person driver;

    public Car(String manufacturer, String licensePlate, int seatCount, Person driver) {
        this.manufacturer = manufacturer;
        this.licensePlate = licensePlate;
        this.seatCount = seatCount;
        this.driver = driver;
    }

    public Car(String manufacturer, String licensePlate, int seatCount) {
        this.manufacturer = manufacturer;
        this.licensePlate = licensePlate;
        this.seatCount = seatCount;
        this.driver = new Person("default-driver");
    }

    public void drive(@Max(75) int speedInMph) {
        System.out.println("driving car at speed " + speedInMph);
    }
}
```

测试下：

```java
package com.air.validation;

import org.hibernate.validator.HibernateValidator;
import org.junit.BeforeClass;
import org.junit.Test;
import org.junit.internal.runners.JUnit4ClassRunner;
import org.junit.runner.RunWith;

import javax.validation.ConstraintViolation;
import javax.validation.Validation;
import javax.validation.Validator;
import javax.validation.ValidatorFactory;
import javax.validation.constraints.Max;
import javax.validation.executable.ExecutableValidator;
import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.util.Set;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;

/**
 * @author 代故
 * @date 2021/3/3 11:33 AM
 */
@RunWith(JUnit4ClassRunner.class)
public class CarTest {
    private static Validator validator;
    private static ExecutableValidator executableValidator;

    @BeforeClass
    public static void setUp() {
//        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        final ValidatorFactory factory = Validation.byProvider(HibernateValidator.class)
            .configure()
            .failFast(false)
            .buildValidatorFactory();
        validator = factory.getValidator();
        executableValidator = validator.forExecutables();
    }

    @Test
    public void manufacturerIsNull() {
        Car car = new Car(null, "DD-AB-123", 4);

        Set<ConstraintViolation<Car>> constraintViolations = validator.validate(car);

        assertEquals(1, constraintViolations.size());
        assertEquals("may not be null", constraintViolations.iterator()
            .next()
            .getMessage());
    }

    @Test
    public void licensePlateTooShort() {
        Car car = new Car("Morris", "D", 4);

        Set<ConstraintViolation<Car>> constraintViolations = validator.validate(car);

        assertEquals(1, constraintViolations.size());
        assertEquals("size must be between 2 and 14", constraintViolations.iterator()
            .next()
            .getMessage());
    }

    @Test
    public void seatCountTooLow() {
        Car car = new Car("Morris", "DD-AB-123", 1);

        Set<ConstraintViolation<Car>> constraintViolations = validator.validate(car);

        assertEquals(1, constraintViolations.size());
        assertEquals("must be greater than or equal to 2", constraintViolations.iterator()
            .next()
            .getMessage());
    }

    @Test
    public void carIsValid() {
        Car car = new Car("Morris", "DD-AB-123", 2);

        Set<ConstraintViolation<Car>> constraintViolations = validator.validate(car);

        assertEquals(0, constraintViolations.size());
    }

    @Test
    public void testValidatePerson() {
        final Car car = new Car("Morris", "豫D-AAAAA", 2, new Person(null));
        final Set<ConstraintViolation<Car>> violations = validator.validate(car);
        for (ConstraintViolation<Car> violation: violations) {
            System.out.println(violation.getPropertyPath() + " -> " + violation.getMessage());
        }
        assertNotNull(violations);
    }

    /**
     * validateProperty() 和 validateValue() 会忽略被验证属性上定义的@Valid.
     */
    @Test
    public void testValidateValue() {
        final Set<ConstraintViolation<Car>> violations = validator.validateValue(Car.class, "driver", new Person(null));
        for (ConstraintViolation<Car> violation: violations) {
            System.out.println(violation.getLeafBean().getClass().getSimpleName() + " -> " + violation.getMessage());
        }
        assertEquals(0, violations.size());
    }

    @Test
    public void testLicensePlateNotUpperCase() {

        Car car = new Car("Morris", "dd-ab-123", 4);

        Set<ConstraintViolation<Car>> constraintViolations =
            validator.validate(car);
        assertEquals(1, constraintViolations.size());
        assertEquals(
            "Case mode must be UPPER.",
            constraintViolations.iterator().next().getMessage());
    }

    @Test
    public void testDrivingCar() throws NoSuchMethodException {
        Car object = new Car( "Morris" ,"dd-ab-123", 4);
        Method method = Car.class.getMethod( "drive", int.class );
        Object[] parameterValues = { 80 };
      	// 并没有触发实际的调用
        Set<ConstraintViolation<Car>> violations = executableValidator.validateParameters(
            object,
            method,
            parameterValues
        );
        assertEquals( 1, violations.size() );
        Class<? extends Annotation> constraintType = violations.iterator() .next() .getConstraintDescriptor() .getAnnotation() .annotationType();
        assertEquals( Max.class, constraintType );
    }

}
```



## 实现

获取Validator过程：

![image-20210304162919206](/image-20210304162919206.png)

### ValidationProviderResolver

#### DefaultValidationProviderResolver

```java
	/**
	 * Finds {@link ValidationProvider} according to the default {@link ValidationProviderResolver} defined in the
	 * Bean Validation specification. This implementation first uses thread's context classloader to locate providers.
	 * If no suitable provider is found using the aforementioned class loader, it uses current class loader.
	 * If it still does not find any suitable provider, it tries to locate the built-in provider using the current
	 * class loader.
	 *
	 * @author Emmanuel Bernard
	 * @author Hardy Ferentschik
	 */
	private static class DefaultValidationProviderResolver implements ValidationProviderResolver {
		public List<ValidationProvider<?>> getValidationProviders() {
			// class loading and ServiceLoader methods should happen in a PrivilegedAction
			return GetValidationProviderListAction.getValidationProviderList();
		}
	}
```

默认的策略是：

- 先从thread's context class loader 中加载`SPI`接口`ValidationProvider`对应的实现，

- 如果没有加载到，就从`DefaultValidationProviderResolver`对应的classloader中加载。

> if we cannot find any service files with the context class loader use the current class loader

```java
// javax.validation.Validation.GetValidationProviderListAction
public List<ValidationProvider<?>> run() {
   // Option #1: try first context class loader
   //从contextClassLoader中加载
   ClassLoader classloader = Thread.currentThread().getContextClassLoader();
   List<ValidationProvider<?>> cachedContextClassLoaderProviderList = getCachedValidationProviders( classloader );
   if ( cachedContextClassLoaderProviderList != null ) {
      // if already processed return the cached provider list
      return cachedContextClassLoaderProviderList;
   }
   List<ValidationProvider<?>> validationProviderList = loadProviders( classloader );

   
   // Option #2: if we cannot find any service files with the context class loader use the current class loader
   //
   //
   //
   //
    if ( validationProviderList.isEmpty() ) {
      // 从当前class的加载器加载
      classloader = DefaultValidationProviderResolver.class.getClassLoader();
      List<ValidationProvider<?>> cachedCurrentClassLoaderProviderList = getCachedValidationProviders(
            classloader
      );
      if ( cachedCurrentClassLoaderProviderList != null ) {
         // if already processed return the cached provider list
         return cachedCurrentClassLoaderProviderList;
      }
      validationProviderList = loadProviders( classloader );
   }

   // cache the detected providers against the classloader in which they were found
   cacheValidationProviders( classloader, validationProviderList );

   return validationProviderList;
}
```

至于`loadProviders`就是加载`SPI`的实现：

```java
private List<ValidationProvider<?>> loadProviders(ClassLoader classloader) {
    ServiceLoader<ValidationProvider> loader = ServiceLoader.load( ValidationProvider.class, classloader );
    Iterator<ValidationProvider> providerIterator = loader.iterator();
    List<ValidationProvider<?>> validationProviderList = new ArrayList<ValidationProvider<?>>();
    while ( providerIterator.hasNext() ) {
        try {
            validationProviderList.add( providerIterator.next() );
        }
        catch ( ServiceConfigurationError e ) {
            // ignore, because it can happen when multiple
            // providers are present and some of them are not class loader
            // compatible with our API.
        }
    }
    return validationProviderList;
}
```


# Hibernate-Validator

`javax.validation`只是定义好了api，具体的实现一般用hibernate提供的validator。

获取元数据过程：

![image-20210304162952525](/image-20210304162952525.png)

具体实现类的选取，走的是`SPI`加载机制，所以先从`SPI`入手，找到 jar包下的`META-INF/services/javax.validation.spi.ValidationProvider`声明具体的实现类。

```
org.hibernate.validator.HibernateValidator
```

## Validate过程：

### validate

![image-20210304163057740](/image-20210304163057740.png)

```java
// org.hibernate.validator.internal.engine.ValidatorImpl#validate
@Override
	public final <T> Set<ConstraintViolation<T>> validate(T object, Class<?>... groups) {
		Contracts.assertNotNull( object, MESSAGES.validatedObjectMustNotBeNull() );
		
    // 没有注解信息或者xml中没有配置校验，直接返回空集合
		if ( !beanMetaDataManager.isConstrained( object.getClass() ) ) {
			return Collections.emptySet();
		}
		
    // 
		ValidationOrder validationOrder = determineGroupValidationOrder( groups );
		ValidationContext<T> validationContext = getValidationContext().forValidate( object );
		// valueContext会不停的切换，路径也会更新，跟具体validate的属性有关
		ValueContext<?, Object> valueContext = ValueContext.getLocalExecutionContext(
				object,
				beanMetaDataManager.getBeanMetaData( object.getClass() ),
				PathImpl.createRootPath()
		);

		return validateInContext( valueContext, validationContext, validationOrder );
	}

// org.hibernate.validator.internal.engine.ValidatorImpl#validateInContext
private <T, U> Set<ConstraintViolation<T>> validateInContext(ValueContext<U, Object> valueContext, ValidationContext<T> context, ValidationOrder validationOrder) {
  if ( valueContext.getCurrentBean() == null ) {
    return Collections.emptySet();
  }

  // 对应类的元数据
  BeanMetaData<U> beanMetaData = beanMetaDataManager.getBeanMetaData( valueContext.getCurrentBeanType() );
  if ( beanMetaData.defaultGroupSequenceIsRedefined() ) {
    validationOrder.assertDefaultGroupSequenceIsExpandable( beanMetaData.getDefaultGroupSequence( valueContext.getCurrentBean() ) );
  }

  // process first single groups. For these we can optimise object traversal by first running all validations on the current bean
  // before traversing the object.
  // 单个组的
  Iterator<Group> groupIterator = validationOrder.getGroupIterator();
  while ( groupIterator.hasNext() ) {
    Group group = groupIterator.next();
    valueContext.setCurrentGroup( group.getDefiningClass() );
    validateConstraintsForCurrentGroup( context, valueContext );
    if ( shouldFailFast( context ) ) {
      return context.getFailingConstraints();
    }
  }
  groupIterator = validationOrder.getGroupIterator();
  while ( groupIterator.hasNext() ) {
    Group group = groupIterator.next();
    valueContext.setCurrentGroup( group.getDefiningClass() );
   	// 校验级联的
    validateCascadedConstraints( context, valueContext );
    if ( shouldFailFast( context ) ) {
      return context.getFailingConstraints();
    }
  }

  // now we process sequences. For sequences I have to traverse the object graph since I have to stop processing when an error occurs.
  // 多个组的 @GroupSequence({RentalCar.class, CarChecks.class, DriverChecks.class})
  Iterator<Sequence> sequenceIterator = validationOrder.getSequenceIterator();
  while ( sequenceIterator.hasNext() ) {
    Sequence sequence = sequenceIterator.next();
    for ( Group group : sequence.getComposingGroups() ) {
      int numberOfViolations = context.getFailingConstraints().size();
      valueContext.setCurrentGroup( group.getDefiningClass() );

      validateConstraintsForCurrentGroup( context, valueContext );
      if ( shouldFailFast( context ) ) {
        return context.getFailingConstraints();
      }
			// 级联的
      validateCascadedConstraints( context, valueContext );
      if ( shouldFailFast( context ) ) {
        return context.getFailingConstraints();
      }

      if ( context.getFailingConstraints().size() > numberOfViolations ) {
        break;
      }
    }
  }
  return context.getFailingConstraints();
}
```



### 嵌套类型

```java
// org.hibernate.validator.internal.metadata.provider.AnnotationMetaDataProvider#findPropertyMetaData
private ConstrainedField findPropertyMetaData(Field field) {
		Set<MetaConstraint<?>> constraints = convertToMetaConstraints(
				findConstraints( field, ElementType.FIELD ),
				field
		);

		Map<Class<?>, Class<?>> groupConversions = getGroupConversions(
				field.getAnnotation( ConvertGroup.class ),
				field.getAnnotation( ConvertGroup.List.class )
		);
		
  	// 被@Valid修饰的就认为是嵌套的
		boolean isCascading = field.isAnnotationPresent( Valid.class );
		boolean requiresUnwrapping = field.isAnnotationPresent( UnwrapValidatedValue.class );

		return new ConstrainedField(
				ConfigurationSource.ANNOTATION,
				ConstraintLocation.forProperty( field ),
				constraints,
				groupConversions,
				isCascading,
				requiresUnwrapping
		);
	}
```

## 方法级别的验证

方法级别的验证是通过`ExecutableValidator`中的相关接口来实现的：

```java
<T> Set<ConstraintViolation<T>> validateParameters(T object,
													   Method method,
													   Object[] parameterValues,
													   Class<?>... groups);

<T> Set<ConstraintViolation<T>> validateReturnValue(T object,
														Method method,
														Object returnValue,
														Class<?>... groups);

<T> Set<ConstraintViolation<T>> validateConstructorParameters(Constructor<? extends T> constructor,
																  Object[] parameterValues,
																  Class<?>... groups);

<T> Set<ConstraintViolation<T>> validateConstructorReturnValue(Constructor<? extends T> constructor,
																   T createdObject,
																   Class<?>... groups);
```

hibernate中对应的实现还在`ValidatorImpl`：

```java
// org.hibernate.validator.internal.engine.ValidatorImpl#validateParameters(T, java.lang.reflect.Executable, java.lang.Object[], java.lang.Class<?>...)
private <T> Set<ConstraintViolation<T>> validateParameters(T object, Executable executable, Object[] parameterValues, Class<?>... groups) {
		sanityCheckGroups( groups );

		ValidationContext<T> validationContext = getValidationContextBuilder().forValidateParameters(
				validatorScopedContext.getParameterNameProvider(),
				object,
				executable,
				parameterValues
		);
		
  	// 没有注解约束的直接返回
		if (!validationContext.getRootBeanMetaData().hasConstraints() ) {
			return Collections.emptySet();
		}
		// 决定校验组
		ValidationOrder validationOrder = determineGroupValidationOrder( groups );
		
  	// 校验逻辑
		validateParametersInContext( validationContext, parameterValues, validationOrder );

		return validationContext.getFailingConstraints();
	}
```

元数据的获取方式扩展了下，后续的校验流程和bean属性的validate类似：

![image-20210305112537440](/image-20210305112537440.png)

## ConstraintValidator

约束逻辑应该实现的接口

- 对应的工厂类：

  ```java
  // javax.validation.ConstraintValidatorFactory
  public interface ConstraintValidatorFactory {
  
  	<T extends ConstraintValidator<?, ?>> T getInstance(Class<T> key);
  
  	void releaseInstance(ConstraintValidator<?, ?> instance);
  }
  ```

- 接口定义：

```java
public interface ConstraintValidator<A extends Annotation, T> {

	
	default void initialize(A constraintAnnotation) {
	}

	boolean isValid(T value, ConstraintValidatorContext context);
}
```

这个接口定义了具体的校验逻辑的实现，可以实现这个接口，添加自己的校验逻辑。

`NotBlankValidator`的实现：

```java
public class NotBlankValidator implements ConstraintValidator<NotBlank, CharSequence> {

	/**
	 * Checks that the character sequence is not {@code null} nor empty after removing any leading or trailing
	 * whitespace.
	 *
	 * @param charSequence the character sequence to validate
	 * @param constraintValidatorContext context in which the constraint is evaluated
	 * @return returns {@code true} if the string is not {@code null} and the length of the trimmed
	 * {@code charSequence} is strictly superior to 0, {@code false} otherwise
	 */
	@Override
	public boolean isValid(CharSequence charSequence, ConstraintValidatorContext constraintValidatorContext) {
		if ( charSequence == null ) {
			return false;
		}

		return charSequence.toString().trim().length() > 0;
	}
}
```

- 注解和实现的映射关系

注解和具体的实现类的映射维护在`org.hibernate.validator.internal.metadata.core.ConstraintHelper`:

![image-20210304114621014](/image-20210304114621014.png)

这个映射关系，在`MetaDataProvider`处理的时候，就已经映射好，放在了`ConstraintDescriptor`中：

```java
// org.hibernate.validator.internal.metadata.descriptor.ConstraintDescriptorImpl#ConstraintDescriptorImpl(org.hibernate.validator.internal.metadata.core.ConstraintHelper, java.lang.reflect.Member, org.hibernate.validator.internal.util.annotation.ConstraintAnnotationDescriptor<T>, java.lang.annotation.ElementType, java.lang.Class<?>, org.hibernate.validator.internal.metadata.core.ConstraintOrigin, org.hibernate.validator.internal.metadata.descriptor.ConstraintDescriptorImpl.ConstraintType)
		this.constraintValidatorClasses = constraintHelper.getAllValidatorDescriptors( annotationDescriptor.getType() )
				.stream()
				.map( ConstraintValidatorDescriptor::getValidatorClass )
				.collect( Collectors.collectingAndThen( Collectors.toList(), CollectionHelper::toImmutableList ) );
```

后面再根据，具体的值的类型来筛选，具体的`ConstraintValidator`

annotation --> ConstraintValidator  + 值的实际类型 --> ConstraintValidator的具体实现;

也可以直接在注解中指定：

```java
@Target({METHOD, FIELD, ANNOTATION_TYPE})
@Retention(RUNTIME)
// 指定具体的ConstraintValidator
@Constraint(validatedBy = CheckCaseValidator.class)
@Documented
public @interface CheckCase {
    String message() default "{com.mycompany.constraints.checkcase}";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    CaseMode value();
}
```


## 版本升级的坑

- maven坐标变了

  ```xml
  version=6.0.10.Final
  groupId=org.hibernate.validator
  artifactId=hibernate-validator
  
  version=5.1.3.Final
  groupId=org.hibernate
  artifactId=hibernate-validator
  ```

  俩groupId不一样，有的时候会造成一些冲突。

# Spring集成

## Spring mvc

>  By default use of `@EnableWebMvc` or `<mvc:annotation-driven>` automatically registers Bean Validation support in Spring MVC through the `LocalValidatorFactoryBean` when a Bean Validation provider such as Hibernate Validator is detected on the classpath.

### xml配置

```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
    xmlns:mvc="http://www.springframework.org/schema/mvc"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="
        http://www.springframework.org/schema/beans
        http://www.springframework.org/schema/beans/spring-beans.xsd
        http://www.springframework.org/schema/mvc
        http://www.springframework.org/schema/mvc/spring-mvc.xsd">

    <mvc:annotation-driven validator="globalValidator"/>

</beans>
```

初始化路径：

![image-20210304225708264](/image-20210304225708264.png)

```java
public class MvcNamespaceHandler extends NamespaceHandlerSupport {

	@Override
	public void init() {
		registerBeanDefinitionParser("annotation-driven", new AnnotationDrivenBeanDefinitionParser());
    // 省略。。。
  }
```

`AnnotationDrivenBeanDefinitionParser`这个类中会注册许多默认的配置：

```java
// org.springframework.web.servlet.config.AnnotationDrivenBeanDefinitionParser#parse
// 这里引入了validator
RuntimeBeanReference validator = getValidator(element, source, parserContext);
// WebBindingInitializer，用来初始化webDataBinder
RootBeanDefinition bindingDef = new RootBeanDefinition(ConfigurableWebBindingInitializer.class);
		bindingDef.setSource(source);
		bindingDef.setRole(BeanDefinition.ROLE_INFRASTRUCTURE);
		bindingDef.getPropertyValues().add("conversionService", conversionService);
		bindingDef.getPropertyValues().add("validator", validator);
		bindingDef.getPropertyValues().add("messageCodesResolver", messageCodesResolver);

// RequestMappingHandlerAdapter负责请求的处理，可以看前面的mvc源码解析
RootBeanDefinition handlerAdapterDef = new RootBeanDefinition(RequestMappingHandlerAdapter.class);
// initializer 传递给了 RequestMappingHandlerAdapter
handlerAdapterDef.getPropertyValues().add("webBindingInitializer", bindingDef);
```

`getValidator`生成了validator的配置：

```java
// org.springframework.web.servlet.config.AnnotationDrivenBeanDefinitionParser#getValidator
	private static final boolean javaxValidationPresent =
			ClassUtils.isPresent("javax.validation.Validator", AnnotationDrivenBeanDefinitionParser.class.getClassLoader());
private RuntimeBeanReference getValidator(Element element, Object source, ParserContext parserContext) {
	// xml配置里可以指定一个validator作为全局的，如果指定了，这里就返回指定的	
  if (element.hasAttribute("validator")) {
      return new RuntimeBeanReference(element.getAttribute("validator"));
    }
  else if (javaxValidationPresent) {
    RootBeanDefinition validatorDef = new RootBeanDefinition(
      "org.springframework.validation.beanvalidation.OptionalValidatorFactoryBean");
    validatorDef.setSource(source);
    validatorDef.setRole(BeanDefinition.ROLE_INFRASTRUCTURE);
    String validatorName = parserContext.getReaderContext().registerWithGeneratedName(validatorDef);
    parserContext.registerComponent(new BeanComponentDefinition(validatorDef, validatorName));
    return new RuntimeBeanReference(validatorName);
  }
  else {
    return null;
  }
}
```

可以看到默认注入的是`OptionalValidatorFactoryBean`它是`LocalValidatorFactoryBean`的子类，跟jsr-303的validator对接的代码都在`LocalValidatorFactoryBean`中:

```java
// org.springframework.validation.beanvalidation.LocalValidatorFactoryBean#afterPropertiesSet

	@Override
	public Validator getValidator() {
		Assert.notNull(this.validatorFactory, "No target ValidatorFactory set");
		return this.validatorFactory.getValidator();
	}
```

初始化完成之后，就可以拿到validator了，底层可能就是hibernate实现的validator。

### Java配置

```java
@Configuration
@EnableWebMvc
public class WebConfig extends WebMvcConfigurerAdapter {

    @Override
    public Validator getValidator(); {
        // return "global" validator
    }
}
```

Java的配置和xml的作用差不多，只是java的配置是用java的代码写的，先看注解的定义：

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
@Documented
@Import(DelegatingWebMvcConfiguration.class)
public @interface EnableWebMvc {
}
```

import了一个配置类`DelegatingWebMvcConfiguration`, 它继承自`WebMvcConfigurationSupport`, 这个配置类注册了许多默认的bean：

```java
// org.springframework.web.servlet.config.annotation.WebMvcConfigurationSupport
// org.springframework.web.servlet.config.annotation.WebMvcConfigurationSupport#requestMappingHandlerAdapter
@Bean
	public RequestMappingHandlerAdapter requestMappingHandlerAdapter() {
		RequestMappingHandlerAdapter adapter = createRequestMappingHandlerAdapter();
		// WebBindingInitializer
		adapter.setWebBindingInitializer(getConfigurableWebBindingInitializer());
		// 省略
		return adapter;
	}

// org.springframework.web.servlet.config.annotation.WebMvcConfigurationSupport#getConfigurableWebBindingInitializer
/**
	 * Return the {@link ConfigurableWebBindingInitializer} to use for
	 * initializing all {@link WebDataBinder} instances.
	 */
	protected ConfigurableWebBindingInitializer getConfigurableWebBindingInitializer() {
		ConfigurableWebBindingInitializer initializer = new ConfigurableWebBindingInitializer();
		initializer.setConversionService(mvcConversionService());
    // 这里关联了validator
		initializer.setValidator(mvcValidator());
		initializer.setMessageCodesResolver(getMessageCodesResolver());
		return initializer;
	}

// org.springframework.web.servlet.config.annotation.WebMvcConfigurationSupport#mvcValidator
@Bean
	public Validator mvcValidator() {
    // 子类可以覆写，
		Validator validator = getValidator();
		if (validator == null) {
			if (ClassUtils.isPresent("javax.validation.Validator", getClass().getClassLoader())) {
				Class<?> clazz;
				try {
          // 默认的Validator实现类
					String className = "org.springframework.validation.beanvalidation.OptionalValidatorFactoryBean";
					clazz = ClassUtils.forName(className, WebMvcConfigurationSupport.class.getClassLoader());
				}
				catch (ClassNotFoundException ex) {
					throw new BeanInitializationException("Could not find default validator class", ex);
				}
				catch (LinkageError ex) {
					throw new BeanInitializationException("Could not load default validator class", ex);
				}
				validator = (Validator) BeanUtils.instantiateClass(clazz);
			}
			else {
				validator = new NoOpValidator();
			}
		}
		return validator;
	}
```

### 请求处理

初始化完成之后，就是请求来时的处理了：

```java
// org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter#invokeHandlerMethod
// 前面配置的WebBindingInitializer，会在这一步传递给WebDataBinderFactory
WebDataBinderFactory binderFactory = getDataBinderFactory(handlerMethod);
ServletInvocableHandlerMethod invocableMethod = createInvocableHandlerMethod(handlerMethod);
invocableMethod.setDataBinderFactory(binderFactory);
// 省略
invocableMethod.invokeAndHandle(webRequest, mavContainer);

// org.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod#invokeAndHandle
Object returnValue = invokeForRequest(webRequest, mavContainer, providedArgs);
// org.springframework.web.method.support.InvocableHandlerMethod#invokeForRequest
Object[] args = getMethodArgumentValues(request, mavContainer, providedArgs);
// org.springframework.web.method.support.InvocableHandlerMethod#getMethodArgumentValues
// 这里就转交给了argumentResolvers （HandlerMethodArgumentResolver），来处理
args[i] = this.argumentResolvers.resolveArgument(
  parameter, mavContainer, request, this.dataBinderFactory);
```
类型转换和校验是在`org.springframework.web.servlet.mvc.method.annotation.AbstractMessageConverterMethodArgumentResolver#validateIfApplicable`:

![image-20210304231222896](/image-20210304231222896.png)

以处理json/xml的`RequestResponseBodyMethodProcessor`为例：

```java
/**
	 * Throws MethodArgumentNotValidException if validation fails.
	 * @throws HttpMessageNotReadableException if {@link RequestBody#required()}
	 * is {@code true} and there is no body content or if there is no suitable
	 * converter to read the content with.
	 */
	@Override
	public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
			NativeWebRequest webRequest, WebDataBinderFactory binderFactory) throws Exception {

		parameter = parameter.nestedIfOptional();
		Object arg = readWithMessageConverters(webRequest, parameter, parameter.getNestedGenericParameterType());
		String name = Conventions.getVariableNameForParameter(parameter);
		
    // 根据之前绑定的WebDataBinderFactory，初始化WebDataBinder；Validator就传递给了WebDataBinder
    // 注意binder是每次都创建的，他是有状态的
		WebDataBinder binder = binderFactory.createBinder(webRequest, arg, name);
		if (arg != null) {
      // 校验参数
			validateIfApplicable(binder, parameter);
      // 处理校验的结果
			if (binder.getBindingResult().hasErrors() && isBindExceptionRequired(binder, parameter)) {
				throw new MethodArgumentNotValidException(parameter, binder.getBindingResult());
			}
		}
		mavContainer.addAttribute(BindingResult.MODEL_KEY_PREFIX + name, binder.getBindingResult());

		return adaptArgumentIfNecessary(arg, parameter);
	}
```

## 方法级别的校验

> The method validation feature supported by Bean Validation 1.1, and as a custom extension
>
> also by Hibernate Validator 4.3, can be integrated into a Spring context through a
>
> MethodValidationPostProcessor bean definition:

```xml
<bean id="localValidatorFactoryBeanTest" class="org.springframework.validation.beanvalidation.LocalValidatorFactoryBean"/>

    <bean class="org.springframework.validation.beanvalidation.MethodValidationPostProcessor">
        <property name="validator" ref="localValidatorFactoryBeanTest"/>
    </bean>
```

> In order to be eligible for Spring-driven method validation, all target classes need to be annotated
>
> with Spring’s @Validated annotation, optionally declaring the validation groups to use. 

条件：

- 类需要标注`@Validated`
- 引入`MethodValidationPostProcessor`, validator也可以不指定，spring会创建默认的
- 方法得是protected或者public的（不然拦截不到）

```java
@Controller
@RequestMapping("/mvc")
@Validated
public class SampleController { 
  
		@RequestMapping("/test")
    protected String echo(@Min(100) @RequestParam("id") Integer id) {
        log.info("id={}", id);
        return "index";
    }
}
```

### 源码分析

从`MethodValidationPostProcessor`入手，它间接地实现了`BeanPostProcessor`， 在bean初始化完成之后，做了拦截：

```java
	private Class<? extends Annotation> validatedAnnotationType = Validated.class;
// org.springframework.validation.beanvalidation.MethodValidationPostProcessor#afterPropertiesSet
@Override
public void afterPropertiesSet() {
  // 创建了一个切面，切入的条件是被@Validated标识的类
  Pointcut pointcut = new AnnotationMatchingPointcut(this.validatedAnnotationType, true);
  // 创建切面对应的advisor
  this.advisor = new DefaultPointcutAdvisor(pointcut, createMethodValidationAdvice(this.validator));
}

protected Advice createMethodValidationAdvice(Validator validator) {
  // 用传入的JSR-303的创建一个Method的拦截器，或者基于默认的
  return (validator != null ? new MethodValidationInterceptor(validator) : new MethodValidationInterceptor());
}
```

`MethodValidationInterceptor`就是对调用方法做了一层拦截，在这里实现了具体校验逻辑的接入：

```java
// org.springframework.validation.beanvalidation.MethodValidationInterceptor#invoke
@Override
@SuppressWarnings("unchecked")
public Object invoke(MethodInvocation invocation) throws Throwable {
  Class<?>[] groups = determineValidationGroups(invocation);

  // 反射拿到的方法，主要是看底层的validator是否支持JSR-349
  if (forExecutablesMethod != null) {
    // Standard Bean Validation 1.1 API
    Object execVal = ReflectionUtils.invokeMethod(forExecutablesMethod, this.validator);
    Method methodToValidate = invocation.getMethod();
    Set<ConstraintViolation<?>> result;

    try {
      // 反射调用validator的参数校验的方法
      result = (Set<ConstraintViolation<?>>) ReflectionUtils.invokeMethod(validateParametersMethod,
                                                                          execVal, invocation.getThis(), methodToValidate, invocation.getArguments(), groups);
    }
    catch (IllegalArgumentException ex) {
      // Probably a generic type mismatch between interface and impl as reported in SPR-12237 / HV-1011
      // Let's try to find the bridged method on the implementation class...
      methodToValidate = BridgeMethodResolver.findBridgedMethod(
        ClassUtils.getMostSpecificMethod(invocation.getMethod(), invocation.getThis().getClass()));
      result = (Set<ConstraintViolation<?>>) ReflectionUtils.invokeMethod(validateParametersMethod,
                                                                          execVal, invocation.getThis(), methodToValidate, invocation.getArguments(), groups);
    }
    if (!result.isEmpty()) {
      throw new ConstraintViolationException(result);
    }
		
   	// 调用方法的实际处理逻辑
    Object returnValue = invocation.proceed();
		
    // 反射调用validator的返回值校验的方法
    result = (Set<ConstraintViolation<?>>) ReflectionUtils.invokeMethod(validateReturnValueMethod,
                                                                        execVal, invocation.getThis(), methodToValidate, returnValue, groups);
    if (!result.isEmpty()) {
      throw new ConstraintViolationException(result);
    }

    return returnValue;
  }

  else {
    // Hibernate Validator 4.3's native API
    return HibernateValidatorDelegate.invokeWithinValidation(invocation, this.validator, groups);
  }
}

```

## Spring管理的bean的校验

spring提供了`**BeanValidationPostProcessor**`, 可以校验bean的属性是否正确注入了。这个process默认没有包含，如需用到，需要手动添加。

```java
// org.springframework.validation.beanvalidation.BeanValidationPostProcessor
/**
 * Simple {@link BeanPostProcessor} that checks JSR-303 constraint annotations
 * in Spring-managed beans, throwing an initialization exception in case of
 * constraint violations right before calling the bean's init method (if any).
 *
 * @author Juergen Hoeller
 * @since 3.0
 */
public class BeanValidationPostProcessor implements BeanPostProcessor, InitializingBean {
  
   @Override
    public Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
      if (!this.afterInitialization) {
        doValidate(bean);
      }
      return bean;
    }

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
      if (this.afterInitialization) {
        doValidate(bean);
      }
      return bean;
    } 
}


/**
	 * Perform validation of the given bean.
	 * @param bean the bean instance to validate
	 * @see javax.validation.Validator#validate
	 */
protected void doValidate(Object bean) {
  Set<ConstraintViolation<Object>> result = this.validator.validate(bean);
  if (!result.isEmpty()) {
    StringBuilder sb = new StringBuilder("Bean state is invalid: ");
    for (Iterator<ConstraintViolation<Object>> it = result.iterator(); it.hasNext();) {
      ConstraintViolation<Object> violation = it.next();
      sb.append(violation.getPropertyPath()).append(" - ").append(violation.getMessage());
      if (it.hasNext()) {
        sb.append("; ");
      }
    }
    throw new BeanInitializationException(sb.toString());
  }
}
```

> ```
> Caused by: org.springframework.beans.factory.BeanInitializationException: Bean state is invalid: age - 最小不能小于10; id - 不能为null
> ```


# 总结

​		bean validation的标准有两个，一个JSR-303，主要针对bean属性的校验；JSR-349引入了方法入参和返回值的校验。hibernate-validator实现了bean validation的标准；spring则包装和扩展了一层，让我们用起来更加舒服。

​		`@Valid`注解是javax中的注解，也是标准的一部分，用来做嵌套的校验；`@Validated`是spring的注解，主要是为了做方法参数和返回值的校验，用来生成方法的拦截器。




# 参考

- [详解Bean Validation - 阅读的伟哥的个人空间 - 开源中国](https://my.oschina.net/u/3211616/blog/821343)
- [JSR303、349 -Bean Validation 数据校验规范使用说明和验证流程源码分析 - zzuqiang的个人空间 - 开源中国](https://my.oschina.net/zzuqiang/blog/761862)
- [Hibernate Validator](http://docs.jboss.org/hibernate/validator/4.2/reference/zh-CN/html_single/)
- [java - Tomcat classloading doesn't seem to behave as documented - Stack Overflow](https://stackoverflow.com/questions/7337046/tomcat-classloading-doesnt-seem-to-behave-as-documented)
- [JSR 303: Bean Validation](https://beanvalidation.org/1.0/spec/)
- [Jakarta Bean Validation - Bean Validation 1.1 (JSR 349)](https://beanvalidation.org/1.1/)
- [21. Web MVC framework](https://docs.spring.io/spring-framework/docs/4.2.x/spring-framework-reference/html/mvc.html#mvc-config-validation)
- [Spring方法级别数据校验：@Validated + MethodValidationPostProcessor优雅的完成数据校验动作【享学Spring】_YourBatman-CSDN博客](https://blog.csdn.net/f641385712/article/details/97402946)
- [Hibernate Validator](https://docs.jboss.org/hibernate/validator/5.1/reference/zh-CN/html/)
- [Spring内置的BeanPostProcessor总结 | Format's Notes](https://fangjian0423.github.io/2017/06/24/spring-embedded-bean-post-processor/)

