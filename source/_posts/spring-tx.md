---
title: spring-transaction
tags: transaction
category: spring
toc: true
typora-root-url: spring-tx
typora-copy-images-to: spring-tx
date: 2021-03-23 17:35:02
---



## 使用

### JDBC事务
```java
    @Test
    @SneakyThrows
    public void testTransaction() {
        try (Connection conn = DriverManager.getConnection(connectString)) {
            conn.setAutoCommit(false);
            try (PreparedStatement psts = conn.prepareStatement("update words set word=CONCAT(word, '++') where id=?")) {
                // 第一个更新语句
                psts.setInt(1, 2);
                psts.executeUpdate();
                // 第二个更新语句
                // 抛出异常
                int i = 1/0;
                psts.setInt(1, 3);
                psts.executeUpdate();
                // 提交事务
                conn.commit();
            } catch (Throwable t) {
                conn.rollback();
            }

        }
    }
```
结果：
```bash
2021-03-23T03:07:15.228849Z	   93 Connect	root@localhost on test using TCP/IP
2021-03-23T03:07:15.235215Z	   93 Query	/* mysql-connector-java-8.0.20 (Revision: afc0a13cd3c5a0bf57eaa809ee0ee6df1fd5ac9b) */SELECT  @@session.auto_increment_increment AS auto_increment_increment, @@character_set_client AS character_set_client, @@character_set_connection AS character_set_connection, @@character_set_results AS character_set_results, @@character_set_server AS character_set_server, @@collation_server AS collation_server, @@collation_connection AS collation_connection, @@init_connect AS init_connect, @@interactive_timeout AS interactive_timeout, @@license AS license, @@lower_case_table_names AS lower_case_table_names, @@max_allowed_packet AS max_allowed_packet, @@net_write_timeout AS net_write_timeout, @@performance_schema AS performance_schema, @@sql_mode AS sql_mode, @@system_time_zone AS system_time_zone, @@time_zone AS time_zone, @@transaction_isolation AS transaction_isolation, @@wait_timeout AS wait_timeout
2021-03-23T03:07:15.257727Z	   93 Query	SET character_set_results = NULL
2021-03-23T03:07:15.261596Z	   93 Query	SET autocommit=0
2021-03-23T03:07:15.296076Z	   93 Query	update words set word=CONCAT(word, '++') where id=2
2021-03-23T03:07:15.305666Z	   93 Query	rollback
2021-03-23T03:07:15.330138Z	   93 Query	rollback
2021-03-23T03:07:15.347768Z	   93 Quit
```

可以看出使用原始的JDBC提供的接口，需要获取conn，设置各种属性，获取statement，同时还需要处理各种资源的关闭，事务的commit或者rollback。这些步骤就是`boilerplate code`——样板化的代码，非常适合使用模板方法，将这些细节隐藏起来。

spring提供了JdbcTemplate来简化jdbc相关的开发，对于事务相关的开发，提供了声明式事务和编程式事务。

###  声明式事务（Declarative transaction management）

```xml
<bean id="mindTransactionManager" class="org.springframework.jdbc.datasource.DataSourceTransactionManager">
  <property name="dataSource" ref="mindDataSource"/>
</bean>

<!-- 开启事务注解@Transactional支持 -->
<tx:annotation-driven/>
```

使用

```java
@Transactional(transactionManager = "mindTransactionManager", readOnly = true)
public void query() {
  final MindEntity mindEntity = minderDao.selectOne(1);
  log.info("mindEntity = {}", mindEntity);
}
```



### 编程式事务 （Programmatic transaction management）

```java
@Bean(name = "orderShardingTransactionTemplate")
public TransactionTemplate transactionTemplate(
  @Qualifier("orderShardingTransactionManager") DataSourceTransactionManager dataSourceTransactionManager) {
  final TransactionTemplate transactionTemplate = new TransactionTemplate(dataSourceTransactionManager);
  transactionTemplate.setTimeout(60);
  return transactionTemplate;
}
```

使用：

```java
transactionTemplate.execute(status -> {})
```



## 源码分析

{% plantuml %}

actor client

participant TransactionTemplate

participant PlatformTransactionManager

participant TransactionCallback

participant BizLogic




==  Spring事务执行过程 ==

client -> TransactionTemplate: execute(TransactionCallback<T> action)

activate TransactionTemplate

