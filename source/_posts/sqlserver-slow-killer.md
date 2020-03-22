---
title: sqlserver杀掉慢查询
tags: sqlserver-killer
category: db
toc: true
typora-root-url: sqlserver杀掉慢查询
typora-copy-images-to: sqlserver杀掉慢查询
date: 2018-10-09 09:26:38
---





# SQL

查询慢查询的信息：

```sql
SELECT DISTINCT
    SUBSTRING(qt.TEXT, (er.statement_start_offset/2)+1, ((CASE er.statement_end_offset WHEN -1 THEN DATALENGTH(qt.TEXT) ELSE er.statement_end_offset END - er.statement_start_offset)/2)+1) AS query_sql,
    er.session_id AS pid,
    er.status AS status,
    er.command AS command,
    sp.hostname AS hostname,
    DB_NAME(sp.dbid) AS db_name,
    sp.program_name AS program_name,
    er.cpu_time AS cpu_time,
    er.total_elapsed_time AS cost_time
FROM sys.sysprocesses AS sp LEFT JOIN sys.dm_exec_requests AS er ON sp.spid = er.session_id
CROSS APPLY sys.dm_exec_sql_text(er.sql_handle) AS qt
WHERE 1 = CASE WHEN er.status IN ('RUNNABLE', 'SUSPENDED', 'RUNNING') THEN 1 WHEN er.status = 'SLEEPING' AND sp.open_tran  > 0 THEN 1 ELSE 0 END
AND er.command = 'SELECT'
ORDER BY er.total_elapsed_time DESC
```

查询的结果如下：

{% asset_img image-20181009091326051.png %}

结果中展示了session的`pid`以及正在执行的命令，消耗的cpu时间以及总的耗费时间，如果需要杀掉这个session，可以用下面的命令：

```sql
kill <pid>
```

# 参考

1. [KILL (Transact-SQL) | Microsoft Docs](https://docs.microsoft.com/en-us/sql/t-sql/language-elements/kill-transact-sql?view=sql-server-2017)
2. [Helpful functions when you need to find out what is going on on SQL Server](https://gist.github.com/alexsorokoletov/a079629f9e1435c7f81f)

