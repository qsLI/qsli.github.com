---
title: guava-eventbus
tags: event-bus
category: guava
toc: true
date: 2017-01-17 01:30:26
---


## 从观察者模式说起

### 观察者模式类图

观察者模式是软件设计中经常使用到的一种模式，又叫发布-订阅模式（Publish/Subscribe）、模型-视图(Model/View)模式、源-监听器（Source/Listener）模式或从属者（Dependents）模式。

{% plantuml %}

package subject{
  object Subject {
  + notifyObservers()
  + addObserver()
  + deleteObserver()
  }

  object ConcreteSubjectA{
  + notifyObservers()
  }

  object ConcreteSubjectB{
  + notifyObservers()
  }

  Subject <|-- ConcreteSubjectA
  Subject <|-- ConcreteSubjectB
}

package observer{
  object Observer{
  + notify()
  }

  Subject o-- "*" Observer : (Observer Collection)

  object ConcreteObserverA{
  + notify()
  }

  object ConcreteObserverB{
  + notify()
  }

  Observer <|-- ConcreteObserverA
  Observer <|-- ConcreteObserverB

}

ConcreteSubjectA -[#green,dotted]> ConcreteObserverA
ConcreteSubjectA  -[#green,dotted]> ConcreteObserverB

{% endplantuml %}

### Java中的支持

Java中有一个`Observable`类和一个`Observer`接口, `Observable`类已经实现了添加、删除观察者的方法。

- 主题继承自`Observable`，继承一些便利方法

```java
public class Subject extends Observable {

    private final String subject = "play with some fun";

    public void push(String message) {
        notifyObservers(message);
    }

    public String getSubject() {
        return subject;
    }

    public static void main(String[] args) {
        Subject subject = new Subject();
        subject.addObserver(new Watcher("001"));
        subject.addObserver(new Watcher("007"));
        subject.setChanged();
        //will do nothing until setChanged() is called
        subject.push("My watch is ended!");
    }
}

```


- 观察者继承`Observer`接口，只有一个`update`方法用来更新数据

```java
public class Watcher implements Observer {

    private final String id;

    public Watcher(String id) {
        this.id = id;
        System.out.println("My watch begins! " + id);
    }

    @Override
    public void update(Observable o, Object arg) {
        System.out.println("-----------------------------------------------------------");
        System.out.println(id);
        Subject subject = (Subject) o;
        System.out.println("subject is : " + subject.getSubject());
        System.out.println("update data is : " + (String)arg );
    }
}
```

输出示例：

```
My watch begins! 001
My watch begins! 007
-----------------------------------------------------------
007
subject is : play with some fun
update data is : My watch is ended!
-----------------------------------------------------------
001
subject is : play with some fun
update data is : My watch is ended!

```

### EventBus

>EventBus allows publish-subscribe-style communication between components without requiring the components to explicitly register with one another (and thus be aware of each other). It is designed exclusively to replace traditional Java in-process event distribution using explicit registration. It is not a general-purpose publish-subscribe system, nor is it intended for interprocess communication.


EventBus的优点：

- 无需定义接口，使用注解的形式。
- 可以在一个类中实现多个事件的捕获。

> Due to erasure, no single class can implement a generic interface more than once with different type parameters. 

- 支持子类的捕获。
- 支持捕获无人处理的event（让我想起了死漂）。
- 传递的事件类型可以是任意的。


```java
public class Person {
    private String name;
    private int age;

    public Person() {

    }

    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getAge() {
        return age;
    }

    public void setAge(int age) {
        this.age = age;
    }

    @Override
    public String toString() {
        return "Person{" +
                "name='" + name + '\'' +
                ", age=" + age +
                '}';
    }
}

public class Customer extends Person  implements Serializable {

    private List<String> hobbies;

    public Customer(String name, int age) {
        super(name, age);
    }

    public List<String> getHobbies() {
        return hobbies;
    }

    public void setHobbies(List<String> hobbies) {
        this.hobbies = hobbies;
    }
}

```

定义一个`Person`类和一个`Customer`类，用于测试继承关系的捕捉

```java
public class EventBusTest {

    public static void main(String[] args) {
        EventBus eventBus = new EventBus();
        eventBus.register(new EventBusChangeRecorder());
        Customer customer = new Customer("customer", 66);
        Person p = new Person("person", 11);
        eventBus.post(customer);
        eventBus.post(p);
        eventBus.post(new Integer(123));
        eventBus.post("Hello World");
    }

    static class EventBusChangeRecorder {
        @Subscribe
        public void recordCustomerChange(Customer customer) {
            System.out.println("-----------------------------------");
            System.out.println("recieved change:");
            System.out.println("customer name: " + customer.getName());
            System.out.println("cutomer age: " + customer.getAge());
            System.out.println("\n\n");
        }

        @Subscribe
        public void valueChange(Integer val) {//注意方法的类型
            System.out.println("-----------------------------------");
            System.out.println("val = " + val);
            System.out.println("\n");
        }

        @Subscribe
        public void deadEvent(DeadEvent deadEvent) {
            System.out.println("-----------------------------------");
            System.out.println("deadEvent = " + deadEvent);
            System.out.println("\n");
        }

        @Subscribe
        public void hierarchy(Person person) {
            System.out.println("-----------------------------------");
            //will recieve all person and it's subtype
            System.out.println(person);
            System.out.println("\n");
        }

    }

}


```

在我的电脑上的执行结果:

```
-----------------------------------
recieved change:
customer name: customer
cutomer age: 66



-----------------------------------
Person{name='customer', age=66}


-----------------------------------
Person{name='person', age=11}


-----------------------------------
val = 123


-----------------------------------
deadEvent = DeadEvent{source=EventBus{default}, event=Hello World}
```

### 源码解析

#### listener注册过程

`EventBus`中有一个成员变量叫做`subscribers`, 负责管理所有注册进来的listener

```java
  private final SubscriberRegistry subscribers = new SubscriberRegistry(this);
```

`register(Object object)`方法就是调用`subscribers`的注册方法

```java
  /**
   * Registers all subscriber methods on {@code object} to receive events.
   *
   * @param object object whose subscriber methods should be registered.
   */
  public void register(Object object) {
    subscribers.register(object);
  }

    /**
   * Registers all subscriber methods on the given listener object.
   */
  void register(Object listener) {
    //解析注解，生成<EventType, ListenMethod>的multimap
    Multimap<Class<?>, Subscriber> listenerMethods = findAllSubscribers(listener);

    for (Map.Entry<Class<?>, Collection<Subscriber>> entry : listenerMethods.asMap().entrySet()) {
      Class<?> eventType = entry.getKey();
      Collection<Subscriber> eventMethodsInListener = entry.getValue();

      CopyOnWriteArraySet<Subscriber> eventSubscribers = subscribers.get(eventType);

      //新建或者添加到已有的事件对应的Listener中
      if (eventSubscribers == null) {
        CopyOnWriteArraySet<Subscriber> newSet = new CopyOnWriteArraySet<Subscriber>();
        eventSubscribers =
            MoreObjects.firstNonNull(subscribers.putIfAbsent(eventType, newSet), newSet);
      }

      eventSubscribers.addAll(eventMethodsInListener);
    }
  }


    /**
   * Returns all subscribers for the given listener grouped by the type of event they subscribe to.
   */
  private Multimap<Class<?>, Subscriber> findAllSubscribers(Object listener) {
    Multimap<Class<?>, Subscriber> methodsInListener = HashMultimap.create();
    Class<?> clazz = listener.getClass();
    for (Method method : getAnnotatedMethods(clazz)) {//有缓存哦
      Class<?>[] parameterTypes = method.getParameterTypes();
      Class<?> eventType = parameterTypes[0];
      methodsInListener.put(eventType, Subscriber.create(bus, listener, method));
    }
    return methodsInListener;
  }
```

在`subscribers`的注册方法中完成了对注解`@Subscribe`的解析。

#### 事件分发过程

`EventBus`的post方法

```java
  /**
   * Posts an event to all registered subscribers. This method will return successfully after the
   * event has been posted to all subscribers, and regardless of any exceptions thrown by
   * subscribers.
   *
   * <p>If no subscribers have been subscribed for {@code event}'s class, and {@code event} is not
   * already a {@link DeadEvent}, it will be wrapped in a DeadEvent and reposted.
   *
   * @param event event to post.
   */
  public void post(Object event) {
    Iterator<Subscriber> eventSubscribers = subscribers.getSubscribers(event);
    if (eventSubscribers.hasNext()) {
      dispatcher.dispatch(event, eventSubscribers);
    } else if (!(event instanceof DeadEvent)) {
      // the event had no subscribers and was not itself a DeadEvent
      post(new DeadEvent(this, event));
    }
  }
```

这里的`dispatcher`默认是`Dispatcher.perThreadDispatchQueue()`

它的`dispatch`方法实现如下：

```java

    /**
     * Per-thread queue of events to dispatch.
     */
    private final ThreadLocal<Queue<Event>> queue =
        new ThreadLocal<Queue<Event>>() {
          @Override
          protected Queue<Event> initialValue() {
            return Queues.newArrayDeque();
          }
        };

    /**
     * Per-thread dispatch state, used to avoid reentrant event dispatching.
     */
    private final ThreadLocal<Boolean> dispatching =
        new ThreadLocal<Boolean>() {
          @Override
          protected Boolean initialValue() {
            return false;
          }
        };


    @Override
    void dispatch(Object event, Iterator<Subscriber> subscribers) {
      //入参校验
      checkNotNull(event);
      checkNotNull(subscribers);
      //从ThreadLocal中拿到队列
      Queue<Event> queueForThread = queue.get();
      //先把事件入队列
      queueForThread.offer(new Event(event, subscribers));

      if (!dispatching.get()) {
        dispatching.set(true);
        try {
          Event nextEvent;
          //遍历队列中的事件，并分发给相应的订阅者
          while ((nextEvent = queueForThread.poll()) != null) {
            while (nextEvent.subscribers.hasNext()) {
              nextEvent.subscribers.next().dispatchEvent(nextEvent.event);
            }
          }
        } finally {
          dispatching.remove();
          queue.remove();
        }
      }
    }
```

EventBus的注解提取（简单的缓存），构建相应的Map，以及事件的分发设计地非常好，有了一个大型系统完整的雏形。

## 参考

1. [Guava学习笔记：EventBus - peida - 博客园](http://www.cnblogs.com/peida/p/EventBus.html)

2. [EventBusExplained · google/guava Wiki](https://github.com/google/guava/wiki/EventBusExplained)

3. [观察者模式 - 维基百科，自由的百科全书](https://zh.wikipedia.org/wiki/%E8%A7%82%E5%AF%9F%E8%80%85%E6%A8%A1%E5%BC%8F)

4. [观察者模式 — Graphic Design Patterns](http://design-patterns.readthedocs.io/zh_CN/latest/behavioral_patterns/observer.html)