TransactionTemplate -> PlatformTransactionManager: getTransaction

PlatformTransactionManager --> TransactionTemplate: TransactionStatus

TransactionTemplate -> TransactionCallback: doInTransaction

TransactionCallback -> BizLogic: 业务逻辑

TransactionTemplate -> PlatformTransactionManager: commit | rollback

TransactionTemplate --> client: result

deactivate TransactionTemplate



{% endplantuml %}

声明式事务，最终通过AOP代理到了`TransactionInterceptor`(org.springframework.transaction.interceptor.TransactionInterceptor)，处理逻辑可以顺着配置类查看，这里不再赘述。

下面从编程式事务入手，解析下源码

### TransactionTemplate

```java
// org.springframework.transaction.support.TransactionTemplate#execute
@Override
@Nullable
public <T> T execute(TransactionCallback<T> action) throws TransactionException {
  Assert.state(this.transactionManager != null, "No PlatformTransactionManager set");

  if (this.transactionManager instanceof CallbackPreferringPlatformTransactionManager) {
    return ((CallbackPreferringPlatformTransactionManager) this.transactionManager).execute(this, action);
  }
  else {
    // 获取TransactionStatus
    TransactionStatus status = this.transactionManager.getTransaction(this);
    T result;
    try {
      // 执行业务代码
      result = action.doInTransaction(status);
    }
    catch (RuntimeException | Error ex) {
      // Transactional code threw application exception -> rollback
      // 回滚
      rollbackOnException(status, ex);
      throw ex;
    }
    catch (Throwable ex) {
      // Transactional code threw unexpected exception -> rollback
      // 回滚
      rollbackOnException(status, ex);
      throw new UndeclaredThrowableException(ex, "TransactionCallback threw undeclared checked exception");
    }
    // 提交事务
    this.transactionManager.commit(status);
    return result;
  }
}
```

模板里的代码没什么看的，整体的逻辑都委托给了`PlatformTransactionManager`

### PlatformTransactionManager

>  This is the central interface in Spring's transaction infrastructure.
>  Applications can use this directly, but it is not primarily meant as API:
>  Typically, applications will work with either **TransactionTemplate** or
>  **declarative transaction demarcation through AOP**.

![image-20210323104428182](/image-20210323104428182.png)

`PlatformTransactionManager`定义了三个接口，`getTransaction`/`commit`/`rollback`

```java
public interface PlatformTransactionManager {

	/**
	 * Return a currently active transaction or create a new one, according to
	 * the specified propagation behavior.
	 * <p>Note that parameters like isolation level or timeout will only be applied
	 * to new transactions, and thus be ignored when participating in active ones.
	 * <p>Furthermore, not all transaction definition settings will be supported
	 * by every transaction manager: A proper transaction manager implementation
	 * should throw an exception when unsupported settings are encountered.
	 * <p>An exception to the above rule is the read-only flag, which should be
	 * ignored if no explicit read-only mode is supported. Essentially, the
	 * read-only flag is just a hint for potential optimization.
	 * @param definition TransactionDefinition instance (can be {@code null} for defaults),
	 * describing propagation behavior, isolation level, timeout etc.
	 * @return transaction status object representing the new or current transaction
	 * @throws TransactionException in case of lookup, creation, or system errors
	 * @throws IllegalTransactionStateException if the given transaction definition
	 * cannot be executed (for example, if a currently active transaction is in
	 * conflict with the specified propagation behavior)
	 * @see TransactionDefinition#getPropagationBehavior
	 * @see TransactionDefinition#getIsolationLevel
	 * @see TransactionDefinition#getTimeout
	 * @see TransactionDefinition#isReadOnly
	 */
	TransactionStatus getTransaction(TransactionDefinition definition) throws TransactionException;

	/**
	 * Commit the given transaction, with regard to its status. If the transaction
	 * has been marked rollback-only programmatically, perform a rollback.
	 * <p>If the transaction wasn't a new one, omit the commit for proper
	 * participation in the surrounding transaction. If a previous transaction
	 * has been suspended to be able to create a new one, resume the previous
	 * transaction after committing the new one.
	 * <p>Note that when the commit call completes, no matter if normally or
	 * throwing an exception, the transaction must be fully completed and
	 * cleaned up. No rollback call should be expected in such a case.
	 * <p>If this method throws an exception other than a TransactionException,
	 * then some before-commit error caused the commit attempt to fail. For
	 * example, an O/R Mapping tool might have tried to flush changes to the
	 * database right before commit, with the resulting DataAccessException
	 * causing the transaction to fail. The original exception will be
	 * propagated to the caller of this commit method in such a case.
	 * @param status object returned by the {@code getTransaction} method
	 * @throws UnexpectedRollbackException in case of an unexpected rollback
	 * that the transaction coordinator initiated
	 * @throws HeuristicCompletionException in case of a transaction failure
	 * caused by a heuristic decision on the side of the transaction coordinator
	 * @throws TransactionSystemException in case of commit or system errors
	 * (typically caused by fundamental resource failures)
	 * @throws IllegalTransactionStateException if the given transaction
	 * is already completed (that is, committed or rolled back)
	 * @see TransactionStatus#setRollbackOnly
	 */
	void commit(TransactionStatus status) throws TransactionException;

	/**
	 * Perform a rollback of the given transaction.
	 * <p>If the transaction wasn't a new one, just set it rollback-only for proper
	 * participation in the surrounding transaction. If a previous transaction
	 * has been suspended to be able to create a new one, resume the previous
	 * transaction after rolling back the new one.
	 * <p><b>Do not call rollback on a transaction if commit threw an exception.</b>
	 * The transaction will already have been completed and cleaned up when commit
	 * returns, even in case of a commit exception. Consequently, a rollback call
	 * after commit failure will lead to an IllegalTransactionStateException.
	 * @param status object returned by the {@code getTransaction} method
	 * @throws TransactionSystemException in case of rollback or system errors
	 * (typically caused by fundamental resource failures)
	 * @throws IllegalTransactionStateException if the given transaction
	 * is already completed (that is, committed or rolled back)
	 */
	void rollback(TransactionStatus status) throws TransactionException;

}
```

