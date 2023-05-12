---
title: CloudFlare的SSL证书不信任问题
tags:
  - 折腾
  - CloudFlare
categories:
  - 折腾
cover: https://img.ansore.de/2022/04/27/6269445e09cbc.jpg
abbrlink: f2bb7cec
date: 2022-05-04 23:43:48
---

我的域名由CloudFlare托管，主要看重它的解析特别快，几分钟就生效。我用的是CloudFlare签发的15年证书，一直套着CDN用，由于众所周知的原因，有时候突然会访问不了我的服务。有一天把CDN关了之后访问我的服务，浏览器就报证书不可信，查询之后才知道非CA机构颁发的证书是不被信任的，跟自己签发的没区别，除非套上CloudFlare的CDN。emm...

免费的如Let's Encrypt，需要三个月更新一次证书，虽然可以写个脚本定时更新，但是据说规则也变化，也不想折腾了。另外一方面，套上CDN以后可以隐藏真实IP，减少不必要的麻烦。

基于这些考虑，我决定还是忍受一下时不时访问不了的问题，套上CDN，继续用15年的证书。

