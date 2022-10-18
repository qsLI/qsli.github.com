---
title: Java的反射慢吗？
tags: jvm
toc: true
typora-root-url: Java的反射慢吗？
typora-copy-images-to: Java的反射慢吗？
date: 2022-08-07 18:00:13
category:
---



# 反射很慢？

有些人说反射很慢，但是也没有人真正地测试过。spring的代码里有好多使用反射的地方，所以性能应该也没有那么差。

本文就来挖一挖反射的实现原理以及可能导致的问题。



## 简单使用

简单地用反射的方式获取一个field的属性：

```java
@RunWith(JUnit4ClassRunner.class)
public class ReflectTest {
  public int count = 10;
  public int getCount() {
    try {
      // 为了查看调用栈
      new RuntimeException().printStackTrace();
    } catch (Throwable ignore) {

    }
    return count;
  }

  private void setCount(int count) {
    this.count = count;
  }
  
  @Test
  @SneakyThrows
  public void testReflection() {
    Class<?> clazz = Class.forName("com.air.lang.reflect.ReflectTest");
    Method getCountMethod = clazz.getDeclaredMethod("getCount", null);
    final Object instance = clazz.newInstance();
    final Object o = getCountMethod.invoke(instance);
    System.out.println("o = " + o);
  }
}
```

运行起来（-XX:+TraceClassLoading ），输出如下：

```bash
[Loaded sun.reflect.NativeMethodAccessorImpl from /Library/Java/JavaVirtualMachines/zulu-8.jdk/Contents/Home/jre/lib/rt.jar]
[Loaded sun.reflect.DelegatingMethodAccessorImpl from /Library/Java/JavaVirtualMachines/zulu-8.jdk/Contents/Home/jre/lib/rt.jar]
java.lang.RuntimeException
	at com.air.lang.reflect.ReflectTest.getCount(ReflectTest.java:21)
	at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
	at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.lang.reflect.Method.invoke(Method.java:498)
	at com.air.lang.reflect.ReflectTest.testReflection(ReflectTest.java:82)
	// 下面是junit用反射调用这个方法的栈
	at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
	at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.lang.reflect.Method.invoke(Method.java:498)
	at org.junit.internal.runners.TestMethod.invoke(TestMethod.java:68)
o = 10
```

从调用栈可以看到，Method的invoke的调用路径：

DelegatingMethodAccessorImpl -> NativeMethodAccessorImpl

翻下invoke的实现：

```java
// java.lang.reflect.Method#invoke
@CallerSensitive
public Object invoke(Object obj, Object... args)
  throws IllegalAccessException, IllegalArgumentException,
InvocationTargetException
{
  if (!override) {
    if (!Reflection.quickCheckMemberAccess(clazz, modifiers)) {
      Class<?> caller = Reflection.getCallerClass();
      checkAccess(caller, clazz, obj, modifiers);
    }
  }
  MethodAccessor ma = methodAccessor;             // read volatile
  if (ma == null) {
    ma = acquireMethodAccessor();
  }
  return ma.invoke(obj, args);
}
```

最终调用是委托给了MethodAccessor，这是java中的一个接口：

```java
// sun.reflect.MethodAccessor

/** This interface provides the declaration for
    java.lang.reflect.Method.invoke(). Each Method object is
    configured with a (possibly dynamically-generated) class which
    implements this interface.
*/

public interface MethodAccessor {
    /** Matches specification in {@link java.lang.reflect.Method} */
    public Object invoke(Object obj, Object[] args)
        throws IllegalArgumentException, InvocationTargetException;
}
```

![image-20220710014957451](/image-20220710014957451.png)

实现类有三个，DelegatingMethodAccessorImpl是代理模式，主要是为了切换底层的实现。因此主要的实现就两种，一个是MethodAccessorImpl，一个是NativeMethodAccessorImpl。

> Delegates its invocation to another MethodAccessorImpl and can change its delegate at run time.



## 简单测试下时间

```java
@SneakyThrows
public void testReflection() {
  Class<?> clazz = Class.forName("com.air.lang.reflect.ReflectTest");
  Method getCountMethod = clazz.getDeclaredMethod("getCount", null);
  final Object instance = clazz.newInstance();
  for (int i = 0; i < 20; i++) {
    // 注意，这里是nano time
    final long start = System.nanoTime();
    final Object o = getCountMethod.invoke(instance);
    System.out.println(i + 1 + ": cost " + (System.nanoTime() - start));
  }
  System.in.read();
}
```

```bash
1: cost 19792
2: cost 3625
3: cost 2583
4: cost 2333
5: cost 3250
6: cost 4166
7: cost 2459
8: cost 27041
9: cost 7875
10: cost 7500
11: cost 8167
12: cost 7500
13: cost 7250
14: cost 7459
15: cost 7750
16: cost 1085417
17: cost 7208
18: cost 2500
19: cost 1917
20: cost 2292
```