#### AbstractPlatformTransactionManager

`AbstractPlatformTransactionManager`主要实现了两个功能：

- 挂起和恢复事务（propagation behavior）
- 通知`TransactionSynchronization`事务的状态

#### 获取事务过程

```java
/**
	 * This implementation handles propagation behavior. Delegates to
	 * {@code doGetTransaction}, {@code isExistingTransaction}
	 * and {@code doBegin}.
	 * @see #doGetTransaction
	 * @see #isExistingTransaction
	 * @see #doBegin
	 */
@Override
public final TransactionStatus getTransaction(TransactionDefinition definition) throws TransactionException {
  // 留给子类实现
  // template method，
  Object transaction = doGetTransaction();

  // Cache debug flag to avoid repeated checks.
  boolean debugEnabled = logger.isDebugEnabled();

  if (definition == null) {
    // Use defaults if no transaction definition given.
    definition = new DefaultTransactionDefinition();
  }

  // 当前是否存在事务
  // isExistingTransaction也是子类负责实现的
  // template method，
  if (isExistingTransaction(transaction)) {
    // Existing transaction found -> check propagation behavior to find out how to behave.
    // 处理事务的传播和挂起
    // 直接返回handleExistingTransaction的结果
    return handleExistingTransaction(definition, transaction, debugEnabled);
  }
	
  // ------------------------------------- 新事务处理流程 -------------------------------------
  // Check definition settings for new transaction.
  // 事务超时
  if (definition.getTimeout() < TransactionDefinition.TIMEOUT_DEFAULT) {
    throw new InvalidTimeoutException("Invalid transaction timeout", definition.getTimeout());
  }

  // No existing transaction found -> check propagation behavior to find out how to proceed.
  if (definition.getPropagationBehavior() == TransactionDefinition.PROPAGATION_MANDATORY) {
    throw new IllegalTransactionStateException(
      "No existing transaction found for transaction marked with propagation 'mandatory'");
  }
  else if (definition.getPropagationBehavior() == TransactionDefinition.PROPAGATION_REQUIRED ||
           definition.getPropagationBehavior() == TransactionDefinition.PROPAGATION_REQUIRES_NEW ||
           definition.getPropagationBehavior() == TransactionDefinition.PROPAGATION_NESTED) {
    // just suspend active synchronizations, if any
    // 返回值保存了之前的状态
    SuspendedResourcesHolder suspendedResources = suspend(null);
    if (debugEnabled) {
      logger.debug("Creating new transaction with name [" + definition.getName() + "]: " + definition);
    }
    try {
      boolean newSynchronization = (getTransactionSynchronization() != SYNCHRONIZATION_NEVER);
      // 构建TransactionStatus，后续的事务操作都是以此为依据
      // 这个类中包含各种必要的信息
      DefaultTransactionStatus status = newTransactionStatus(
        definition, transaction, true, newSynchronization, debugEnabled, suspendedResources);
      // template method，子类负责实现
      // 这里就无需考虑propagation behavior，上面已经处理了
      doBegin(transaction, definition);
      // 初始化ThreadLocal中的事务信息
      prepareSynchronization(status, definition);
      return status;
    }
    catch (RuntimeException ex) {
      // 发生异常，恢复之前挂起的事务
      resume(null, suspendedResources);
      throw ex;
    }
    catch (Error err) {
      // 发生异常，恢复之前挂起的事务
      resume(null, suspendedResources);
      throw err;
    }
  }
  else {
    // Create "empty" transaction: no actual transaction, but potentially synchronization.
    if (definition.getIsolationLevel() != TransactionDefinition.ISOLATION_DEFAULT && logger.isWarnEnabled()) {
      logger.warn("Custom isolation level specified but no actual transaction initiated; " +
                  "isolation level will effectively be ignored: " + definition);
    }
    boolean newSynchronization = (getTransactionSynchronization() == SYNCHRONIZATION_ALWAYS);
    return prepareTransactionStatus(definition, null, true, newSynchronization, debugEnabled, null);
  }
}
```

