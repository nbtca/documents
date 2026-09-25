---
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# NBTCA 账号

NBTCA 账号是协会各项线上服务共用的一套登录，基于开源身份认证平台 [Logto](https://docs.logto.io/) 自建，登录页在 auth.app.nbtca.space。在协会主页预约维修、队员进维修面板，用的都是这个账号；个人资料在 [myid.app.nbtca.space](https://myid.app.nbtca.space) 自助修改。

<FactStrip :facts="[
  { label: '平台', value: 'Logto（协会分支）' },
  { label: '登录页', value: 'auth.app.nbtca.space' },
  { label: '个人中心', value: 'myid.app.nbtca.space' },
  { label: '维护', value: 'wen-templari' },
]" />

<Figure src="./assets/project-account-sign-in.webp" alt="NBTCA 账号的登录页：协会圆徽下写着“登录你的账号”，有一个用户名或邮箱输入框和登录按钮，下方是注册链接，以及“通过 GitHub 继续”和“通过 通行证 继续”两个按钮" caption="各项服务跳转过来的都是这一个登录页。“通行证”即 Passkey，可以用设备上的指纹或面容登录。" date="2026-09" wide />

## 注册与登录

没有账号的可以在登录页自行注册，注册需要一个邮箱并通过验证码验证。登录有三种方式：用户名或邮箱加密码，GitHub 账号，以及 [Passkey](https://www.passkeys.io/)。注册和登录时会提示设置两步验证，可以选验证器 App 的动态码、Passkey 或备用码，也可以跳过；之后在 myid 里随时绑定 GitHub 或补设两步验证。

## 用在哪里

- **协会主页 [Home](./home)**：右上角登录，预约维修和查看维修记录都要先登录；
- **维修后端 [Saturday](./saturday)**：用 Logto 的登录凭证换取自己的访问令牌。队员身份由 Logto 里的角色决定，“Repair Member”对应普通队员，“Repair Admin”对应管理员；Logto 通过 webhook 把用户变动同步给 Saturday；
- **内部管理页**：日志查看器等只给维护者用的页面挡在 [traefik-forward-auth](https://github.com/nbtca/traefik-forward-auth) 后面，访问时先跳到 Logto 登录；
- **个人中心**：myid 是 [Logto-USS](https://github.com/nbtca/Logto-USS) 部署出来的自助页面，个人资料与头像、密码与两步验证、绑定的第三方登录都在这里管理。

## 协会对 Logto 做的改动

线上跑的是协会维护的 [nbtca/logto](https://github.com/nbtca/logto) 分支，镜像为 `ghcr.io/nbtca/logto`，相对上游只改了两处，并定期合并上游版本：

- **`groups` 声明**：把用户的角色写进 OIDC 令牌的 `groups` 字段（2025 年 10 月），下游应用据此判断权限，不必再单独调用 Logto 的管理接口；
- **GitHub 登录**：把 GitHub 连接器换取令牌的地址改成 github-oauth.nbtca.space 代理（2025 年 10 月）。

其余两个仓库都是轻度改造的上游项目：Logto-USS 只改了配置和样式，traefik-forward-auth 只升级了依赖。

## 参与开发

这几个仓库都是上游项目的分支，最有价值的贡献是跟进上游：合并新版本、确认协会的改动仍然成立。改 Logto 之前先读上游的[贡献指南](https://github.com/logto-io/logto/blob/master/.github/CONTRIBUTING.md)，本地开发环境按它搭。

想在自己的项目里接入 NBTCA 账号，参考 Home 的做法：用 [@logto/browser](https://docs.logto.io/quick-starts/vanilla-js) 发起登录，把 API 资源设为 `https://api.nbtca.space`，拿到的令牌就能调用 Saturday。新应用需要在 Logto 管理后台登记，找维护者开通。

Logto 分支的主要维护者是 [wen-templari](https://github.com/wen-templari)，`groups` 声明由 [LazuliKao](https://github.com/LazuliKao) 参与完成。

## 相关

其他项目见[基础设施与项目](/about/infrastructure)。
