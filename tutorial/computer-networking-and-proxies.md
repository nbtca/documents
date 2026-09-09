---
order: 8
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# 计算机网络与代理

新人最常撞上的一句话是「浏览器能打开 GitHub，终端却连不上」。这不是玄学，而是两个程序走了两条不同的路。这篇讲清楚那条路上有哪些环节、代理插在哪一环、以及每一环出问题时长什么样。只谈协议与配置机制，不涉及任何具体软件。

## 一次请求要穿过什么

在终端敲下 `git clone https://github.com/nbtca/documents.git`，在拿到第一个字节之前，至少发生了四件事：

1. **域名解析**：把 `github.com` 变成一个 IP 地址；
2. **TCP 连接**：和那个 IP 的 443 端口完成三次握手；
3. **TLS 握手**：在这条 TCP 连接上协商加密，验证证书；
4. **HTTP 请求**：在加密通道里发出真正的请求。

这四件事互相独立，任何一步都可能单独失败。诊断的第一原则是先确定卡在第几步，而不是笼统地说「连不上」。

端口是这里唯一容易被忽略的概念：IP 地址定位到机器，端口定位到机器上的哪个程序。HTTP 默认 80，HTTPS 默认 443，SSH 默认 22。企业网络或校园网屏蔽某个端口时，症状是 TCP 握手阶段卡住，而域名解析完全正常。

## 名字是怎么变成地址的

程序自己不会做完整的域名解析。它调用系统的 stub resolver，由后者去问一台递归解析器；递归解析器再依次问根、顶级域和权威服务器，把结果缓存起来返回。本机的 `hosts` 文件优先于这一整套流程。

要记住的只有一点：**域名解析和后面的 TCP 连接是两件独立的事**。解析由谁做、在哪台机器上做，可以和实际连接由谁发起分开。下面 SOCKS 那一节全部建立在这个区分上。

## TLS 与它暴露的东西

TLS 握手跑在 TCP 之上。客户端在第一个 ClientHello 里带上 SNI 扩展，说明自己想访问哪个域名——服务器一个 IP 上可能挂着几百个站点，不说清楚就发不出正确的证书。

SNI 是明文的。也就是说，链路上的任何一跳即使无法解密内容，也知道你在访问哪个域名。这解释了为什么「加密了就什么都看不见」是错的。

## 代理的两种模型

### HTTP 代理

明文 HTTP 时代，代理能读懂请求，客户端把完整的绝对 URL 写进请求行，代理替它转发。

HTTPS 让这套失效了：代理无法读一条它没有密钥的加密连接。于是有了 CONNECT。RFC 9110 §9.3.6 的定义是：

> The CONNECT method requests that the recipient establish a tunnel to the destination origin server identified by the request target and, if successful, thereafter restrict its behavior to blind forwarding of data, in both directions, until the tunnel is closed.

关键词是 blind forwarding——代理建好隧道之后就闭眼转发字节，不理解也无法修改里面的内容。请求行的形式也很特别，只有主机和端口，且端口不能省略：

```http
CONNECT server.example.com:443 HTTP/1.1
Host: server.example.com
```

所以通过 HTTP 代理访问 HTTPS 时，代理知道你连的是哪台主机的哪个端口，但看不到路径和内容。

### SOCKS 代理

SOCKS 工作在更低的位置：它不理解 HTTP，只负责代为建立一条 TCP 连接然后转发字节流。因此它同样能承载 SSH、数据库连接等任何基于 TCP 的协议，而 HTTP 代理不能。

RFC 1928 定义的 SOCKS5 交互分三步：客户端发送版本与支持的认证方法，服务端选一种；如果选的是用户名口令，按 RFC 1929 完成认证；然后客户端发出请求，其中 `CMD` 说明要 CONNECT 还是 BIND，`ATYP` 说明后面的地址是什么类型，`DST.ADDR` 与 `DST.PORT` 是目标。

## socks5 与 socks5h 的差别

`ATYP` 有三个取值。RFC 1928 §5 原文：

> `X'01'` the address is a version-4 IP address, with a length of 4 octets
>
> `X'03'` the address field contains a fully-qualified domain name. The first octet of the address field contains the number of octets of name that follow, there is no terminating NUL octet.
>
> `X'04'` the address is a version-6 IP address, with a length of 16 octets.

`X'03'` 就是全部区别的来源：协议允许客户端把**域名原样**交给代理，由代理去解析。

于是同一个 SOCKS5 代理有两种用法：

- 客户端先在本地解析域名，把得到的 IP 填进 `DST.ADDR`（`ATYP` = `X'01'`）；
- 客户端不解析，直接把域名填进 `DST.ADDR`（`ATYP` = `X'03'`），解析在代理那一端发生。

curl 用两个不同的协议前缀区分它们：`socks5://` 是前者，`socks5h://` 是后者。curl 手册对 `--socks5-hostname` 的说明是「Use the specified SOCKS5 proxy (and let the proxy resolve the hostname)」，并指出该选项等价于给 `--proxy` 加上 `socks5h://` 前缀。

实际后果：如果本地的域名解析本身就是坏的，`socks5://` 一样连不上，因为解析发生在本地；`socks5h://` 才能绕开本地解析。诊断时如果 IP 直连能通、域名不通，问题在解析而不在代理。

注意 `socks5h` 里的 `h` 是 curl 的写法，不是 RFC 里的术语。其他程序表达同一件事的方式可能不同。

## 环境变量不是标准