注意看，第1次调用和第16次调用，时间都比较长。inflation的默认阈值是15，超过15之后就会转为动态字节码生成的方式，中间要生成字节码，所以耗时较高，之后耗时就降下来了。

# 两种实现方式

> Before Java 1.4 `Method.invoke` worked through a JNI call to VM runtime. 
>
> Since Java 1.4 `Method.invoke` uses dynamic bytecode generation if a method is called more than 15 times (configurable via `sun.reflect.inflationThreshold` system property).

Java 1.4之前都是使用Native的方式调用，1.4之后，会根据调用的阈值做优化，超过一定的阈值`-Dsun.reflect.inflationThreshold`,会转换成dynamic bytecode generation的方式。dynamic bytecode generation的性能会更好。

## Native实现

```java
// sun.reflect.NativeMethodAccessorImpl#invoke
public Object invoke(Object obj, Object[] args)
        throws IllegalArgumentException, InvocationTargetException
{
  // We can't inflate methods belonging to vm-anonymous classes because
  // that kind of class can't be referred to by name, hence can't be
  // found from the generated bytecode.
  if (++numInvocations > ReflectionFactory.inflationThreshold()
      && !ReflectUtil.isVMAnonymousClass(method.getDeclaringClass())) {
    MethodAccessorImpl acc = (MethodAccessorImpl)
      // 超过阈值之后，会切换成动态字节码的方式
      // 注意，这里没有加锁
      new MethodAccessorGenerator().
      generateMethod(method.getDeclaringClass(),
                     method.getName(),
                     method.getParameterTypes(),
                     method.getReturnType(),
                     method.getExceptionTypes(),
                     method.getModifiers());
    // parent就是刚才说的代理DelegatingMethodAccessorImpl
    // 生成结束之后，这里切换成新的调用方式
    parent.setDelegate(acc);
  }

  // 这里是native方法
  return invoke0(method, obj, args);
}

void setParent(DelegatingMethodAccessorImpl parent) {
  this.parent = parent;
}


private static native Object invoke0(Method m, Object obj, Object[] args);
```

去jdk的代码里看看这个nativev方法的实现：

```cpp
// NativeAccessors.c
JNIEXPORT jobject JNICALL Java_jdk_internal_reflect_NativeMethodAccessorImpl_invoke0
(JNIEnv *env, jclass unused, jobject m, jobject obj, jobjectArray args)
{
    return JVM_InvokeMethod(env, m, obj, args);
}

// jvm.cpp
JVM_ENTRY(jobject, JVM_InvokeMethod(JNIEnv *env, jobject method, jobject obj, jobjectArray args0))
  Handle method_handle;
  if (thread->stack_overflow_state()->stack_available((address) &method_handle) >= JVMInvokeMethodSlack) {
    method_handle = Handle(THREAD, JNIHandles::resolve(method));
    Handle receiver(THREAD, JNIHandles::resolve(obj));
    objArrayHandle args(THREAD, objArrayOop(JNIHandles::resolve(args0)));
    oop result = Reflection::invoke_method(method_handle(), receiver, args, CHECK_NULL);
    jobject res = JNIHandles::make_local(THREAD, result);
    if (JvmtiExport::should_post_vm_object_alloc()) {
      oop ret_type = java_lang_reflect_Method::return_type(method_handle());
      assert(ret_type != NULL, "sanity check: ret_type oop must not be NULL!");
      if (java_lang_Class::is_primitive(ret_type)) {
        // Only for primitive type vm allocates memory for java object.
        // See box() method.
        JvmtiExport::post_vm_object_alloc(thread, result);
      }
    }
    return res;
  } else {
    THROW_0(vmSymbols::java_lang_StackOverflowError());
  }
JVM_END
  
  
  
// reflection.cpp
  // This would be nicer if, say, java.lang.reflect.Method was a subclass
// of java.lang.reflect.Constructor

oop Reflection::invoke_method(oop method_mirror, Handle receiver, objArrayHandle args, TRAPS) {
  oop mirror             = java_lang_reflect_Method::clazz(method_mirror);
  int slot               = java_lang_reflect_Method::slot(method_mirror);
  bool override          = java_lang_reflect_Method::override(method_mirror) != 0;
  objArrayHandle ptypes(THREAD, objArrayOop(java_lang_reflect_Method::parameter_types(method_mirror)));

  oop return_type_mirror = java_lang_reflect_Method::return_type(method_mirror);
  BasicType rtype;
  if (java_lang_Class::is_primitive(return_type_mirror)) {
    rtype = basic_type_mirror_to_basic_type(return_type_mirror);
  } else {
    rtype = T_OBJECT;
  }

  InstanceKlass* klass = InstanceKlass::cast(java_lang_Class::as_Klass(mirror));
  Method* m = klass->method_with_idnum(slot);
  if (m == NULL) {
    THROW_MSG_0(vmSymbols::java_lang_InternalError(), "invoke");
  }
  methodHandle method(THREAD, m);

  return invoke(klass, method, receiver, override, ptypes, rtype, args, true, THREAD);
}
```

