---
order: 8
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# 计算机网络与代理

弄清终端连接一个网站要经过哪些环节，以及代理插在其中哪一环。

::: info 这篇写给谁

只想改一页文档的话，你不需要读它。[在网页上编辑](/tutorial/manual/documents-git-workflow#路线-a-在网页上改)不经过你本机的网络。

终端连不上 GitHub 而你想自己弄明白，这篇从头讲到尾。急着解决问题，先跳到[常见报错对照](#常见报错对照)。

命令都给出 macOS、Linux、Windows 三种写法。每处结论都链到规范条款或官方手册，你可以逐条核对。

:::

## 概览

你在终端敲下 `git clone https://github.com/nbtca/documents.git`，在拿到第一个字节前，有四件事按顺序发生。

1. **域名解析**：把 `github.com` 变成一个 IP 地址。
2. **TCP 连接**：和那个 IP 的 443 端口完成[三次握手](https://www.rfc-editor.org/rfc/rfc9293#section-3.5)。
3. **TLS 握手**：在这条连接上协商加密，并验证对方的证书。
4. **HTTP 请求**：在加密通道里发出真正的请求。

四件事互相独立。任何一件单独失败，你看到的报错都不一样。排查的第一步是判断卡在第几件，而不是笼统地说连不上。

IP 地址定位到机器，端口定位到机器上的哪个程序。默认端口由 [IANA 的端口号注册表](https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml)登记：HTTP 是 80，HTTPS 是 443，SSH 是 22。

代理是插在第 1 步和第 2 步之间的一个中转。你的程序不再直接连 GitHub，而是连代理，由代理代为连接。这带来两个后续问题：域名由谁解析，以及你的程序怎么知道该走代理。这篇后半讲这两件事。

## 域名怎么变成地址

你的程序自己不做完整解析。它把域名交给系统的 stub resolver，由后者去问递归解析器；递归解析器依次问根、顶级域和权威服务器，缓存结果后返回。这套分工见 [RFC 1034 §5](https://www.rfc-editor.org/rfc/rfc1034#section-5)，几个角色的准确定义见 [RFC 8499 §6](https://www.rfc-editor.org/rfc/rfc8499#section-6)。你本机的 `hosts` 文件优先于这一整套流程。

查一个域名解析到什么：

::: code-group

```bash [macOS]
dig +short github.com
```

```bash [Linux]
dig +short github.com
```

```powershell [Windows]
Resolve-DnsName github.com
```

:::

Linux 上 `dig` 多数发行版不预装，装法是 `apt install dnsutils`、`dnf install bind-utils` 或 `pacman -S bind`。不想装的话，系统自带的 `getent hosts github.com` 也能看到解析结果。Windows 上除了 `Resolve-DnsName`，老牌的 `nslookup` 同样可用。

`dig` 的完整用法见 [ISC 的 BIND 9 手册](https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility)，`getent` 见[它的 man page](https://man7.org/linux/man-pages/man1/getent.1.html)，Windows 侧见 [`Resolve-DnsName`](https://learn.microsoft.com/en-us/powershell/module/dnsclient/resolve-dnsname)。

记住一点：**解析域名和建立连接是两件独立的事**。谁去解析、在哪台机器上解析，可以和谁去连接分开。[socks5 与 socks5h 的差别](#用-socks5-还是-socks5h)完全建立在这个区分上。

## 端口通不通

拿到 IP 之后，你的程序去连它的某个端口。测这一步：

::: code-group

```bash [macOS]
nc -vz github.com 443
```

```bash [Linux]
nc -vz github.com 443
```

```powershell [Windows]
Test-NetConnection github.com -Port 443
```

:::

Windows 上看输出里的 `TcpTestSucceeded` 是不是 `True`。Linux 上 `nc` 也可能没预装，装法是 `apt install netcat-openbsd`、`dnf install nmap-ncat` 或 `pacman -S openbsd-netcat`；想看本机已有哪些连接和监听端口，用 [`ss -tunlp`](https://man7.org/linux/man-pages/man8/ss.8.html)。Windows 侧的说明见 [`Test-NetConnection`](https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection)。

域名解析正常而这一步超时，通常说明这个端口在你所处的网络里出不去，你需要一个代理。

## 加密握手时暴露了什么

TLS 握手跑在 TCP 之上，现行版本是 [RFC 8446](https://www.rfc-editor.org/rfc/rfc8446) 的 TLS 1.3。你的程序在第一个 [ClientHello](https://www.rfc-editor.org/rfc/rfc8446#section-4.1.2) 里带上 [SNI 扩展](https://www.rfc-editor.org/rfc/rfc6066#section-3)，告诉对方你要访问哪个域名。一个 IP 上可能挂着几百个站点，服务器要靠它选择证书。

SNI 是明文的。链路上的任何一跳即使解不开内容，也读得到你访问的是哪个域名。

## 选 HTTP 代理还是 SOCKS 代理

两者拦截的位置不同，能力也不同。

**HTTP 代理**懂 HTTP。明文 HTTP 下，你的程序把完整的 URL 写进[请求行](https://www.rfc-editor.org/rfc/rfc9112#section-3.2)，代理替你转发。HTTPS 下代理没有密钥，读不了加密内容。这时它改用 CONNECT。[RFC 9110 §9.3.6](https://httpwg.org/specs/rfc9110.html#CONNECT) 的定义是：

> The CONNECT method requests that the recipient establish a tunnel to the destination origin server identified by the request target and, if successful, thereafter restrict its behavior to blind forwarding of data, in both directions, until the tunnel is closed.

blind forwarding（盲转发）指代理建好隧道之后只搬运字节，不解析也不修改。同一节规定请求行只含主机与端口，端口不可省略：

```http
CONNECT server.example.com:443 HTTP/1.1
Host: server.example.com
```

你通过 HTTP 代理访问 HTTPS 时，代理知道你连了哪台主机的哪个端口，看不到路径和内容。

**SOCKS 代理**不懂 HTTP。它只负责替你建立一条 TCP 连接然后搬运字节。SSH、数据库连接这些非 HTTP 的东西它也能带，HTTP 代理不能。

[RFC 1928](https://www.rfc-editor.org/rfc/rfc1928) 定义的 SOCKS5 分三步：你的程序发送版本与支持的认证方法，服务端选定一种（[§3](https://www.rfc-editor.org/rfc/rfc1928#section-3)）；若选中用户名口令，按 [RFC 1929](https://www.rfc-editor.org/rfc/rfc1929) 认证；然后发出请求（[§4](https://www.rfc-editor.org/rfc/rfc1928#section-4)），其中 `CMD` 说明操作类型，`ATYP` 说明地址类型，`DST.ADDR` 与 `DST.PORT` 是目标。

要在两者间选：只跑 HTTP(S)，两个都行；要带 SSH 形式的 Git 远程或其他 TCP 服务，你需要 SOCKS。

### 用 socks5 还是 socks5h

`ATYP` 有三个取值，[RFC 1928 §5](https://www.rfc-editor.org/rfc/rfc1928#section-5)：

> `X'01'` the address is a version-4 IP address, with a length of 4 octets
>
> `X'03'` the address field contains a fully-qualified domain name. The first octet of the address field contains the number of octets of name that follow, there is no terminating NUL octet.
>
> `X'04'` the address is a version-6 IP address, with a length of 16 octets.

`X'03'` 是全部差别的来源：协议允许你把域名原样交给代理，让代理去解析。同一个 SOCKS5 代理有两种用法。

- 你在本地解析域名，把得到的 IP 填进 `DST.ADDR`（`ATYP` = `X'01'`）。
- 你不解析，把域名直接填进 `DST.ADDR`（`ATYP` = `X'03'`），解析发生在代理那一端。

curl 用协议前缀区分这两种：[`--proxy`](https://curl.se/docs/manpage.html#--proxy) 接受 `socks5://` 表示前者、`socks5h://` 表示后者。[`--socks5-hostname`](https://curl.se/docs/manpage.html#--socks5-hostname) 的说明是“Use the specified SOCKS5 proxy (and let the proxy resolve the hostname)”，并指出它等价于给 `--proxy` 加 `socks5h://` 前缀。

你本机的域名解析如果本身就是坏的，`socks5://` 一样连不上，因为解析在本地发生。这种情况下用 `socks5h://`。`socks5h` 里的 `h` 是 curl 的写法，不是 RFC 里的术语。

## 让终端走代理

::: code-group

```bash [macOS / Linux]
export all_proxy=socks5h://127.0.0.1:PORT
export http_proxy=$all_proxy
export https_proxy=$all_proxy

env | grep -i proxy

unset all_proxy http_proxy https_proxy ALL_PROXY HTTP_PROXY HTTPS_PROXY
```

```powershell [Windows]
$env:http_proxy  = "http://127.0.0.1:PORT"
$env:https_proxy = $env:http_proxy

Get-ChildItem Env: | Where-Object Name -match 'proxy'

Remove-Item Env:http_proxy, Env:https_proxy -ErrorAction SilentlyContinue
```

:::

把 `PORT` 换成你本机代理实际监听的端口。这样设只对当前窗口有效，关掉窗口就没了。

想让每个新窗口都带上，你可以写进 shell 的启动文件，代价是代理没运行时所有联网命令都会指向一个无人监听的端口而失败。更稳妥的做法是定义两个开关函数，需要时才打开，写法见[终端、shell 与 PATH](/tutorial/terminal-shell-and-path#按需开关代理)。PowerShell 里对应的位置是 `$PROFILE`，见 [about_profiles](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_profiles)。

在 Windows 上永久写进你的用户账户：

```powershell
[Environment]::SetEnvironmentVariable("http_proxy", "http://127.0.0.1:PORT", "User")
[Environment]::SetEnvironmentVariable("http_proxy", $null, "User")   # 撤销
```

Windows 还有一层跟环境变量无关的系统代理，某些程序只看它：

```powershell
netsh winhttp show proxy
```

它由 [`netsh`](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh) 管理，修改通常要管理员权限。你没有管理员权限也不要紧，用上面的环境变量就够，多数命令行程序都认。

### 同一个变量，不同程序读法不同

这套环境变量没有写进任何 RFC，是各程序沿用下来的惯例。curl 作者对这段历史的说明见[《Everything curl》](https://everything.curl.dev/usingcurl/proxies/env.html)。变量名相同不代表行为相同，你要查的是该程序自己的文档。

curl 手册的 [ENVIRONMENT](https://curl.se/docs/manpage.html#ENVIRONMENT) 一节规定：

> The environment variables can be specified in lower case or upper case. The lower case version has precedence. `http_proxy` is an exception as it is only available in lower case.

网上教程里同时写 `export ALL_PROXY=` 和 `export all_proxy=` 两行，对 curl 是多余的。小写本来就优先。你写两行只在要照顾读取规则不同的其他程序时才有意义。

`NO_PROXY` 的分歧更大。同一个值，curl 和 .NET 的理解不同：

| 你写的值         | curl（[`--noproxy`](https://curl.se/docs/manpage.html#--noproxy)） | .NET / PowerShell（[`HttpClient.DefaultProxy`](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient.defaultproxy)） |
| ---------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `example.com`    | 匹配 `example.com` 和 `www.example.com`                            | 只匹配 `example.com`，不匹配 `www.example.com`                                                                                         |
| `.example.com`   | 同上                                                               | 匹配 `www.example.com`，不匹配 `example.com`                                                                                           |
| `*`              | 全部不走代理                                                       | 不支持通配符                                                                                                                           |
| `192.168.0.0/16` | 7.86.0 起支持                                                      | 不支持                                                                                                                                 |

.NET 文档的原话是“Asterisks are not supported for wildcards; use a leading dot in case you want to match a subdomain”。

### PowerShell 用户要多注意两点

第一，`Invoke-WebRequest` 底层用 .NET 的 `HttpClient`。它读上面这套环境变量，也遵循上表右列的 `NO_PROXY` 规则。你设了代理之后它会跟着走。

第二，`curl` 这个名字在两代 PowerShell 里指向不同的东西。

- Windows 自带的 **PowerShell 5.1** 里，`curl` 是 `Invoke-WebRequest` 的别名，参数完全不同，`curl -I` 会报错。你要用真正的 curl 得写 `curl.exe`。
- **PowerShell 7 及以后**移除了这个别名，`curl` 就是 curl 本身。

敲 `Get-Alias curl` 就知道你在哪一档。

### 为什么浏览器能通而终端不通

浏览器跟随操作系统的代理设置。终端里的程序不读那个设置，只读自己进程环境里的[环境变量](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap08.html#tag_08_01)。

环境变量在创建子进程时继承，这带来两个结果：你 `export` 之后，只有此后从这个窗口启动的程序拿得到；已经在运行的程序不受影响。继承机制的细节见[终端、shell 与 PATH](/tutorial/terminal-shell-and-path#环境变量为什么只对新开的程序生效)。

## 给 Git 单独配代理

Git 的 HTTP 传输底层用 curl，上面那套环境变量对它有效。`git config` 另有三层，范围从宽到窄：

| 配置项                                                                                                        | 范围                |
| ------------------------------------------------------------------------------------------------------------- | ------------------- |
| [`http.proxy`](https://git-scm.com/docs/git-config#Documentation/git-config.txt-httpproxy)                    | 所有 HTTP(S) 远程   |
| [`http.<url>.*`](https://git-scm.com/docs/git-config#Documentation/git-config.txt-httplturlgt)                | 匹配特定 URL 的远程 |
| [`remote.<name>.proxy`](https://git-scm.com/docs/git-config#Documentation/git-config.txt-remoteltnamegtproxy) | 指定名字的那个远程  |

`http.proxy` 的说明是“Override the HTTP proxy, normally configured using the `http_proxy`, `https_proxy`, and `all_proxy` environment variables”。它盖过环境变量。你换了代理、改了环境变量，但很久以前写进全局配置的那一行还在，Git 就会继续去连那个已经不存在的端口。用这条列出所有相关配置：

```bash
git config --global --get-regexp proxy
```

`http.<url>.*` 的匹配按 scheme、主机名、端口、路径逐段比较。主机名支持 `*` 通配一级子域，路径按斜杠分段做前缀匹配。

以上全部只对 HTTP(S) 远程生效。你的远程地址如果是 `git@github.com:...` 这种 SSH 形式，走的是另一套，代理要配在 SSH 自己的配置里。先用 `git remote -v` 确认你是哪一种。

Git 手册还附了一条约束：

> Any proxy, however configured, must be completely transparent and must not modify, transform, or buffer the request or response in any way.

会改写内容的代理会让 Git 出现各种难以归因的故障。下面这种情况就属于此类。

## 证书验不过时先看是谁签的

有些校园网、企业网或安全软件会在中间解密再重新加密，用自己签发的证书冒充目标站点。TLS 握手能完成，但签发者不是公共 CA。curl 和 Git 会报证书错误。

::: code-group

```bash [macOS / Linux]
curl -vI https://github.com 2>&1 | grep -i 'issuer\|subject'
```

```powershell [Windows]
curl.exe -vI https://github.com 2>&1 | Select-String 'issuer|subject'
```

:::

签发者如果不是 DigiCert、Let's Encrypt 这类公共 CA，而是学校或某个安全产品的名字，你遇到的就是这种情况。

正确做法是把该机构的根证书装进系统信任库，证书通常由网管提供。不要用 `git config --global http.sslVerify false`。那条命令会让你此后所有连接都失去身份验证，任何人都可以冒充任何站点，代价远大于它省下的麻烦。

## 常见报错对照

| 你看到的                                  | 卡在哪                   | 从哪查起                                     |
| ----------------------------------------- | ------------------------ | -------------------------------------------- |
| `Could not resolve host`                  | 域名没解析出来           | 换个 DNS，或改用 `socks5h://` 把解析交给代理 |
| `Connection timed out`                    | TCP 连不上               | 端口是否被网络拦住；是否需要走代理           |
| `Connection refused`                      | 对端明确拒绝             | 代理地址或端口写错，或者代理没在运行         |
| `SSL certificate problem`                 | 证书链验不过             | 见上一节                                     |
| `unable to get local issuer certificate`  | 同上                     | 同上                                         |
| `Proxy CONNECT aborted`                   | 代理拒绝建隧道           | 代理是否允许该端口；认证是否正确             |
| `Failed to connect to 127.0.0.1 port ...` | 代理本身没在跑           | 启动代理，或取消那几个环境变量               |
| `Empty reply from server`                 | 连上了但对方没按预期回应 | 协议写错，例如把 HTTP 代理当 SOCKS 用        |

## 一次把四步都验一遍

::: code-group

```bash [macOS / Linux]
dig +short github.com                      # 1 域名能否解析
nc -vz github.com 443                      # 2 TCP 能否连上
curl -v -I https://github.com              # 3 4 完整走一遍
env | grep -i proxy                        # 当前环境里的代理变量
git config --global --get-regexp proxy     # Git 自己的代理配置
GIT_CURL_VERBOSE=1 git ls-remote https://github.com/nbtca/documents.git HEAD
```

```powershell [Windows]
Resolve-DnsName github.com                 # 1 域名能否解析
Test-NetConnection github.com -Port 443    # 2 TCP 能否连上
curl.exe -v -I https://github.com          # 3 4 完整走一遍
Get-ChildItem Env: | Where-Object Name -match 'proxy'
netsh winhttp show proxy                   # 系统级代理，与环境变量是两套
git config --global --get-regexp proxy
$env:GIT_CURL_VERBOSE=1; git ls-remote https://github.com/nbtca/documents.git HEAD
```

:::

[`git ls-remote`](https://git-scm.com/docs/git-ls-remote) 只读远程的引用列表，不动你本地的任何东西，成功时返回一串对象名和引用名。

自己定位不了的话，把上面几条命令的输出贴到群里，或者[开一个 Issue](https://github.com/nbtca/documents/issues)。有完整输出别人才判断得了。

## 延伸阅读

- [《Everything curl》](https://everything.curl.dev/)，curl 作者写的完整手册，代理一章比 man page 详尽
- [RFC 9110 — HTTP Semantics](https://httpwg.org/specs/rfc9110.html)，HTTP 语义的现行规范
- [RFC 1928 — SOCKS Protocol Version 5](https://www.rfc-editor.org/rfc/rfc1928)
- [git config 文档](https://git-scm.com/docs/git-config)
- [.NET 的 HttpClient.DefaultProxy](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient.defaultproxy)，PowerShell 与 .NET 程序的代理行为以它为准
