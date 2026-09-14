# sentry2dingding / github2dingding

将 Sentry 告警或 GitHub Actions 工作流运行结果推送到钉钉群机器人。

## GitHub Actions 工作流通知

接口只会转发 GitHub `workflow_run` 事件中已完成且结论为 `success` 或 `failure` 的运行，其他事件会返回成功并跳过。

### 1. 配置 GitHub Webhook

在 GitHub 仓库的 **Settings → Webhooks → Add webhook** 中填写：

- **Payload URL**：`https://sentry2dingding.vercel.app/github2dingding`
- **Content type**：`application/json`
- **Secret**：与 Vercel 环境变量 `GITHUB_WEBHOOK_SECRET` 保持一致
- **Which events**：选择 **Let me select individual events**，仅勾选 **Workflow runs**

推荐在 Vercel 项目中配置以下环境变量：

- `DINGTALK_ACCESS_TOKEN`：必填，钉钉自定义机器人的 access token
- `DINGTALK_SECRET`：选填，钉钉机器人加签密钥
- `GITHUB_WEBHOOK_SECRET`：推荐填写，GitHub Webhook 验签密钥

也可以通过 URL 查询参数配置，适合一个部署连接多个钉钉群；未配置对应环境变量时再填写：

- `access_token`：钉钉自定义机器人的 access token
- `secret`：选填，钉钉机器人加签密钥
- `github_secret`：推荐填写，GitHub Webhook 验签密钥；填写后必须同时在 GitHub Webhook 中配置相同值
- `at`：选填，需要 @ 的手机号，例如 `13800138000`

查询参数优先于环境变量。URL 中的参数请进行 URL 编码；生产环境优先使用环境变量保存密钥。

### 2. 本地请求示例

未配置 `github_secret` 时，可以用下面的请求测试：

```shell
curl "https://sentry2dingding.vercel.app/github2dingding?access_token={YOUR_ACCESS_TOKEN}&secret={YOUR_DINGTALK_SECRET}" \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: workflow_run" \
  -d '{
    "action": "completed",
    "repository": {
      "full_name": "octo-org/example",
      "html_url": "https://github.com/octo-org/example"
    },
    "workflow_run": {
      "name": "CI",
      "conclusion": "success",
      "head_branch": "main",
      "head_sha": "0123456789abcdef",
      "run_started_at": "2026-09-14T08:00:00Z",
      "updated_at": "2026-09-14T08:02:05Z",
      "html_url": "https://github.com/octo-org/example/actions/runs/123",
      "actor": { "login": "octocat" }
    }
  }'
```

## Sentry 告警通知

```shell
curl "https://sentry2dingding.vercel.app/sentry2dingding?access_token={YOUR_ACCESS_TOKEN}&secret={YOUR_SECRET}" \
  -H 'Content-Type: application/json' \
  -d '{
  "action": "triggered",
  "installation": {
    "uuid": "00000000-0000-0000-0000-000000000000"
  },
  "data": {
    "event": {
      "event_id": "00000000000000000000000000000000",
      "project": 1234567890123456,
      "release": null,
      "dist": null,
      "platform": "other",
      "message": "This is an example exception",
      "datetime": "2026-02-02T06:06:01.944000Z",
      "tags": [
        ["browser", "Chrome 99.0.0000"],
        ["browser.name", "Chrome"],
        ["client_os", "Windows 10"],
        ["client_os.name", "Windows"],
        ["level", "error"],
        ["os", "Mac OS X 10.15.0"],
        ["os.name", "Mac OS X"],
        ["sample_event", "yes"],
        ["user", "id:0"],
        ["url", "http://example.com/path"]
      ],
      "culprit": "path/to/file.js in poll",
      "exception": {
        "values": [{
          "type": "TypeError",
          "value": "Object has no method 'updateFrom'",
          "stacktrace": {
            "frames": [{
              "filename": "path/to/file.js",
              "function": "poll",
              "lineno": 389,
              "colno": 46,
              "in_app": true
            }]
          }
        }]
      },
      "request": {
        "method": "GET",
        "url": "http://example.com/path",
        "headers": [
          ["Content-Type", "application/json"],
          ["Referer", "http://example.com"],
          ["User-Agent", "Mozilla/5.0"]
        ],
        "cookies": [["foo", "bar"], ["biz", "baz"]],
        "data": { "hello": "world" },
        "env": { "ENV": "prod" },
        "query_string": [["foo", "bar"]]
      },
      "user": {
        "id": "0",
        "email": "user@example.com",
        "ip_address": "127.0.0.1",
        "sentry_user": "id:0"
      },
      "title": "TypeError: Object has no method 'updateFrom'",
      "web_url": "https://sentry.io/organizations/demo-org/issues/1234567890/events/00000000000000000000000000000000/",
      "issue_id": "1234567890"
    },
    "triggered_rule": "Error Monitor"
  },
  "actor": {
    "type": "application",
    "id": "sentry",
    "name": "Sentry"
  }
}'
```
