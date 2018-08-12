title: kmp算法理解
toc: true
tags: kmp
category: algorithm
---

*字符串本身并不是自己的后缀。*

- 前缀:

"Harry"

{"H", "Ha", "Har", "Harr"}


- 后缀:

"Harry"

{"arry", "rry", "ry", "y"}


- PMT: Partial Match Table

*PMT中的值是字符串的前缀集合与后缀集合的交集中最长元素的长度*

对于"abababca"的PMT求值过程:


| char       | a    | b    | a       | b            | a                  | b                         | c                                 | a                                          |
| ---------- | ---- | ---- | ------- | ------------ | ------------------ | ------------------------- | --------------------------------- | ------------------------------------------ |
| index      | 0    | 1    | 2       | 3            | 4                  | 5                         | 6                                 | 7                                          |
| 对应字符串 | a    | ab   | aba     | abab         | ababa              | ababab                    | abababc                           | abababca                                   |
| 前缀集合   | {}   | {a}  | {a, ab} | {a, ab, aba} | {a, ab, aba, abab} | {a, ab, aba, abab,ababa}  | {a, ab, aba, abab, ababa, ababab} | {a, ab, aba, abab, ababa, ababab, abababc} |
| 后缀集合   | {}   | {b}  | {ba, a} | {bab, ab, b} | {baba, aba, ba, a} | {babab, abab, bab, ab, b} | {bababc, ababc, babc, abc, bc, c} | {bababca, ababca,babca, abca, bca, ca, a}  |
| 最长字符串 | null | null | a       | ab           | aba                | abab                      | null                              | a                                          |
| value      | 0    | 0    | 1       | 2            | 3                  | 4                         | 0                                 | 1                                          |

next数组


一手资料

##　参考

－　[如何更好的理解和掌握 KMP 算法? - 知乎](https://www.zhihu.com/question/21923021/answer/281346746)