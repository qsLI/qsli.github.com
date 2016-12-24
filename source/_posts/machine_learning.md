title: 机器学习框架调研
date: 2015-11-03 23:55:34
tags: 机器学习  
category: 机器学习
---

# 机器学习框架调研
## DMTK
 <img src="http://www.dmtk.io/img/pic1_V7.jpg" width = "150" height = "150" alt="图片名称" align=center />

项目地址：[https://github.com/Microsoft/DMTK](https://github.com/Microsoft/DMTK)
文档地址:[http://www.dmtk.io/document.html](http://www.dmtk.io/document.html)
语言: CPP
项目简介:
 Microsoft Distributed Machine Learning Tookit

- DMTK分布式机器学习框架：
>它由参数服务器和客户端软件开发包（SDK）两部分构成。参数服务器在原有基础上从性能和功能上都得到了进一步提升——支持存储混合数据结构模型、接受并聚合工作节点服务器的数据模型更新、控制模型同步逻辑等。客户端软件开发包（SDK）支持维护节点模型缓存（与全局模型服务器同步）、节点模型训练和模型通讯的流水线控制、以及片状调度大模型训练等。

-  LightLDA：
> LightLDA是一种全新的用于训练主题模型，计算复杂度与主题数目无关的高效算法。在其分布式实现中，我们做了大量的系统优化使得LightLDA能够在一个普通计算机集群上处理超大规模的数据和模型。例如，在一个由8台计算机组成的集群上，我们可以在具有2千亿训练样本（token）的数据集上训练具有1百万词汇表和1百万个话题（topic）的LDA模型（约1万亿个参数），这种规模的实验以往要在数千台计算机的集群上才能运行。

- 分布式词向量：
> 词向量技术近来被普遍地应用于计算词汇的语义表示，它可以用作很多自然语言处理任务的词特征。我们为两种计算词向量的算法提供了高效的分步式实现：
> 		1. 一种是标准的word2vec算法
> 		2. 另一种是可以对多义词计算多个词向量的新算法。

<img src="http://www.msra.cn/zh-cn/research/release/images/dmtk-2.png" width = "500" height = "200" alt="图片名称" align=center />

### Reference

> [1] Tian, F., Dai, H., Bian, J., Gao, B., Zhang, R., Chen, E., & Liu, T. Y. (2014). [A probabilistic model for learning multi-prototype word embeddings](http://www.aclweb.org/anthology/C14-1016). In Proceedings of COLING (pp. 151-160).

## TensorFlow

![](http://tensorflow.org/images/tensors_flowing.gif)
文档地址: [http://tensorflow.org/get_started/index.html](http://tensorflow.org/get_started/index.html)
项目地址： [http://tensorflow.org/](http://tensorflow.org/)
语言: Python
简介：
>   1. TensorFlow是谷歌研发的第二代人工智能学习系统，而第一代的DistBelief比这个要早好多年。
>   
>   2. TensorFlow支持CNN、RNN和LSTM算法，这都是目前在Image，Speech和NLP最流行的深度神经网络模型。
>   
>   3. 此外，TensorFlow一大亮点是支持异构设备分布式计算，它能够在各个平台上自动运行模型，从电话、单个CPU / GPU到成百上千GPU卡组成的分布式系统。也就是说，任何基于梯度的机器学习算法都能够受益于TensorFlow的自动分化（auto-differentiation）。

### 参考链接
[http://news.zol.com.cn/551/5513527.html](http://news.zol.com.cn/551/5513527.html)
[http://www.leiphone.com/news/201511/Voza1pFNQB4bzKdR.html](http://www.leiphone.com/news/201511/Voza1pFNQB4bzKdR.html)

## Torch
![](http://torch.ch/static/flow-hero-logo.png)
项目地址: [https://github.com/torch/torch7](https://github.com/torch/torch7)
项目博客: [http://torch.ch/blog/](http://torch.ch/blog/)
Slides: [https://github.com/soumith/cvpr2015/blob/master/cvpr-torch.pdf](https://github.com/soumith/cvpr2015/blob/master/cvpr-torch.pdf)
语言: Lua
项目简介:
> Torch并没有跟随Python的潮流，它是基于Lua的。对于解释器没有必要像Matlab或者Python那样，Lua会给你神奇的控制台。Torch被Facebook人工智能研究实验室和位于伦敦的谷歌DeepMind大量使用。

> Torch is a scientific computing framework with wide support for machine learning algorithms. It is > > easy to use and efficient, thanks to an easy and fast scripting language, LuaJIT, and an underlying > C/CUDA implementation.

> A summary of core features:
>
>    - a powerful N-dimensional array
>    - lots of routines for indexing, slicing, transposing, ...
>    - amazing interface to C, via LuaJIT
>    - linear algebra routines
>    - neural network, and energy-based models
>    - numeric optimization routines
>    - Fast and efficient GPU support
>    - Embeddable, with ports to iOS, Android and FPGA backends

### 参考链接
[2015深度学习回顾：ConvNet、Caffe、Torch及其他](http://www.chinacloud.cn/show.aspx?id=21212&cid=17)


## GraphLab

项目简介： [http://www.select.cs.cmu.edu/code/graphlab/](http://www.select.cs.cmu.edu/code/graphlab/)
语言: Java/Python
简介:
> GraphLab是一个流行的图谱分析（Graph Analysis）和机器学习的开源项目，2013年该项目剥离出一个独立运作的商业公司GraphLab Inc
> - HDFS。GraphLab 内置对HDFS 的支持，GraphLab 能够直接从HDFS中读数据或者将计算结果数据直接写入到HDFS 中。

![http://www.ctocio.com/wp-content/uploads/2014/10/graphlab-deeplearning-_thumb.png](http://www.ctocio.com/wp-content/uploads/2014/10/graphlab-deeplearning-_thumb.png)

### 参考链接
[GraphLab Create使深度学习更easy](http://planckscale.info/?p=226)
[GraphLab:新的面向机器学习的并行框架](https://blog.inf.ed.ac.uk/graphprocs/2014/11/25/graphlab%E6%96%B0%E7%9A%84%E9%9D%A2%E5%90%91%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%E7%9A%84%E5%B9%B6%E8%A1%8C%E6%A1%86%E6%9E%B6/)

## Deeplearning4j
项目文档: [http://deeplearning4j.org/](http://deeplearning4j.org/)
项目地址: [https://github.com/deeplearning4j/deeplearning4j](https://github.com/deeplearning4j/deeplearning4j)
语言: Java/Scala
项目简介:
> Deeplearning4j is the first commercial-grade, open-source, distributed deep-learning library written for Java and Scala. Integrated with Hadoop and Spark, DL4J is designed to be used in business environments, rather than as a research tool.
>    - Versatile n-dimensional array class
>    - GPU integration
>    - Scalable on Hadoop, Spark and Akka + AWS et al

![](http://deeplearning4j.org/img/schematic_overview.png)

### 参考链接
[DL4J vs. Torch vs. Theano vs. Caffe](http://deeplearning4j.org/compare-dl4j-torch7-pylearn.html)



## Caffe
项目主页: [http://caffe.berkeleyvision.org/](http://caffe.berkeleyvision.org/)
项目地址: [https://github.com/BVLC/caffe](https://github.com/BVLC/caffe)
Slides: [https://docs.google.com/presentation/d/1UeKXVgRvvxg9OUdh_UiC5G71UMscNPlvArsWER41PsU/edit#slide=id.gc2fcdcce7_216_211](https://docs.google.com/presentation/d/1UeKXVgRvvxg9OUdh_UiC5G71UMscNPlvArsWER41PsU/edit#slide=id.gc2fcdcce7_216_211)
项目简介:
>The Caffe framework from UC Berkeley is designed to let researchers create and explore CNNs and other Deep Neural Networks (DNNs) easily, while delivering high speed needed for both experiments and industrial deployment [5]. Caffe provides state-of-the-art modeling for advancing and deploying deep learning in research and industry with support for a wide variety of architectures and efficient implementations of prediction and learning.


![](http://d.hiphotos.baidu.com/baike/c0%3Dbaike92%2C5%2C5%2C92%2C30/sign=520e49ddb51bb0519b29bb7a5713b1d1/5882b2b7d0a20cf4cad4bb2070094b36adaf998d.jpg)
![](http://img.ptcms.csdn.net/article/201507/08/559cebc9330f2_middle.jpg)
### 参考链接
[Caffe: Convolutional Architecture for Fast Feature Embedding](http://ucb-icsi-vision-group.github.io/caffe-paper/caffe.pdf)

[KDnuggets热门深度学习工具排行：Pylearn2 居首，Caffe第三](http://www.csdn.net/article/1970-01-01/2825166)


## Theano
项目主页: [http://deeplearning.net/software/theano/](http://deeplearning.net/software/theano/)
项目地址: [https://github.com/Theano/Theano](https://github.com/Theano/Theano)

## Pylearn2
 文档地址: [http://deeplearning.net/software/pylearn2/](http://deeplearning.net/software/pylearn2/)
 项目地址: [https://github.com/lisa-lab/pylearn2](https://github.com/lisa-lab/pylearn2)
项目简介:

>Pylearn2和Theano由同一个开发团队开发，Pylearn2是一个机器学习库，它把深度学习和人工智能研究许多常用的模型以及训练算法封装成一个单一的实验包，如随机梯度下降。
