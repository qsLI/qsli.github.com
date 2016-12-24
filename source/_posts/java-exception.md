title: Java中的异常处理
date: 2016-09-25 22:49:04
tags: exception
category: java
toc: true

---

## 异常的分类

* 业务异常

> 处理业务的时候80%的时候是没问题的，但可能有20%的时候事情没
> 有按理想的方向发展。例如注册用户的时候，正常情况是注册成功，但
> 可能用户提交请求的时候，系统发现用户名已经被别人注册了，这是就
> 可以抛出一个UserAlreadyExistsException
>
来自 <https://github.com/kyfxbl/blog/blob/master/source/_posts/%E5%BC%82%E5%B8%B8%E5%A4%84%E7%90%86%E6%9C%80%E4%BD%B3%E5%AE%9E%E8%B7%B5.md>

业务异常一般是上层可以处理的，一般声明为`CheckedException`，强制上层进行捕获处理

业务异常定义示例摘自[spring mvc 异常统一处理](http://gaojiewyh.iteye.com/blog/1297746#bc2369985)：

```
public class BusinessException extends Exception {  
   
    private static final long serialVersionUID = 1L;  
   
    public BusinessException() {  
        // TODO Auto-generated constructor stub  
    }  
   
    public BusinessException(String message) {  
        super(message);  
        // TODO Auto-generated constructor stub  
    }  
   
    public BusinessException(Throwable cause) {  
        super(cause);  
        // TODO Auto-generated constructor stub  
    }  
   
    public BusinessException(String message, Throwable cause) {  
        super(message, cause);  
        // TODO Auto-generated constructor stub  
    }  
   
}  
```

一般是继承自`Exception`, 这样就成为`CheckedException`， 必须强制捕获

* 逻辑异常

> 系统异常与具体业务流程没有直接的关系，例如编程错误导致的NullPointExcpetion，
> 还有环境问题，例如磁盘损坏或者网络连接不稳定造成了IOException。

> 来自  <https://github.com/kyfxbl/blog/blob/master/source/_posts/%E5%BC%82%E5%B8%B8%E5%A4%84%E7%90%86%E6%9C%80%E4%BD%B3%E5%AE%9E%E8%B7%B5.md>

系统异常一般是上层无法处理的，所以一般声明为`UncheckedException`，不强制用户捕获。
```
public class SystemException extends RuntimeException {  
   
    private static final long serialVersionUID = 1L;  
   
    public SystemException() {  
        // TODO Auto-generated constructor stub  
    }  
   
    /** 
     * @param message 
     */  
    public SystemException(String message) {  
        super(message);  
        // TODO Auto-generated constructor stub  
    }  
   
    /** 
     * @param cause 
     */  
    public SystemException(Throwable cause) {  
        super(cause);  
        // TODO Auto-generated constructor stub  
    }  
   
    /** 
     * @param message 
     * @param cause 
     */  
    public SystemException(String message, Throwable cause) {  
        super(message, cause);  
        // TODO Auto-generated constructor stub  
    }  
   
}  

```

## 异常的捕获

• 在Service层中应该捕获Dao层抛出的异常并且包装成相应的异常，如业务异常、系统异常等

  业务层中，通过异常链保存原始异常信息。程序员必须自己编码来保存原始异常的信息。在业务逻辑中，捕获DataAccessException异常，处理包装成SystemException异常抛出。捕获ObjectNotFoundException，DuplicateKeyException异常，处理包装成BusinessException异常抛出。业务层中应根据业务的不同，将异常尽量分得细一点，否则，自定义的异常没有太多的意义。

来自 <http://gaojiewyh.iteye.com/blog/1739662>

```
public addUser(User user) throws BusinessException,SystemException{  
        try{  
              userDao.addUser(user);  
        }catch(DuplicatekeyException ex){  
             log.infor("......................");  
             throw new BusinessException(ex.getCause(),"国际化信息"）；  
        }catch(DataAccessException ex){  
             log.error("......................");  
             throw new SystemException(ex.getCause(),"国际化信息"）；  
        }  
}  

```

## 常见误区

### 一、定义上捕获者需要用到的信息

```
public class DuplicateUsernameException extends Exception {  
}  
```

#### 理由: 
它除了有一个"意义明确"的名字以外没有任何有用的信息了。不要忘记Exception跟其他的Java类一样，客户端可以调用其中的方法来得到更多的信息。  

```
public class DuplicateUsernameException extends Exception {
    private static final long serialVersionUID = -6113064394525919823L;
    private String username = null;
    private String[] availableNames = new String[0];
 
    public DuplicateUsernameException(String username) {
            this.username = username;
    }
 
    public DuplicateUsernameException(String username, String[] availableNames) {
            this(username);
            this.availableNames = availableNames;
    }
 
    public String requestedUsername() {
            return this.username;
    }
 
    public String[] availableNames() {
            return this.availableNames;
    }
}
```
来自 <http://www.iteye.com/topic/857443>

### 二、尽可能避免（因抛出异常带来的）接口污染

来自 <http://lavasoft.blog.51cto.com/62575/244138/>

### 三、异常链传播

```
public void dataAccessCode(){
    try{
        ..some code that throws SQLException
    }catch(SQLException ex){
        throw new RuntimeException(ex);
    }
}
```

## 参考链接：

1. [Best Practices for Exception Handling](http://www.onjava.com/pub/a/onjava/2003/11/19/exceptions.html?page=2)

2. [基于Spring的异常体系处理](http://gaojiewyh.iteye.com/blog/1739662)

3. [spring mvc 异常统一处理](http://gaojiewyh.iteye.com/blog/1297746#bc2369985)

4. [异常处理最佳实践.md](https://github.com/kyfxbl/blog/blob/master/source/_posts/%E5%BC%82%E5%B8%B8%E5%A4%84%E7%90%86%E6%9C%80%E4%BD%B3%E5%AE%9E%E8%B7%B5.md)
