---
order: 8
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# 计算机网络与代理

::: info 这篇写给谁

如果你只是想改一页文档，**整篇都可以不看**——[在网页上编辑](/tutorial/manual/documents-git-workflow#路线-a-在网页上改)不经过本机网络，遇不到这里的任何问题。

需要在自己电脑上跑命令、而终端连不上 GitHub 的人，从[分阶段排查](#分阶段排查)倒着往回读；想弄明白代理到底做了什么的人，从头顺着读。

命令一律给出 macOS、Linux、Windows 三种写法。文中每处结论都链到对应的规范条款或官方手册，可以逐条核对。

:::

“浏览器能打开 GitHub，终端却连不上”是新人最常撞上的一堵墙，原因是两个程序走了两条不同的路。这篇讲清楚这条路上有哪些环节、代理插在哪一环、以及每一环失败时的表现。只涉及协议与配置机制。

## 一次请求的四个阶段

执行 `git clone https://github.com/nbtca/documents.git`，在拿到第一个字节前依次发生：

1. **域名解析**：把 `github.com` 变成 IP 地址；
2. **TCP 连接**：与该 IP 的 443 端口完成[三次握手](https://www.rfc-editor.org/rfc/rfc9293#section-3.5)；
3. **TLS 握手**：在这条 TCP 连接上协商加密、验证证书；
4. **HTTP 请求**：在加密通道内发出请求。

四个阶段互相独立，任何一步都可能单独失败。排查的第一件事是确定卡在第几步，而不是笼统地判断“连不上”。

IP 地址定位到机器，端口定位到机器上的哪个程序。默认端口由 [IANA 的端口号注册表](https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml)统一登记，HTTP 是 80，HTTPS 是 443，SSH 是 22。端口被网络屏蔽时，症状是域名解析正常但 TCP 握手超时。

## 阶段一：域名解析

程序自己不做完整解析，而是调用系统的 stub resolver，由它去问递归解析器；递归解析器依次问根、顶级域和权威服务器，缓存结果后返回。这套分工见 [RFC 1034 §5](https://www.rfc-editor.org/rfc/rfc1034#section-5)，其中 stub resolver、递归解析器、权威服务器这几个词的准确定义见 [RFC 8499 §6](https://www.rfc-editor.org/rfc/rfc8499#section-6)。本机 `hosts` 文件优先于这一流程。

查一个域名解析到什么：

::: code-group

```bash [macOS]
dig +short github.com
# dig 随系统自带
```

```bash [Linux]
dig +short github.com
# dig 通常不预装，按发行版安装：
#   Debian/Ubuntu  sudo apt install dnsutils
#   Fedora/RHEL    sudo dnf install bind-utils
#   Arch           sudo pacman -S bind
# 不想装的话，系统自带的 getent 也能看解析结果：
getent hosts github.com
```

```powershell [Windows]
Resolve-DnsName github.com
# 或者更简单的
nslookup github.com
```

:::

`dig` 的完整用法见 [ISC 的 BIND 9 手册](https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility)，`getent` 见[它的 man page](https://man7.org/linux/man-pages/man1/getent.1.html)，Windows 侧见 [`Resolve-DnsName`](https://learn.microsoft.com/en-us/powershell/module/dnsclient/resolve-dnsname)。

**域名解析与随后的 TCP 连接是两件独立的事**：由谁解析、在哪台机器上解析，可以和由谁发起连接分开。[SOCKS 代理](#socks-代理)那一节完全建立在这个区分上。

## 阶段二：TCP 连接

解析出 IP 之后，程序去连它的某个端口。测试这一步能否走通：

::: code-group

```bash [macOS]
nc -vz github.com 443
```

```bash [Linux]
nc -vz github.com 443
# nc 未预装时：apt install netcat-openbsd / dnf install nmap-ncat / pacman -S openbsd-netcat
# 想看本机已有哪些连接和监听端口，用 ss：
ss -tunlp
```

```powershell [Windows]
Test-NetConnection github.com -Port 443
# 关注输出里的 TcpTestSucceeded 是否为 True
```

:::

`ss` 的说明见[它的 man page](https://man7.org/linux/man-pages/man8/ss.8.html)，Windows 侧见 [`Test-NetConnection`](https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection)。

解析成功而这一步超时，通常意味着该端口在你所处的网络里被拦住了，或者需要经过代理才能出去。

## 阶段三：TLS 与 SNI

TLS 握手跑在 TCP 之上，当前版本是 [RFC 8446](https://www.rfc-editor.org/rfc/rfc8446) 定义的 TLS 1.3。客户端在 [ClientHello](https://www.rfc-editor.org/rfc/rfc8446#section-4.1.2) 中带 [SNI 扩展](https://www.rfc-editor.org/rfc/rfc6066#section-3)说明目标域名——一个 IP 上可能挂着数百个站点，服务器需要据此选择证书。

SNI 是明文的，链路上的任何一跳即使无法解密内容也能读到目标域名。

## 阶段四：HTTP

前三步都通了，才轮到真正的请求。明文 HTTP 下代理能读懂请求，客户端把绝对 URL 写进[请求行的 request-target](https://www.rfc-editor.org/rfc/rfc9112#section-3.2)，由代理转发。HTTPS 下代理没有密钥，读不了加密连接——于是有了下一节的 CONNECT。

## 代理的两种模型

### HTTP 代理与 CONNECT

[RFC 9110 §9.3.6](https://httpwg.org/specs/rfc9110.html#CONNECT)：

> The CONNECT method requests that the recipient establish a tunnel to the destination origin server identified by the request target and, if successful, thereafter restrict its behavior to blind forwarding of data, in both directions, until the tunnel is closed.

blind forwarding 指代理建好隧道后只转发字节，不解析也不修改内容。同一节规定请求行只含主机与端口，且端口不可省略：

```http
CONNECT server.example.com:443 HTTP/1.1
Host: server.example.com
```

因此通过 HTTP 代理访问 HTTPS 时，代理知道目标主机与端口，读不到路径和内容。

### SOCKS 代理

SOCKS 不理解 HTTP，只代为建立 TCP 连接并转发字节流，因此能承载 SSH、数据库连接等任意基于 TCP 的协议，HTTP 代理不能。

[RFC 1928](https://www.rfc-editor.org/rfc/rfc1928) 定义的 SOCKS5 交互分三步：客户端发送版本与支持的认证方法、服务端选定一种（[§3](https://www.rfc-editor.org/rfc/rfc1928#section-3)）；若选中用户名口令，按 [RFC 1929](https://www.rfc-editor.org/rfc/rfc1929) 认证；客户端发出请求（[§4](https://www.rfc-editor.org/rfc/rfc1928#section-4)），其中 `CMD` 说明操作类型，`ATYP` 说明地址类型，`DST.ADDR` 与 `DST.PORT` 是目标。

### socks5 与 socks5h

`ATYP` 的三个取值，[RFC 1928 §5](https://www.rfc-editor.org/rfc/rfc1928#section-5)：

> `X'01'` the address is a version-4 IP address, with a length of 4 octets
>
> `X'03'` the address field contains a fully-qualified domain name. The first octet of the address field contains the number of octets of name that follow, there is no terminating NUL octet.
>
> `X'04'` the address is a version-6 IP address, with a length of 16 octets.

`X'03'` 是全部差别的来源：协议允许客户端把域名原样交给代理，由代理解析。同一个 SOCKS5 代理因此有两种用法：

- 客户端本地解析域名，把 IP 填进 `DST.ADDR`（`ATYP` = `X'01'`）；
- 客户端不解析，把域名填进 `DST.ADDR`（`ATYP` = `X'03'`），解析发生在代理端。

curl 用协议前缀区分：[`--proxy`](https://curl.se/docs/manpage.html#--proxy) 接受 `socks5://` 表示前者、`socks5h://` 表示后者。[`--socks5-hostname`](https://curl.se/docs/manpage.html#--socks5-hostname) 的说明是“Use the specified SOCKS5 proxy (and let the proxy resolve the hostname)”，并指出该选项等价于给 `--proxy` 加 `socks5h://` 前缀。

本地域名解析异常时，`socks5://` 同样连不上，因为解析在本地发生；`socks5h://` 才绕开本地解析。`socks5h` 中的 `h` 是 curl 的写法，不是 RFC 术语。

## 代理相关的环境变量

这套环境变量没有写进任何 RFC，是各程序沿用的惯例。curl 作者对这段历史的说明见[《Everything curl》的 proxy 环境变量一节](https://everything.curl.dev/usingcurl/proxies/env.html)。

### 三个平台怎么设

::: code-group

```bash [macOS / Linux]
# 当前终端窗口有效，关掉即失效
export all_proxy=socks5h://127.0.0.1:PORT
export http_proxy=$all_proxy
export https_proxy=$all_proxy

# 查看
env | grep -i proxy

# 取消
unset all_proxy http_proxy https_proxy ALL_PROXY HTTP_PROXY HTTPS_PROXY
```

```powershell [Windows]
# 当前 PowerShell 窗口有效
$env:http_proxy  = "http://127.0.0.1:PORT"
$env:https_proxy = $env:http_proxy

# 查看
Get-ChildItem Env: | Where-Object Name -match 'proxy'

# 取消
Remove-Item Env:http_proxy, Env:https_proxy -ErrorAction SilentlyContinue

# 写进用户账户、每个新窗口都带上（谨慎：代理没开时联网命令会失败）
[Environment]::SetEnvironmentVariable("http_proxy", "http://127.0.0.1:PORT", "User")
# 撤销
[Environment]::SetEnvironmentVariable("http_proxy", $null, "User")
```

:::

`PORT` 换成你本机代理实际监听的端口。想让这套开关在每个新窗口里随取随用而不是常驻，写法见[终端、shell 与 PATH](/tutorial/terminal-shell-and-path#按需开关代理)——PowerShell 的对应位置是 `$PROFILE`，见 [about_profiles](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_profiles)。

Windows 上还有一层与环境变量无关的系统代理，某些程序只看它：

```powershell
netsh winhttp show proxy
```

它由 [`netsh`](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh) 管理，改它通常需要管理员权限。没有管理员权限时，用上面的环境变量即可，多数命令行程序都认。

### 各程序的读取规则并不一致

这是最容易踩空的地方：变量名相同，行为未必相同。**具体行为要查该程序自己的文档，不能从别的程序推断。**

curl 手册的 [ENVIRONMENT](https://curl.se/docs/manpage.html#ENVIRONMENT) 一节规定：

> The environment variables can be specified in lower case or upper case. The lower case version has precedence. `http_proxy` is an exception as it is only available in lower case.

因此网上大量教程里同时 `export ALL_PROXY=` 与 `export all_proxy=` 两行，对 curl 而言是冗余的——小写本就优先；写两行只在需要照顾读取规则不同的其他程序时才有意义。

`NO_PROXY` 的差异更明显。同一个值，curl 与 .NET 的理解不同：

|                | curl（[`--noproxy`](https://curl.se/docs/manpage.html#--noproxy)） | .NET / PowerShell（[`HttpClient.DefaultProxy`](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient.defaultproxy)） |
| -------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `example.com`  | 匹配 `example.com` 与 `www.example.com`                            | 只匹配 `example.com`，**不匹配** `www.example.com`                                                                                     |
| `.example.com` | ——                                                                 | 匹配 `www.example.com`，**不匹配** `example.com`                                                                                       |
| `*`            | 表示全部不走代理                                                   | **不支持通配符**                                                                                                                       |
| CIDR 写法      | 7.86.0 起支持 `192.168.0.0/16`                                     | 不支持                                                                                                                                 |

.NET 的文档原话是“Asterisks are not supported for wildcards; use a leading dot in case you want to match a subdomain”。这条直接影响 PowerShell：

在 PowerShell 里，`Invoke-WebRequest` 底层用 .NET 的 `HttpClient`，因此**它同样读取 `http_proxy` 这套环境变量**——设了代理之后 `Invoke-WebRequest` 会跟着走。

还有一个 Windows 专有的坑：

- **Windows PowerShell 5.1**（系统自带的那个）里，`curl` 是 `Invoke-WebRequest` 的别名，参数完全不同，`curl -I` 之类的写法会报错。要用真正的 curl 得写 `curl.exe`。
- **PowerShell 7 及以后**移除了这个别名，`curl` 就是 curl 本身。

用 `Get-Alias curl` 一条命令就能确认自己在哪一档。

### 浏览器能通而终端不通

浏览器跟随操作系统的代理设置，终端里的程序不读该设置，只读自身进程环境里的[环境变量](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap08.html#tag_08_01)。而环境变量在创建子进程时继承，于是：

- `export`（Windows 上是 `$env:`）只对此后从该窗口启动的程序生效；
- 已在运行的程序不受影响。

继承机制的细节见[终端、shell 与 PATH](/tutorial/terminal-shell-and-path#环境变量与继承)。

## Git 的代理配置层级

Git 的 HTTP 传输底层用 curl，上述环境变量对它有效。`git config` 另有三层，从宽到窄：

| 配置项                                                                                                        | 范围                |
| ------------------------------------------------------------------------------------------------------------- | ------------------- |
| [`http.proxy`](https://git-scm.com/docs/git-config#Documentation/git-config.txt-httpproxy)                    | 所有 HTTP(S) 远程   |
| [`http.<url>.*`](https://git-scm.com/docs/git-config#Documentation/git-config.txt-httplturlgt)                | 匹配特定 URL 的远程 |
| [`remote.<name>.proxy`](https://git-scm.com/docs/git-config#Documentation/git-config.txt-remoteltnamegtproxy) | 指定名字的那个远程  |

`http.proxy` 的说明是“Override the HTTP proxy, normally configured using the `http_proxy`, `https_proxy`, and `all_proxy` environment variables”——它盖过环境变量。换代理后只改了环境变量、而早先写进全局配置的那一行仍在，是最常见的一类故障。

`http.<url>.*` 的匹配按 scheme、主机名、端口、路径逐段比较：主机名支持 `*` 通配一级子域，路径按斜杠分段做前缀匹配。

以上全部只对 HTTP(S) 远程生效。远程地址为 `git@github.com:...` 这种 SSH 形式时走另一套机制，代理需配在 SSH 的配置里，`http.proxy` 对它无效。用 `git remote -v` 确认自己的远程是哪一种。

Git 手册对 `remote.<name>.proxy` 附了一条约束：

> Any proxy, however configured, must be completely transparent and must not modify, transform, or buffer the request or response in any way.

会改写内容的代理会使 Git 出现各种难以归因的故障——下一节就是这种情况。

## 校园网与企业网的特殊情形

某些校园网、企业网或安全软件会在中间解密再重新加密流量，用自己签发的证书冒充目标站点。这时 TLS 握手能完成，但证书的签发者不是公共 CA，于是 curl 和 Git 会报证书错误。

判断方法是看证书是谁签的：

::: code-group

```bash [macOS / Linux]
curl -vI https://github.com 2>&1 | grep -i 'issuer\|subject'
```

```powershell [Windows]
curl.exe -vI https://github.com 2>&1 | Select-String 'issuer|subject'
```

:::

签发者不是 DigiCert、Let's Encrypt 这类公共 CA，而是学校或某个安全产品的名字，就属于这种情况。

正确做法是把该机构的根证书装进系统信任库（通常由网管提供），而**不是**关掉证书校验。`git config --global http.sslVerify false` 这类做法会让所有连接失去身份验证，任何人都能冒充目标站点，代价远大于省下的麻烦。

## 常见报错对照

| 你看到的                                                             | 卡在哪一步               | 从哪查起                                     |
| -------------------------------------------------------------------- | ------------------------ | -------------------------------------------- |
| `Could not resolve host`                                             | 阶段一，域名没解析出来   | 换个 DNS，或改用 `socks5h://` 把解析交给代理 |
| `Connection timed out`                                               | 阶段二，TCP 连不上       | 端口是否被网络拦截；是否需要走代理           |
| `Connection refused`                                                 | 阶段二，对端明确拒绝     | 代理地址或端口写错了，或代理没在运行         |
| `SSL certificate problem` / `unable to get local issuer certificate` | 阶段三，证书链验不过     | 见上一节的中间人拦截                         |
| `Proxy CONNECT aborted`                                              | 代理拒绝建隧道           | 代理是否允许该端口；认证是否正确             |
| `Failed to connect to 127.0.0.1 port ...`                            | 代理本身没在跑           | 启动代理，或取消这几个环境变量               |
| `Empty reply from server`                                            | 连上了但对端没按预期回应 | 协议写错，例如把 HTTP 代理当 SOCKS 用        |

## 分阶段排查

按前面四个阶段依次确认，先定位再动手：

::: code-group

```bash [macOS / Linux]
# 阶段 1：域名能否解析
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

```powershell [Windows]
# 阶段 1：域名能否解析
Resolve-DnsName github.com

# 阶段 2：TCP 能否连上 443
Test-NetConnection github.com -Port 443

# 阶段 3、4：注意用 curl.exe，别用可能是别名的 curl
curl.exe -v -I https://github.com

# 当前进程环境里的代理变量
Get-ChildItem Env: | Where-Object Name -match 'proxy'

# 系统级代理（与环境变量是两套）
netsh winhttp show proxy

# Git 的配置层，以及底层 curl 的过程
git config --global --get-regexp proxy
$env:GIT_CURL_VERBOSE=1; git ls-remote https://github.com/nbtca/documents.git HEAD
```

:::

[`git ls-remote`](https://git-scm.com/docs/git-ls-remote) 只读远程的引用列表，不改动本地，成功时返回一串对象名与引用名，很适合用来验证连通性。

排查到最后仍然定位不了，把上面几条命令的输出贴到群里或[开一个 Issue](https://github.com/nbtca/documents/issues)——有完整输出别人才判断得了，只说“连不上”很难帮上忙。

## 延伸阅读

- [《Everything curl》](https://everything.curl.dev/)——curl 作者 Daniel Stenberg 写的完整手册，代理一章比 man page 详尽
- [RFC 9110 — HTTP Semantics](https://httpwg.org/specs/rfc9110.html)——HTTP 语义的现行规范，取代了 RFC 7230/7231 系列
- [RFC 1928 — SOCKS Protocol Version 5](https://www.rfc-editor.org/rfc/rfc1928)
- [git config 文档](https://git-scm.com/docs/git-config)
- [.NET 的 HttpClient.DefaultProxy](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient.defaultproxy)——PowerShell 与 .NET 程序的代理行为以这份为准