#### Commit事务过程

```java
// org.springframework.transaction.support.AbstractPlatformTransactionManager#commit
/**
	 * This implementation of commit handles participating in existing
	 * transactions and programmatic rollback requests.
	 * Delegates to {@code isRollbackOnly}, {@code doCommit}
	 * and {@code rollback}.
	 * @see org.springframework.transaction.TransactionStatus#isRollbackOnly()
	 * @see #doCommit
	 * @see #rollback
	 */
@Override
public final void commit(TransactionStatus status) throws TransactionException {
  if (status.isCompleted()) {
    throw new IllegalTransactionStateException(
      "Transaction is already completed - do not call commit or rollback more than once per transaction");
  }

  DefaultTransactionStatus defStatus = (DefaultTransactionStatus) status;	
  if (defStatus.isLocalRollbackOnly()) {
    if (defStatus.isDebug()) {
      logger.debug("Transactional code has requested rollback");
    }
    processRollback(defStatus);
    return;
  }
  if (!shouldCommitOnGlobalRollbackOnly() && defStatus.isGlobalRollbackOnly()) {
    if (defStatus.isDebug()) {
      logger.debug("Global transaction is marked as rollback-only but transactional code requested commit");
    }
    processRollback(defStatus);
    // Throw UnexpectedRollbackException only at outermost transaction boundary
    // or if explicitly asked to.
    if (status.isNewTransaction() || isFailEarlyOnGlobalRollbackOnly()) {
      throw new UnexpectedRollbackException(
        "Transaction rolled back because it has been marked as rollback-only");
    }
    return;
  }

  processCommit(defStatus);
}




// org.springframework.transaction.support.AbstractPlatformTransactionManager#processCommit
/**
	 * Process an actual commit.
	 * Rollback-only flags have already been checked and applied.
	 * @param status object representing the transaction
	 * @throws TransactionException in case of commit failure
	 */
private void processCommit(DefaultTransactionStatus status) throws TransactionException {
  try {
    boolean beforeCompletionInvoked = false;
    try {
      prepareForCommit(status);
      // 下面的几个方法会通知之前注册的TransactionSynchronization，告知事务的状态
      triggerBeforeCommit(status);
      triggerBeforeCompletion(status);
      beforeCompletionInvoked = true;
      boolean globalRollbackOnly = false;
      if (status.isNewTransaction() || isFailEarlyOnGlobalRollbackOnly()) {
        globalRollbackOnly = status.isGlobalRollbackOnly();
      }
      if (status.hasSavepoint()) {
        if (status.isDebug()) {
          logger.debug("Releasing transaction savepoint");
        }
        status.releaseHeldSavepoint();
      }
      else if (status.isNewTransaction()) {
        if (status.isDebug()) {
          logger.debug("Initiating transaction commit");
        }
        // template method
        // 子类负责实现
        doCommit(status);
      }
      // Throw UnexpectedRollbackException if we have a global rollback-only
      // marker but still didn't get a corresponding exception from commit.
      if (globalRollbackOnly) {
        throw new UnexpectedRollbackException(
          "Transaction silently rolled back because it has been marked as rollback-only");
      }
    }
    catch (UnexpectedRollbackException ex) {
      // can only be caused by doCommit
      // 通知回调函数
      triggerAfterCompletion(status, TransactionSynchronization.STATUS_ROLLED_BACK);
      throw ex;
    }
    catch (TransactionException ex) {
      // can only be caused by doCommit
      if (isRollbackOnCommitFailure()) {
        doRollbackOnCommitException(status, ex);
      }
      else {
        // 通知回调函数
        triggerAfterCompletion(status, TransactionSynchronization.STATUS_UNKNOWN);
      }
      throw ex;
    }
    catch (RuntimeException ex) {
      if (!beforeCompletionInvoked) {
        // 通知回调函数
        triggerBeforeCompletion(status);
      }
      doRollbackOnCommitException(status, ex);
      throw ex;
    }
    catch (Error err) {
      if (!beforeCompletionInvoked) {
        triggerBeforeCompletion(status);
      }
      doRollbackOnCommitException(status, err);
      throw err;
    }

    // Trigger afterCommit callbacks, with an exception thrown there
    // propagated to callers but the transaction still considered as committed.
    try {
      triggerAfterCommit(status);
    }
    finally {
      triggerAfterCompletion(status, TransactionSynchronization.STATUS_COMMITTED);
    }

  }
  finally {
    // 清空TransactionSynchronizationManager中保存的状态
    // 触发事务回调对应的接口
    // 恢复挂起的事务
    cleanupAfterCompletion(status);
  }
}

```

