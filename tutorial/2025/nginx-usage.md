---
order: 5
maintainers:
  - user: m1ngsama
    since: 2025-11
---

# 快速上手 nginx

nginx 是一个高性能的 Web 服务器与反向代理。本文用最短路径带你跑起第一个静态页面，讲清每一步在做什么，最后给出反向代理的最小示例。

## nginx 做什么

- http web server（托管静态网页，本文主线）
- reverse proxy（反向代理，见文末）
- load balance（负载均衡）

## index.html

随手写点什么，比如

```bash
vim index.html
```

```html
hello XD
```

> 什么？不会vim？快学🤓👉[vim doc](https://www.vim.org/docs.php)
> 不过作为速通，我会告诉你这次怎么办😇

```text
vim index.html

输入 i, 进入insert (输入模式)

键入: hello XD

按下esc键, 退回normal (通常模式)

依次按下':''w','q', 然后回车, 很神奇吧😆

':'进入command(命令模式)

'w'即为write(写入)

'q'即为quit(退出)

```

## /var/www

把这个`index.html`放到一个固定位置

```bash
sudo mkdir /var/www/myWebsite

mv index.html /var/www/myWebsite/
```

> 目前还不需要搞明白这三兄弟

- `/etc/nginx/conf.d/` (通常用于放置单独的配置文件（以 .conf 结尾），Nginx 会自动加载 conf.d/\*.conf 文件。)
- `/etc/nginx/sites-available/` (用于存放可用站点配置，但不会自动启用。)
- `/etc/nginx/sites-enabled/` (用于启用的站点配置，通常通过软链接指向 sites-available 中的配置文件。)

你只需要将你写的每个配置丢到 conf.d 就好了

## nginx.conf

nginx的主配置文件，它控制 Nginx 的整体行为，比如：

- 全局设置（用户、进程数、日志等）
- HTTP 模块的设置（gzip、缓存、连接超时等）
- 包含子配置文件（include 指令）
- 服务器块（server {}）和位置块（location {}）

Nginx 启动时会先读取这个文件，然后按它的指令加载其它配置文件。

目前你只需要关注，确保有下面这几行在http块里

```nginx
    include       /etc/nginx/mime.types;
    include       /etc/nginx/conf.d/*.conf;
    include       /etc/nginx/sites-enabled/*;
```

## hello.conf

写网页的nginx配置

```bash
sudo vim /etc/nginx/conf.d/hello.conf
```

```nginx
server {
    listen 80;
    server_name localhost;

    root /var/www/myWebsite;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

解释：

- `listen 80;`→ 监听 HTTP 80 端口
- `server_name localhost;` → 测试用，可以改成域名
- `root /var/www/myWebsite;` → 网站根目录
- `index index.html;` → 我们写的页面
- `location / { try_files ... }` → 请求文件不存在返回 404

## 测试配置并重载

```bash
sudo nginx -t
sudo systemctl reload nginx
```

如果输出

```bash
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

说明配置正确，浏览器访问 ip 即可成功见到`hello XD`

> `nginx -t` 只检查配置语法，`reload` 才让它生效——reload 是平滑重载、不断线。改了配置没生效，十有八九是忘了 reload。

## 一次请求发生了什么

浏览器访问 `http://ip/` 时：请求到达 80 端口 → nginx 用 `listen` + `server_name` 挑出匹配的 server 块 → `location` 匹配路径 → 以 `root` + 路径拼出文件位置，`try_files` 依次尝试。排错就沿这条链查：`nginx -t` 报错是配置写错了；404 是拼出的文件路径不存在；403 多半是 nginx 对文件没有读权限。

另外，conf.d 里每个 `server {}` 就是一个“虚拟主机”：同一个 80 端口可以挂多个站点，nginx 靠请求头里的域名（对上哪个 `server_name`）区分它们——这就是“每个配置丢进 conf.d”背后发生的事。

## 下一步：反向代理

nginx 的另一大用途是反向代理：你的程序（比如跑在 3000 端口的 Node 服务）躲在后面，nginx 在前面统一收请求再转发——对外只暴露 80/443，还能顺手做 HTTPS、缓存与负载均衡。最小配置：

```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

两行 `proxy_set_header` 是把访客真实的域名与 IP 传给后端——否则后端看到的请求全部来自 nginx 自己。

本文初版专为小朋友所写，见文记得去[他的仓库](https://github.com/sheepkinn/sheepkinn.github.io)踢他一下XD

---

> ps，如果非要写软连接的话

```bash
sudo ln -s /etc/nginx/sites-available/hello.conf /etc/nginx/sites-enabled/hello.conf
```
