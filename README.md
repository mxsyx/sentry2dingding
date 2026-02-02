## Made By Kimi AI

```shell
curl "https://sentry2dingding.vercel.app/sentry2dingding?access_token={YOUR_ACCESS_TOKEN}&secret={YOUR_SECRET}"  \ -H 'Content-Type: application/json' \
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