#### Rollback过程

```java
// org.springframework.transaction.support.AbstractPlatformTransactionManager#rollback
/**
	 * This implementation of rollback handles participating in existing
	 * transactions. Delegates to {@code doRollback} and
	 * {@code doSetRollbackOnly}.
	 * @see #doRollback
	 * @see #doSetRollbackOnly
	 */
@Override
public final void rollback(TransactionStatus status) throws TransactionException {
  if (status.isCompleted()) {
    throw new IllegalTransactionStateException(
      "Transaction is already completed - do not call commit or rollback more than once per transaction");
  }

  DefaultTransactionStatus defStatus = (DefaultTransactionStatus) status;
  processRollback(defStatus);
}


/**
	 * Process an actual rollback.
	 * The completed flag has already been checked.
	 * @param status object representing the transaction
	 * @throws TransactionException in case of rollback failure
	 */
private void processRollback(DefaultTransactionStatus status) {
  try {
    try {
      triggerBeforeCompletion(status);
      if (status.hasSavepoint()) {
        if (status.isDebug()) {
          logger.debug("Rolling back transaction to savepoint");
        }
        status.rollbackToHeldSavepoint();
      }
      else if (status.isNewTransaction()) {
        if (status.isDebug()) {
          logger.debug("Initiating transaction rollback");
        }
        // template method
        // 子类实现
        doRollback(status);
      }
      else if (status.hasTransaction()) {
        if (status.isLocalRollbackOnly() || isGlobalRollbackOnParticipationFailure()) {
          if (status.isDebug()) {
            logger.debug("Participating transaction failed - marking existing transaction as rollback-only");
          }
          doSetRollbackOnly(status);
        }
        else {
          if (status.isDebug()) {
            logger.debug("Participating transaction failed - letting transaction originator decide on rollback");
          }
        }
      }
      else {
        logger.debug("Should roll back transaction but cannot - no transaction available");
      }
    }
    catch (RuntimeException ex) {
      // 触发事务回调
      triggerAfterCompletion(status, TransactionSynchronization.STATUS_UNKNOWN);
      throw ex;
    }
    catch (Error err) {
      // 触发事务回调
      triggerAfterCompletion(status, TransactionSynchronization.STATUS_UNKNOWN);
      throw err;
    }
    // 触发事务回调
    triggerAfterCompletion(status, TransactionSynchronization.STATUS_ROLLED_BACK);
  }
  finally {
    // 清空TransactionSynchronizationManager中保存的状态
    // 触发事务回调对应的接口
    // 恢复挂起的事务
    cleanupAfterCompletion(status);
  }
}
```

