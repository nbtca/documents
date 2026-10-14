---
order: 10
maintainers:
  - user: m1ngsama
    since: 2025-11
---

# 快速上手 nginx

nginx 是一个 Web 服务器和反向代理。本文用最少的步骤在 Debian 或 Ubuntu 上发布一个静态页面，说明每一步的作用，最后给出反向代理的最小配置。

## nginx 的用途

- **Web 服务器**：发布静态网页。本文的主要内容。
- **反向代理**：把请求转发给后端程序。见文末。
- **负载均衡**：把请求分配给多个后端。

## 安装 nginx

1. 更新软件包列表：

   ```bash
   sudo apt update
   ```

2. 安装 nginx：

   ```bash
   sudo apt install nginx
   ```

3. 确认 nginx 正在运行。输出中应有 `active (running)`：

   ```bash
   systemctl status nginx
   ```

## 写一个页面

1. 用 vim 创建 `index.html`：

   ```bash
   vim index.html
   ```

2. 按 `i`，进入输入模式。
3. 输入 `hello XD`。
4. 按 `Esc`，回到普通模式。
5. 输入 `:wq`，按 Enter。`:` 进入命令模式，`w` 表示写入（write），`q` 表示退出（quit）。

vim 的完整用法见 [vim 文档](https://www.vim.org/docs.php)。

## 把页面放到网站目录

1. 创建网站目录：

   ```bash
   sudo mkdir -p /var/www/myWebsite
   ```

2. 把 `index.html` 移到网站目录。这个目录属于 root，所以要用 `sudo`：

   ```bash
   sudo mv index.html /var/www/myWebsite/
   ```

## 配置文件的位置

nginx 的主配置文件是 `/etc/nginx/nginx.conf`。它控制 nginx 的全局行为：

- 全局设置，例如用户、进程数和日志；
- HTTP 模块的设置，例如 gzip、缓存和连接超时；
- 用 `include` 指令加载的子配置文件；
- 服务器块（`server {}`）和位置块（`location {}`）。

nginx 启动时先读取这个文件，再按其中的 `include` 指令加载其他配置文件。Debian 和 Ubuntu 用下面三个目录存放子配置：

- `/etc/nginx/conf.d/`：放以 `.conf` 结尾的配置文件。nginx 自动加载 `conf.d/*.conf`。
- `/etc/nginx/sites-available/`：放可用的站点配置。这里的配置不会自动启用。
- `/etc/nginx/sites-enabled/`：放已启用的站点配置，通常是指向 `sites-available` 中文件的软链接。

本文只使用 `conf.d`。

1. 打开 `/etc/nginx/nginx.conf`，确认 `http` 块中有下面三行：

   ```nginx
   include       /etc/nginx/mime.types;
   include       /etc/nginx/conf.d/*.conf;
   include       /etc/nginx/sites-enabled/*;
   ```

## 写站点配置

::: info 注
Debian 和 Ubuntu 安装 nginx 时，会在 `sites-enabled` 中启用一个默认站点。用 IP 地址访问时，这个默认站点先响应请求，你只能看到 nginx 的欢迎页。下面的第 1 步停用这个默认站点。
:::

1. 删除默认站点的软链接。这一步只删除链接，`sites-available/default` 仍然保留：

   ```bash
   sudo rm /etc/nginx/sites-enabled/default
   ```

2. 创建站点配置文件：

   ```bash
   sudo vim /etc/nginx/conf.d/hello.conf
   ```

3. 写入下面的内容，保存并退出：

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

每一行的作用：

- `listen 80;`：监听 HTTP 的 80 端口。
- `server_name localhost;`：站点的名字。测试时用 `localhost`，正式使用时改成域名。
- `root /var/www/myWebsite;`：网站根目录。
- `index index.html;`：访问目录时返回的文件。
- `location / { try_files ... }`：请求的文件不存在时，返回 404。

## 测试配置并重载

1. 检查配置的语法：

   ```bash
   sudo nginx -t
   ```

2. 确认输出中有下面这一行。如果没有，按输出中的错误信息修改配置：

   ```text
   nginx: configuration file /etc/nginx/nginx.conf test is successful
   ```

3. 重载 nginx，使配置生效：

   ```bash
   sudo systemctl reload nginx
   ```

4. 在浏览器中访问服务器的 IP 地址。页面应显示 `hello XD`。

::: info 注
`nginx -t` 只检查语法，不使配置生效。只有 `reload` 才使配置生效。`reload` 不会断开现有连接。如果修改配置后没有效果，检查是否忘记了 `reload`。
:::

## 一次请求的过程

浏览器访问 `http://ip/` 时，请求按下面的顺序处理：

1. 请求到达 80 端口。
2. nginx 根据 `listen` 和 `server_name` 选择一个 server 块。
3. nginx 用 `location` 匹配请求路径。
4. nginx 把 `root` 和请求路径拼成文件路径，用 `try_files` 依次查找文件。

出错时，按这个顺序检查：

- `nginx -t` 报错：配置文件有语法错误。
- 返回 404：拼出的文件路径不存在。
- 返回 403：nginx 没有读取文件的权限。

`conf.d` 中的每个 `server {}` 是一个虚拟主机。同一个 80 端口可以有多个站点。nginx 用请求头中的域名匹配 `server_name`，从而区分这些站点。

## 下一步：反向代理

反向代理把请求转发给后端程序，例如运行在 3000 端口的 Node 服务。nginx 接收所有请求，再转发给后端。对外只开放 80 和 443 端口。nginx 还可以处理 HTTPS、缓存和负载均衡。最小配置如下：

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

两行 `proxy_set_header` 把访客的域名和 IP 地址传给后端。没有这两行，后端看到的所有请求都来自 nginx。

## 使用 sites-available

如果要使用 `sites-available` 和 `sites-enabled`，把配置文件放在 `sites-available` 中，再创建软链接：

```bash
sudo ln -s /etc/nginx/sites-available/hello.conf /etc/nginx/sites-enabled/hello.conf
```

本文的初版由 sheepkinn 编写，见[他的仓库](https://github.com/sheepkinn/sheepkinn.github.io)。
