# 快速上手你的nginx

:::info 维护信息

| 维护人                                   | 时间            |
| ---------------------------------------- | --------------- |
| [@m1ngsama](https://github.com/m1ngsama) | 2025.11.3 - Now |

:::

## nginx做什么

- http web server
- reverse proxy
- load balance
- etc.
  快速上手着重介绍你如何配置nginx完成你的个人http web server设置

## index.html

随手写点什么，比如

```bash
vim index.html
```

```index.html
hello XD
```

> 什么？不会vim？快学🤓👉[vim doc](https://www.vim.org/docs.php)
> 不过作为速通，我会告诉你这次怎么办😇

```keyboard
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
  你只需要将你写的每个配置丢到conf.d就好了

## nginx.conf

nginx的主配置文件，它控制 Nginx 的整体行为，比如：

- 全局设置（用户、进程数、日志等）
- HTTP 模块的设置（gzip、缓存、连接超时等）
- 包含子配置文件（include 指令）
- 服务器块（server {}）和位置块（location {}）

Nginx 启动时会先读取这个文件，然后按它的指令加载其它配置文件。

目前你只需要关注，确保有下面这几行在http块里

```nginx.conf
    include       /etc/nginx/mime.types;
    include       /etc/nginx/conf.d/*.conf;
    include       /etc/nginx/sites-enabled/*;
```

## hello.conf

写网页的nginx配置

```bash
sudo vim /etc/nginx/conf.d/hello.conf
```

```hello.conf
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

说明配置正确，浏览器访问ip即可成功见到`hello XD`

本文初版专为小朋友所写，见文记得去[他的仓库](https://github.com/sheepkinn/sheepkinn.github.io)踢他一下XD

---

> ps，如果非要写软连接的话

```bash
sudo ln -s /etc/nginx/sites-available/hello.conf /etc/nginx/sites-enabled/hello.conf
```