#### DataSourceTransactionManager

这个类是`AbstractPlatformTransactionManager`的实现，使用`javax.sql.DataSource`获取连接的都可以是用这个类来管理事务。

几个关键template method的实现：

开始事务：

```java
//org.springframework.jdbc.datasource.DataSourceTransactionManager#doGetTransaction
@Override
protected Object doGetTransaction() {
  DataSourceTransactionObject txObject = new DataSourceTransactionObject();
  txObject.setSavepointAllowed(isNestedTransactionAllowed());
  // 从ThreadLocal中获取
  ConnectionHolder conHolder =
    (ConnectionHolder) TransactionSynchronizationManager.getResource(this.dataSource);
  txObject.setConnectionHolder(conHolder, false);
  return txObject;
}

/**
	 * This implementation sets the isolation level but ignores the timeout.
	 */
@Override
protected void doBegin(Object transaction, TransactionDefinition definition) {
  DataSourceTransactionObject txObject = (DataSourceTransactionObject) transaction;
  Connection con = null;

  try {
    // 开启事务同步，但是没有ConnectionHolder，进行初始化
    if (txObject.getConnectionHolder() == null ||
        txObject.getConnectionHolder().isSynchronizedWithTransaction()) {
      // 这里从数据源拿连接
      Connection newCon = this.dataSource.getConnection();
      if (logger.isDebugEnabled()) {
        logger.debug("Acquired Connection [" + newCon + "] for JDBC transaction");
      }
      txObject.setConnectionHolder(new ConnectionHolder(newCon), true);
    }
		
    // 标记事务同步
    txObject.getConnectionHolder().setSynchronizedWithTransaction(true);
    con = txObject.getConnectionHolder().getConnection();
		// 暂存之前的隔离级别
    Integer previousIsolationLevel = DataSourceUtils.prepareConnectionForTransaction(con, definition);
    txObject.setPreviousIsolationLevel(previousIsolationLevel);

    // Switch to manual commit if necessary. This is very expensive in some JDBC drivers,
    // so we don't want to do it unnecessarily (for example if we've explicitly
    // configured the connection pool to set it already).
    // 连接置为手动commit
    if (con.getAutoCommit()) {
      txObject.setMustRestoreAutoCommit(true);
      if (logger.isDebugEnabled()) {
        logger.debug("Switching JDBC Connection [" + con + "] to manual commit");
      }
      con.setAutoCommit(false);
    }
    // 标记事务开始
    txObject.getConnectionHolder().setTransactionActive(true);

    // 事务超时时间
    int timeout = determineTimeout(definition);
    if (timeout != TransactionDefinition.TIMEOUT_DEFAULT) {
      txObject.getConnectionHolder().setTimeoutInSeconds(timeout);
    }

    // Bind the session holder to the thread.
    // 新创建的连接，需要交给spring管理(ThreadLocal)
    // DataSource --> ConnectionHolder
    if (txObject.isNewConnectionHolder()) {
      TransactionSynchronizationManager.bindResource(getDataSource(), txObject.getConnectionHolder());
    }
  }

  catch (Throwable ex) {
    // 异常时释放连接
    if (txObject.isNewConnectionHolder()) {
      DataSourceUtils.releaseConnection(con, this.dataSource);
      txObject.setConnectionHolder(null, false);
    }
    throw new CannotCreateTransactionException("Could not open JDBC Connection for transaction", ex);
  }
}
```

提交事务：

```java
// org.springframework.jdbc.datasource.DataSourceTransactionManager#doCommit
@Override
protected void doCommit(DefaultTransactionStatus status) {
  DataSourceTransactionObject txObject = (DataSourceTransactionObject) status.getTransaction();
  Connection con = txObject.getConnectionHolder().getConnection();
  if (status.isDebug()) {
    logger.debug("Committing JDBC transaction on Connection [" + con + "]");
  }
  try {
    con.commit();
  }
  catch (SQLException ex) {
    throw new TransactionSystemException("Could not commit JDBC transaction", ex);
  }
}
```

回滚事务：

