---
order: 8
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# 计算机网络与代理

本文讲终端联网这条链路上的各个环节、代理插在哪一环、以及每一环失败时的表现：请求的四个阶段、域名解析、TLS、HTTP 代理与 SOCKS 代理、代理相关的环境变量、Git 的代理配置层级。只涉及协议与配置机制。

## 一次请求的四个阶段

执行 `git clone https://github.com/nbtca/documents.git`，在拿到第一个字节前依次发生：

1. **域名解析**：把 `github.com` 变成 IP 地址；
2. **TCP 连接**：与该 IP 的 443 端口完成三次握手；
3. **TLS 握手**：在这条 TCP 连接上协商加密、验证证书；
4. **HTTP 请求**：在加密通道内发出请求。

四个阶段互相独立，任何一步都可能单独失败。排查时先确定卡在第几步。

IP 地址定位到机器，端口定位到机器上的哪个程序。HTTP 默认 80，HTTPS 默认 443，SSH 默认 22。端口被网络屏蔽时，症状是域名解析正常但 TCP 握手超时。

## 域名解析

程序调用系统的 stub resolver，由它去问递归解析器；递归解析器依次问根、顶级域和权威服务器，缓存结果后返回。本机 `hosts` 文件优先于这一流程。

域名解析与随后的 TCP 连接是两件独立的事：由谁解析、在哪台机器上解析，可以和由谁发起连接分开。SOCKS 那一节建立在这个区分上。

## TLS 与 SNI

TLS 握手跑在 TCP 之上。客户端在 ClientHello 中带 SNI 扩展说明目标域名——一个 IP 上可能挂着数百个站点，服务器需要据此选择证书。

SNI 是明文的，链路上的任何一跳即使无法解密内容也能读到目标域名。

## HTTP 代理

明文 HTTP 下代理能读懂请求，客户端把绝对 URL 写进请求行，由代理转发。

HTTPS 下代理没有密钥，读不了加密连接，于是用 CONNECT。RFC 9110 §9.3.6：

> The CONNECT method requests that the recipient establish a tunnel to the destination origin server identified by the request target and, if successful, thereafter restrict its behavior to blind forwarding of data, in both directions, until the tunnel is closed.

blind forwarding 指代理建好隧道后只转发字节，不解析也不修改内容。请求行只含主机与端口，且端口不可省略：

```http
CONNECT server.example.com:443 HTTP/1.1
Host: server.example.com
```

因此通过 HTTP 代理访问 HTTPS 时，代理知道目标主机与端口，读不到路径和内容。

## SOCKS 代理

SOCKS 不理解 HTTP，只代为建立 TCP 连接并转发字节流，因此能承载 SSH、数据库连接等任意基于 TCP 的协议，HTTP 代理不能。

RFC 1928 定义的 SOCKS5 交互分三步：客户端发送版本与支持的认证方法，服务端选定一种；若选中用户名口令，按 RFC 1929 认证；客户端发出请求，其中 `CMD` 说明操作类型，`ATYP` 说明地址类型，`DST.ADDR` 与 `DST.PORT` 是目标。

### socks5 与 socks5h

`ATYP` 的三个取值，RFC 1928 §5：

> `X'01'` the address is a version-4 IP address, with a length of 4 octets
>
> `X'03'` the address field contains a fully-qualified domain name. The first octet of the address field contains the number of octets of name that follow, there is no terminating NUL octet.
>
> `X'04'` the address is a version-6 IP address, with a length of 16 octets.

`X'03'` 是全部差别的来源：协议允许客户端把域名原样交给代理，由代理解析。同一个 SOCKS5 代理因此有两种用法：

- 客户端本地解析域名，把 IP 填进 `DST.ADDR`（`ATYP` = `X'01'`）；
- 客户端不解析，把域名填进 `DST.ADDR`（`ATYP` = `X'03'`），解析发生在代理端。

curl 用协议前缀区分：`socks5://` 是前者，`socks5h://` 是后者。curl 手册对 `--socks5-hostname` 的说明是“Use the specified SOCKS5 proxy (and let the proxy resolve the hostname)”，并指出该选项等价于给 `--proxy` 加 `socks5h://` 前缀。

本地域名解析异常时，`socks5://` 同样连不上，因为解析在本地发生；`socks5h://` 才绕开本地解析。`socks5h` 中的 `h` 是 curl 的写法，不是 RFC 术语。

## 代理相关的环境变量

这套环境变量没有写进任何 RFC，是各程序沿用的惯例，具体行为以各自文档为准。curl 手册：