invoke方法就比较复杂了，这里就不跟进了，可以看到native的实现就是使用JNI调用，然后利用jvm内部的数据结构完成方法的调用。



## dynamic bytecode generation


>The approach with dynamic bytecode generation is much faster since it

- does not suffer from **JNI overhead**;
- does not need to parse method signature each time, because each method invoked via Reflection has its own **unique MethodAccessor**;
- can be further optimized, e.g. these MethodAccessors can benefit from all regular **JIT optimizations** like inlining, constant propagation, autoboxing elimination etc.
- Note, that this optimization is implemented mostly in Java code without JVM assistance. The only thing HotSpot VM does to make this optimization possible - is skipping bytecode verification for such generated MethodAccessors. Otherwise the verifier would not allow, for example, to call private methods.

稍微改造下代码：

```java
@Test
@SneakyThrows
public void testReflection() {
  Class<?> clazz = Class.forName("com.air.lang.reflect.ReflectTest");
  Method getCountMethod = clazz.getDeclaredMethod("getCount", null);
  final Object instance = clazz.newInstance();
  for (int i = 0; i < 20; i++) {
    final Object o = getCountMethod.invoke(instance);
    System.out.println("o = " + o);
  }
  // 阻塞退出，等待输入
  System.in.read();
}
```

程序跑起来之后，反复调用了20次，超过了默认的阈值，会自动生成字节码。

第一次输出的调用栈：

```bash
java.lang.RuntimeException
	at com.air.lang.reflect.ReflectTest.getCount(ReflectTest.java:21)
	at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
	at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.lang.reflect.Method.invoke(Method.java:498)
	at com.air.lang.reflect.ReflectTest.testReflection(ReflectTest.java:83)
```

最后一次输出的调用栈：

```bash
java.lang.RuntimeException
	at com.air.lang.reflect.ReflectTest.getCount(ReflectTest.java:21)
	at sun.reflect.GeneratedMethodAccessor1.invoke(Unknown Source)
	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.lang.reflect.Method.invoke(Method.java:498)
	at com.air.lang.reflect.ReflectTest.testReflection(ReflectTest.java:83)
```

调用栈发生了变化，**从NativeMethodAccessorImpl变为了GeneratedMethodAccessor1**

我们用arthas找下生成的字节码：

```bash
[arthas@45767]$ sc -d *GeneratedMethodAccessor1
 class-info        sun.reflect.GeneratedMethodAccessor1
 code-source
 name              sun.reflect.GeneratedMethodAccessor1
 isInterface       false
 isAnnotation      false
 isEnum            false
 isAnonymousClass  false
 isArray           false
 isLocalClass      false
 isMemberClass     false
 isPrimitive       false
 isSynthetic       false
 simple-name       GeneratedMethodAccessor1
 modifier          public
 annotation
 interfaces
 super-class       +-sun.reflect.MethodAccessorImpl
                     +-sun.reflect.MagicAccessorImpl
                       +-java.lang.Object
 class-loader      +-sun.reflect.DelegatingClassLoader@57fa26b7
                     +-sun.misc.Launcher$AppClassLoader@18b4aac2
                       +-sun.misc.Launcher$ExtClassLoader@6d3a7064
 classLoaderHash   57fa26b7

Affect(row-cnt:1) cost in 29 ms.
```

反编译下看看生成的类：

```java
[arthas@45767]$ jad sun.reflect.GeneratedMethodAccessor1

ClassLoader:
+-sun.reflect.DelegatingClassLoader@57fa26b7
  +-sun.misc.Launcher$AppClassLoader@18b4aac2
    +-sun.misc.Launcher$ExtClassLoader@6d3a7064

Location:

/*
 * Decompiled with CFR.
 *
 * Could not load the following classes:
 *  com.air.lang.reflect.ReflectTest
 */
package sun.reflect;

import com.air.lang.reflect.ReflectTest;
import java.lang.reflect.InvocationTargetException;
import sun.reflect.MethodAccessorImpl;

public class GeneratedMethodAccessor1
extends MethodAccessorImpl {
    /*
     * Loose catch block
     */
    public Object invoke(Object object, Object[] objectArray) throws InvocationTargetException {
        ReflectTest reflectTest;
        block5: {
            if (object == null) {
                throw new NullPointerException();
            }
          	// 这里直接强转了，把Object类型转成了目标类型ReflectTest
            reflectTest = (ReflectTest)object;
            if (objectArray == null || objectArray.length == 0) break block5;
            throw new IllegalArgumentException();
        }
        try {
          	// 调用对应的方法
            return new Integer(reflectTest.getCount());
        }
        catch (Throwable throwable) {
            throw new InvocationTargetException(throwable);
        }
        catch (ClassCastException | NullPointerException runtimeException) {
            throw new IllegalArgumentException(super.toString());
        }
    }
}

Affect(row-cnt:1) cost in 537 ms.
```

