title: jackson_custom
tags:
category:
toc: true

---


定义解析

多态支持

空字段

各种配置

Map的Key Deserializer 构造函数

@JsonDeserialize(keyUsing = ShortDateKeyDeserializer.class)

com.fasterxml.jackson.databind.JsonMappingException: Can not find a (Map) Key deserializer for type [simple type, class com.qunar.hotel.price.root.beans.time.ShortDate]