> The environment variables can be specified in lower case or upper case. The lower case version has precedence. `http_proxy` is an exception as it is only available in lower case.

同时 `export ALL_PROXY=` 与 `export all_proxy=` 两行对 curl 是冗余的，小写本就优先；写两行只在需要照顾读取规则不同的其他程序时有意义。

curl 定义的变量：

| 变量          | 作用                                 |
| ------------- | ------------------------------------ |
| `http_proxy`  | HTTP 请求使用的代理，只认小写        |
| `HTTPS_PROXY` | HTTPS 请求使用的代理                 |
| `ALL_PROXY`   | 未设置协议专用变量时的兜底           |
| `NO_PROXY`    | 不走代理的主机列表，`*` 表示全部不走 |

`NO_PROXY` 的匹配规则同样由实现决定。curl 按域名包含关系匹配：`local.com` 匹配 `local.com`、`local.com:80` 和 `www.local.com`，不匹配 `www.notlocal.com`；7.86.0 起支持 CIDR 写法，`192.168.0.0/16` 匹配所有 `192.168.` 开头的地址。

### 浏览器能通而终端不通

浏览器跟随操作系统的代理设置，终端里的程序不读该设置，只读自身进程环境里的变量。而环境变量在创建子进程时继承，于是：

- `export` 只对此后从该窗口启动的程序生效；
- 已在运行的程序不受影响。

把变量写进 shell 启动文件可让每个新窗口都带上，代价是代理未运行时所有联网命令都会指向无人监听的端口而失败。改用两个 shell 函数按需开关，写法见[终端、shell 与 PATH](/tutorial/terminal-shell-and-path)。

## Git 的代理配置层级

Git 的 HTTP 传输底层用 curl，上述环境变量对它有效。`git config` 另有三层，从宽到窄：

| 配置项                | 范围                |
| --------------------- | ------------------- |
| `http.proxy`          | 所有 HTTP(S) 远程   |
| `http.<url>.proxy`    | 匹配特定 URL 的远程 |
| `remote.<name>.proxy` | 指定名字的那个远程  |

`git config` 手册对 `http.proxy` 的说明是“Override the HTTP proxy, normally configured using the `http_proxy`, `https_proxy`, and `all_proxy` environment variables”——它盖过环境变量。换代理后只改了环境变量、而早先写进全局配置的那一行仍在，是常见故障来源。

`http.<url>.*` 的匹配按 scheme、主机名、端口、路径逐段比较：主机名支持 `*` 通配一级子域，路径按斜杠分段做前缀匹配。

以上全部只对 HTTP(S) 远程生效。远程地址为 `git@github.com:...` 这种 SSH 形式时走另一套机制，代理需配在 SSH 的配置里，`http.proxy` 对它无效。用 `git remote -v` 确认远程形式。

Git 手册另有一条约束：

> Any proxy, however configured, must be completely transparent and must not modify, transform, or buffer the request or response in any way.

会改写内容的代理会使 Git 出现各种难以归因的故障。

## 分阶段排查

对应开头的四个阶段：

```bash
# 阶段 1：域名能否解析，解析到什么
dig +short github.com

# 阶段 2：TCP 能否连上 443
nc -vz github.com 443

# 阶段 3、4：完整走一遍，-v 打印 CONNECT、TLS 握手与证书
curl -v -I https://github.com

# 当前进程环境里的代理变量
env | grep -i proxy

# Git 的配置层，以及底层 curl 的过程
git config --global --get-regexp proxy
GIT_CURL_VERBOSE=1 git ls-remote https://github.com/nbtca/documents.git HEAD
```

`git ls-remote` 只读远程的引用列表，不改动本地，成功时返回对象名与引用名。

## 参考

- [RFC 1928 — SOCKS Protocol Version 5](https://www.rfc-editor.org/rfc/rfc1928.txt)
- [RFC 1929 — Username/Password Authentication for SOCKS V5](https://www.rfc-editor.org/rfc/rfc1929.txt)
- [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.txt)（CONNECT 见 §9.3.6）
- [RFC 6066 — TLS Extensions](https://www.rfc-editor.org/rfc/rfc6066.txt)（SNI 见 §3）
- [RFC 8446 — The Transport Layer Security (TLS) Protocol Version 1.3](https://www.rfc-editor.org/rfc/rfc8446.txt)
- [curl man page](https://curl.se/docs/manpage.html)
- [git config 文档](https://git-scm.com/docs/git-config)