可以看到，动态生成的字节码，跟直接方法调用差别并不是很大。值得注意的是，这个类的classloader是`sun.reflect.DelegatingClassLoader`.

### DelegatingClassLoader

DelegatingClassLoader有何特殊之处？看代码也没有特殊的实现，应该只是为了做classloader隔离。

```java
// sun.reflect.DelegatingClassLoader
// NOTE: this class's name and presence are known to the virtual
// machine as of the fix for 4474172.
class DelegatingClassLoader extends ClassLoader {
    DelegatingClassLoader(ClassLoader parent) {
        super(parent);
    }
}
```

> 之所以搞一个新的类加载器，是为了**性能考虑**，在某些情况下可以**卸载这些生成的类**，因为类的卸载是只有在类加载器可以被回收的情况下才会被回收的，如果用了原来的类加载器，那可能导致这些新创建的类一直无法被卸载，从其设计来看本身就不希望他们一直存在内存里的，在需要的时候有就行了，在内存紧俏的时候可以释放掉内存
>
> ——你假笨 [假笨说-从一起GC血案谈到反射原理](https://mp.weixin.qq.com/s/5H6UHcP6kvR2X5hTj_SBjA)

> - first, it avoids any possible security risk of having these bytecodes in the same loader.
>
> - Second, it allows the generated bytecodes to be unloaded earlier 
>
>   than would otherwise be possible, decreasing run-time footprint.



```java
// jdk.internal.reflect.ClassDefiner
/** Utility class which assists in calling defineClass() by
    creating a new class loader which delegates to the one needed in
    order for proper resolution of the given bytecodes to occur. */

class ClassDefiner {
    static final JavaLangAccess JLA = SharedSecrets.getJavaLangAccess();

    /** <P> We define generated code into a new class loader which
      delegates to the defining loader of the target class. It is
      necessary for the VM to be able to resolve references to the
      target class from the generated bytecodes, which could not occur
      if the generated code was loaded into the bootstrap class
      loader. </P>

      <P> There are two primary reasons for creating a new loader
      instead of defining these bytecodes directly into the defining
      loader of the target class: first, it avoids any possible
      security risk of having these bytecodes in the same loader.
      Second, it allows the generated bytecodes to be unloaded earlier
      than would otherwise be possible, decreasing run-time
      footprint. </P>
    */
    static Class<?> defineClass(String name, byte[] bytes, int off, int len,
                                final ClassLoader parentClassLoader)
    {
        ClassLoader newLoader = AccessController.doPrivileged(
            new PrivilegedAction<ClassLoader>() {
                public ClassLoader run() {
                        return new DelegatingClassLoader(parentClassLoader);
                    }
                });
        return JLA.defineClass(newLoader, name, bytes, null, "__ClassDefiner__");
    }
}
```



# 反射使用过多可能造成的问题

前面说到达到阈值，切换为动态字节码生成时**没有加锁**。而每次生成动态字节码，都会生成自己的类加载器。如果并发很高，会导致classloader和class过多，占用相应的内存。

# 参考

- [关于反射调用方法的一个log - Script Ahead, Code Behind - ITeye博客](http://rednaxelafx.iteye.com/blog/548536)
- [java - What is a de-reflection optimization in HotSpot JIT and how does it implemented? - Stack Overflow](https://stackoverflow.com/questions/28793118/what-is-a-de-reflection-optimization-in-hotspot-jit-and-how-does-it-implemented)
- [Java 反射到底慢在哪里？ - 知乎](https://www.zhihu.com/question/19826278/answer/44331421)
- [Java反射原理简析 | Yilun Fan's Blog](http://www.fanyilun.me/2015/10/29/Java%E5%8F%8D%E5%B0%84%E5%8E%9F%E7%90%86/)
- [07 | JVM是如何实现反射的？](https://time.geekbang.org/column/article/12192)
- [假笨说-从一起GC血案谈到反射原理](https://mp.weixin.qq.com/s/5H6UHcP6kvR2X5hTj_SBjA)
- [反射代理类加载器的潜在内存使用问题 - 简书](https://www.jianshu.com/p/20b7ab284c0a)