`http_proxy` 这一套环境变量从来没有被写进任何 RFC，它是各个程序沿用下来的惯例。因此**每个程序的具体行为要查自己的文档**，不能互相推断。

以 curl 为例，它的手册明确规定：

> The environment variables can be specified in lower case or upper case. The lower case version has precedence. `http_proxy` is an exception as it is only available in lower case.

也就是说，网上大量教程里同时 `export ALL_PROXY=...` 和 `export all_proxy=...` 两行，对 curl 而言是冗余的——小写本来就优先。写两行只在你要照顾其他读取规则不同的程序时才有意义。

curl 定义的几个变量：

| 变量          | 作用                                 |
| ------------- | ------------------------------------ |
| `http_proxy`  | HTTP 请求使用的代理，只认小写        |
| `HTTPS_PROXY` | HTTPS 请求使用的代理                 |
| `ALL_PROXY`   | 没有设置协议专用变量时的兜底         |
| `NO_PROXY`    | 不走代理的主机列表，`*` 表示全部不走 |

`NO_PROXY` 的匹配规则同样由实现决定。curl 的规则是按域名包含关系匹配：`local.com` 能匹配 `local.com`、`local.com:80` 和 `www.local.com`，但匹配不到 `www.notlocal.com`；从 7.86.0 起也支持 CIDR 写法，`192.168.0.0/16` 匹配所有 `192.168.` 开头的地址。

### 这就是「浏览器能通、终端不通」的根因

浏览器通常跟随操作系统的代理设置。终端里的程序不看那个设置，它们只看**自己进程环境里的变量**。

而环境变量是在创建子进程时继承的。这带来两个后果：

- 在一个终端窗口里 `export` 之后，只有此后从这个窗口启动的程序才拿得到；
- 已经在运行的程序不会因为你改了环境变量而改变行为。

把变量写进 shell 的启动文件可以让每个新窗口都带上它，代价是代理没运行时所有联网命令都会指向一个没人监听的端口而失败。更稳妥的做法是定义两个 shell 函数来开关，需要时才打开——具体写法见[终端、shell 与 PATH](/tutorial/terminal-shell-and-path)。

## Git 的代理有好几层

Git 的 HTTP 传输底层用的就是 curl，所以上面那套环境变量对它有效。除此之外 `git config` 还有自己的几层，按从宽到窄排列：

| 配置项                | 范围                |
| --------------------- | ------------------- |
| `http.proxy`          | 所有 HTTP(S) 远程   |
| `http.<url>.proxy`    | 匹配特定 URL 的远程 |
| `remote.<name>.proxy` | 指定名字的那个远程  |

`git config` 手册对 `http.proxy` 的说明是「Override the HTTP proxy, normally configured using the `http_proxy`, `https_proxy`, and `all_proxy` environment variables」——也就是说它**盖过**环境变量。这是一个高频故障来源：换了代理之后环境变量改了，但很久以前写进全局配置的那一行还在，Git 依然去连那个已经不存在的端口。

排查用这条命令列出所有相关配置：

```bash
git config --global --get-regexp proxy
```

`http.<url>.*` 的匹配按 scheme、主机名、端口、路径逐段比较，主机名支持 `*` 通配一级子域，路径按斜杠分段做前缀匹配。

还有一个容易忽略的分叉：以上全部只对 HTTP(S) 远程生效。如果远程地址是 `git@github.com:...` 这种 SSH 形式，走的是完全不同的一套，代理要配在 SSH 自己的配置里，`http.proxy` 对它没有任何作用。用 `git remote -v` 先确认远程到底是哪种。

顺带一提，Git 手册还有一句话值得记住：

> Any proxy, however configured, must be completely transparent and must not modify, transform, or buffer the request or response in any way.

会改写内容的代理会让 Git 出现各种难以解释的故障。

## 按层排查

把开头那四步倒过来用，每一步都有对应的验证手段：

```bash
# 第 1 步：域名能否解析，解析结果是什么
dig +short github.com

# 第 2 步：TCP 能否连上 443
nc -vz github.com 443

# 第 3、4 步：完整过一遍，-v 会打印 CONNECT、TLS 握手和证书
curl -v -I https://github.com

# 确认当前进程环境里到底有什么
env | grep -i proxy

# Git 专用：列出配置层，以及让它打印底层 curl 的过程
git config --global --get-regexp proxy
GIT_CURL_VERBOSE=1 git ls-remote https://github.com/nbtca/documents.git HEAD
```

`git ls-remote` 是一条很好的探针：它只读远程的引用列表，不写任何东西到本地，成功时返回一串对象名和引用名。

## 参考

- [RFC 1928 — SOCKS Protocol Version 5](https://www.rfc-editor.org/rfc/rfc1928.txt)
- [RFC 1929 — Username/Password Authentication for SOCKS V5](https://www.rfc-editor.org/rfc/rfc1929.txt)
- [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.txt)（CONNECT 见 §9.3.6）
- [RFC 6066 — TLS Extensions](https://www.rfc-editor.org/rfc/rfc6066.txt)（SNI 见 §3）
- [RFC 8446 — The Transport Layer Security (TLS) Protocol Version 1.3](https://www.rfc-editor.org/rfc/rfc8446.txt)
- [curl man page](https://curl.se/docs/manpage.html)（环境变量、`--socks5-hostname`、`--noproxy`）
- [git config 文档](https://git-scm.com/docs/git-config)（`http.proxy`、`http.<url>.*`、`remote.<name>.proxy`）
