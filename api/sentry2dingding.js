// api/sentry2ding.js
const crypto = require("crypto");
const https = require("https");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ code: -1, msg: "Method Not Allowed" });
  }

  const { access_token, secret, at } = req.query;
  if (!access_token) {
    return res.status(400).json({ code: -1, msg: "missing access_token" });
  }

  const body = await json(req); // 整个 Sentry JSON
  const ev = body.data?.event || {};
  const ex = ev.exception?.values?.[0] || {};
  console.log(JSON.stringify(body));

  // 1. 关键信息
  const title = ev.title || ev.message || "Sentry Alert";
  const webUrl = ev.web_url || ev.url || "";
  const culprit = ev.culprit || ev.location || "";
  const level = ev.level || "error";
  const proj = ev.project?.name || ev.project || "";

  // 2. 用户维度
  const user = ev.user || {};
  const userInfo = user.id || user.email || user.ip_address || "N/A";

  // 3. 标签维度
  const tags = Object.fromEntries(ev.tags || []);
  const browser = tags.browser || "";
  const os = tags["os.name"] || tags.os || "";

  // 4. 异常类型+消息
  const exType = ex.type || "";
  const exMsg = ex.value || "";
  const exLine = exType && exMsg ? `**${exType}**: ${exMsg}\n` : "";

  // 5. 钉钉 Markdown
  const md = `## 🚨 ${title}
${exLine}
- **项目**：${proj}  
- **级别**：<font color="#FF0000">${level.toUpperCase()}</font>  
- **用户**：${userInfo}  
- **位置**：${culprit}  
- **浏览器**：${browser}  
- **系统**：${os}  

[🔗 查看详情](${webUrl})`;

  // 6. 拼钉钉 payload
  const ddPayload = {
    msgtype: "markdown",
    markdown: { title, text: md },
  };
  if (at && /^1\d{10}$/.test(at)) {
    ddPayload.at = { atMobiles: [at], isAtAll: false };
  }

  // 7. 加签
  const ts = Date.now();
  const sign = secret
    ? encodeURIComponent(
        crypto
          .createHmac("sha256", secret)
          .update(`${ts}\n${secret}`)
          .digest("base64"),
      )
    : "";

  // 8. 发钉钉
  await post(
    `https://oapi.dingtalk.com/robot/send?access_token=${access_token}&timestamp=${ts}${sign ? "&sign=" + sign : ""}`,
    ddPayload,
  );

  res.json({ code: 0 });
};

/* ---------- 工具函数 ---------- */
function json(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => resolve(JSON.parse(body || "{}")));
    req.on("error", reject);
  });
}

function post(url, data) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opt = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: "POST",
      headers: { "Content-Type": "application/json" },
    };
    const req = https.request(opt, (res) => {
      let b = "";
      res.on("data", (c) => (b += c));
      res.on("end", () => {
        const r = JSON.parse(b);
        r.errcode === 0 ? resolve() : reject(new Error(r.errmsg));
      });
    });
    req.on("error", reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}