```java
@Override
protected void doRollback(DefaultTransactionStatus status) {
  DataSourceTransactionObject txObject = (DataSourceTransactionObject) status.getTransaction();
  Connection con = txObject.getConnectionHolder().getConnection();
  if (status.isDebug()) {
    logger.debug("Rolling back JDBC transaction on Connection [" + con + "]");
  }
  try {
    con.rollback();
  }
  catch (SQLException ex) {
    throw new TransactionSystemException("Could not roll back JDBC transaction", ex);
  }
}
```

清理工作：

```java
// org.springframework.jdbc.datasource.DataSourceTransactionManager#doCleanupAfterCompletion
@Override
protected void doCleanupAfterCompletion(Object transaction) {
  DataSourceTransactionObject txObject = (DataSourceTransactionObject) transaction;

  // Remove the connection holder from the thread, if exposed.
  // 清理ThreadLocal里绑定的连接
  if (txObject.isNewConnectionHolder()) {
    TransactionSynchronizationManager.unbindResource(this.dataSource);
  }

  // Reset connection.
  // 把conn 恢复原样
  Connection con = txObject.getConnectionHolder().getConnection();
  try {
    if (txObject.isMustRestoreAutoCommit()) {
      con.setAutoCommit(true);
    }
    DataSourceUtils.resetConnectionAfterTransaction(con, txObject.getPreviousIsolationLevel());
  }
  catch (Throwable ex) {
    logger.debug("Could not reset JDBC Connection after transaction", ex);
  }

  if (txObject.isNewConnectionHolder()) {
    if (logger.isDebugEnabled()) {
      logger.debug("Releasing JDBC Connection [" + con + "] after transaction");
    }
    // 减少Conn计数
    DataSourceUtils.releaseConnection(con, this.dataSource);
  }
	
  // 清空holder
  txObject.getConnectionHolder().clear();
}

```



### TransactionalEventListener

```java
/**
 * @author 代故
 * @date 2021/3/22 2:45 PM
 */
@Service
@Slf4j
public class TransactionalEventListenerTest {

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void listen(ApplicationEvent event) {
        log.info("recieved after commit event {}", event);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_ROLLBACK)
    public void listenRollback(ApplicationEvent event) {
        log.info("recieved after rollback event {}", event);
    }
}


/**
 * @author 代故
 * @date 2021/3/22 2:58 PM
 */
public class MyTransactionEvent extends ApplicationEvent {
    /**
     * Create a new ApplicationEvent.
     *
     * @param source the object on which the event initially occurred (never {@code null})
     */
    public MyTransactionEvent(Object source) {
        super(source);
    }
}


@Transactional(transactionManager = "proxyDataSourceTransactionManager", readOnly = true)
public void query() {
  final MindEntity mindEntity = minderDao.selectOne(1);
  log.info("mindEntity = {}", mindEntity);
  final List<WordEntity> wordEntities = wordDao.selectAll(new RowBounds(0, 20));
  log.info("wordEntities = {}", wordEntities);
  transactionService.query0();
  applicationContext.publishEvent(new MyTransactionEvent(transactionService));
}

```

可以监听事务的不同阶段的信息

### TransactionSynchronizationManager

是主要的ThreadLocal管理类，用来做事务的同步。Mybatis的SqlSession，Jdbc的Connection都会通过这个类来和ThreadLocal交互。

主要属性：

```java
public abstract class TransactionSynchronizationManager {

	private static final Log logger = LogFactory.getLog(TransactionSynchronizationManager.class);
	
  // 资源管理
  // datasource -> connection
  // sqlsessionFactory -> sqlSession
	private static final ThreadLocal<Map<Object, Object>> resources =
			new NamedThreadLocal<Map<Object, Object>>("Transactional resources");

  // 事务回调，当前事务状态发生变化时会收到通知，可以做一些清理的工作
	private static final ThreadLocal<Set<TransactionSynchronization>> synchronizations =
			new NamedThreadLocal<Set<TransactionSynchronization>>("Transaction synchronizations");

 	// 当前事务的名称
	private static final ThreadLocal<String> currentTransactionName =
			new NamedThreadLocal<String>("Current transaction name");
	
  // read-only 状态
	private static final ThreadLocal<Boolean> currentTransactionReadOnly =
			new NamedThreadLocal<Boolean>("Current transaction read-only status");

  // 隔离级别
	private static final ThreadLocal<Integer> currentTransactionIsolationLevel =
			new NamedThreadLocal<Integer>("Current transaction isolation level");
	
  // 事务是否active
	private static final ThreadLocal<Boolean> actualTransactionActive =
			new NamedThreadLocal<Boolean>("Actual transaction active");
  
}
```

