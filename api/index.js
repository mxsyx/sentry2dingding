// api/index.js
const crypto = require("crypto");
const https = require("https");

// 云函数入口
module.exports = async (req, res) => {
  // 只允许 POST
  if (req.method !== "POST") {
    return res.status(405).json({ code: -1, msg: "Method Not Allowed" });
  }

  // 1. 取 query 参数
  const { access_token, secret } = req.query;
  if (!access_token) {
    return res.status(400).json({ code: -1, msg: "missing access_token" });
  }

  // 2. 取 Sentry 发过来的 JSON
  const sentryBody = await json(req);

  // 3. 拼钉钉 Markdown
  const md = `**【${sentryBody.level?.toUpperCase() || "ERROR"}】${sentryBody.project || ""}**  
> ${sentryBody.message || sentryBody.title || "No message"}  
[查看详情](${sentryBody.url || ""})`;

  const ddPayload = {
    msgtype: "markdown",
    markdown: { title: "Sentry", text: md },
  };

  // 4. 生成加签
  const timestamp = Date.now();
  const sign = secret
    ? encodeURIComponent(
        crypto
          .createHmac("sha256", secret)
          .update(`${timestamp}\n${secret}`)
          .digest("base64"),
      )
    : "";

  // 5. 发钉钉
  const postData = JSON.stringify(ddPayload);
  const options = {
    hostname: "oapi.dingtalk.com",
    port: 443,
    path: `/robot/send?access_token=${access_token}&timestamp=${timestamp}${sign ? "&sign=" + sign : ""}`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
    },
  };

  await new Promise((resolve, reject) => {
    const ddReq = https.request(options, (ddRes) => {
      let body = "";
      ddRes.on("data", (chunk) => (body += chunk));
      ddRes.on("end", () => {
        const r = JSON.parse(body);
        if (r.errcode === 0) resolve();
        else reject(new Error(r.errmsg));
      });
    });
    ddReq.on("error", reject);
    ddReq.write(postData);
    ddReq.end();
  });

  // 6. 告诉 Sentry 成功
  res.json({ code: 0 });
};

// 辅助：把 req 流读成 JSON
function json(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(JSON.parse(body || "{}")));
    req.on("error", reject);
  });
}