资源的管理的主要接口：

```java
// org.springframework.transaction.support.TransactionSynchronizationManager#bindResource
/**
	 * Bind the given resource for the given key to the current thread.
	 * @param key the key to bind the value to (usually the resource factory)
	 * @param value the value to bind (usually the active resource object)
	 * @throws IllegalStateException if there is already a value bound to the thread
	 * @see ResourceTransactionManager#getResourceFactory()
	 */
public static void bindResource(Object key, Object value) throws IllegalStateException {
  Object actualKey = TransactionSynchronizationUtils.unwrapResourceIfNecessary(key);
  Assert.notNull(value, "Value must not be null");
  Map<Object, Object> map = resources.get();
  // set ThreadLocal Map if none found
  if (map == null) {
    map = new HashMap<Object, Object>();
    resources.set(map);
  }
  Object oldValue = map.put(actualKey, value);
  // Transparently suppress a ResourceHolder that was marked as void...
  if (oldValue instanceof ResourceHolder && ((ResourceHolder) oldValue).isVoid()) {
    oldValue = null;
  }
  // 事务挂起的时候要清理绑定的资源，不然开启新事务时，同一个dataSource会抛异常
  if (oldValue != null) {
    throw new IllegalStateException("Already value [" + oldValue + "] for key [" +
                                    actualKey + "] bound to thread [" + Thread.currentThread().getName() + "]");
  }
  if (logger.isTraceEnabled()) {
    logger.trace("Bound value [" + value + "] for key [" + actualKey + "] to thread [" +
                 Thread.currentThread().getName() + "]");
  }
}


/**
	 * Unbind a resource for the given key from the current thread.
	 * @param key the key to unbind (usually the resource factory)
	 * @return the previously bound value (usually the active resource object)
	 * @throws IllegalStateException if there is no value bound to the thread
	 * @see ResourceTransactionManager#getResourceFactory()
	 */
public static Object unbindResource(Object key) throws IllegalStateException {
  Object actualKey = TransactionSynchronizationUtils.unwrapResourceIfNecessary(key);
  Object value = doUnbindResource(actualKey);
  if (value == null) {
    throw new IllegalStateException(
      "No value for key [" + actualKey + "] bound to thread [" + Thread.currentThread().getName() + "]");
  }
  return value;
}
```



### ResourceHolderSupport

![ResourceHolderSupport](/ResourceHolderSupport.png)

这个提供了引用计数的功能：

```java
/**
	 * Increase the reference count by one because the holder has been requested
	 * (i.e. someone requested the resource held by it).
	 */
public void requested() {
  this.referenceCount++;
}

/**
	 * Decrease the reference count by one because the holder has been released
	 * (i.e. someone released the resource held by it).
	 */
public void released() {
  this.referenceCount--;
}

/**
	 * Return whether there are still open references to this holder.
	 */
public boolean isOpen() {
  return (this.referenceCount > 0);
}
```

Spring在处理这些带状态的类`SqlSession`、`Connection`都做了`ThreadLocal`的绑定。

在事务的场景下，需要复用同一个连接，spring存到ThreadLocal里的就是`ResourceHolderSupport`的子类，每次请求计数就加一

```java
// org.springframework.jdbc.datasource.DataSourceUtils#doGetConnection
if (TransactionSynchronizationManager.isSynchronizationActive()) {
  logger.debug("Registering transaction synchronization for JDBC Connection");
  // Use same Connection for further JDBC actions within the transaction.
  // Thread-bound object will get removed by synchronization at transaction completion.
  ConnectionHolder holderToUse = conHolder;
  if (holderToUse == null) {
    holderToUse = new ConnectionHolder(con);
  }
  else {
    holderToUse.setConnection(con);
  }
  // 计数加一
  holderToUse.requested();
  TransactionSynchronizationManager.registerSynchronization(
    new ConnectionSynchronization(holderToUse, dataSource));
  holderToUse.setSynchronizedWithTransaction(true);
  if (holderToUse != conHolder) {
    TransactionSynchronizationManager.bindResource(dataSource, holderToUse);
  }
}
```

当计数减到0的时候，可以认为这个连接已经没有人用，可以回收。有点类似java中的垃圾回收算法。