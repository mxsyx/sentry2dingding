const crypto = require("crypto");
const https = require("https");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ code: -1, msg: "Method Not Allowed" });
  }

  try {
    const query = req.query || {};
    const accessToken = query.access_token;
    const secret = query.secret;
    const githubSecret =
      query.github_secret || process.env.GITHUB_WEBHOOK_SECRET;
    const { at } = query;

    if (!accessToken) {
      return res.status(400).json({ code: -1, msg: "missing access_token" });
    }

    const rawBody = await readBody(req);
    if (
      githubSecret &&
      !verifyGitHubSignature(
        rawBody,
        req.headers["x-hub-signature-256"],
        githubSecret,
      )
    ) {
      return res
        .status(401)
        .json({ code: -1, msg: "invalid GitHub signature" });
    }

    let body;
    try {
      body = JSON.parse(rawBody || "{}");
    } catch {
      return res.status(400).json({ code: -1, msg: "invalid JSON body" });
    }

    const event = req.headers["x-github-event"];
    const run = body.workflow_run || {};
    const shouldNotify =
      event === "workflow_run" &&
      body.action === "completed" &&
      ["success", "failure"].includes(run.conclusion);

    if (!shouldNotify) {
      return res.json({ code: 0, skipped: true });
    }

    const succeeded = run.conclusion === "success";
    const status = succeeded ? "成功" : "失败";
    const icon = succeeded ? "✅" : "❌";
    const color = succeeded ? "#008000" : "#FF0000";
    const repository = body.repository?.full_name || "N/A";
    const workflow = run.name || run.workflow?.name || "GitHub Actions";
    const branch = run.head_branch || "N/A";
    const sha = run.head_sha ? run.head_sha.slice(0, 7) : "N/A";
    const commitUrl =
      run.head_sha && body.repository?.html_url
        ? `${body.repository.html_url}/commit/${run.head_sha}`
        : "";
    const actor = run.actor?.login || run.triggering_actor?.login || "N/A";
    const runUrl = run.html_url || body.repository?.html_url || "";
    const duration = formatDuration(run.run_started_at, run.updated_at);
    const title = `${icon} ${repository} / ${workflow} ${status}`;

    const lines = [
      `## ${escapeMarkdown(title)}`,
      "",
      `- **仓库**：${escapeMarkdown(repository)}  `,
      `- **工作流**：${escapeMarkdown(workflow)}  `,
      `- **状态**：<font color="${color}">${status}</font>  `,
      `- **分支**：${escapeMarkdown(branch)}  `,
      `- **提交**：${commitUrl ? `[${escapeMarkdown(sha)}](${commitUrl})` : escapeMarkdown(sha)}  `,
      `- **触发者**：${escapeMarkdown(actor)}  `,
    ];

    if (duration) {
      lines.push(`- **耗时**：${duration}  `);
    }
    if (runUrl) {
      lines.push("", `[🔗 查看运行详情](${runUrl})`);
    }

    const dingTalkPayload = {
      msgtype: "markdown",
      markdown: { title, text: lines.join("\n") },
    };

    if (at && /^1\d{10}$/.test(at)) {
      dingTalkPayload.at = { atMobiles: [at], isAtAll: false };
    }

    await postToDingTalk(accessToken, secret, dingTalkPayload);
    return res.json({ code: 0 });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ code: -1, msg: error.message });
  }
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function verifyGitHubSignature(rawBody, signature, secret) {
  if (!signature || !signature.startsWith("sha256=")) {
    return false;
  }

  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")}`;
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function formatDuration(startedAt, completedAt) {
  const started = Date.parse(startedAt);
  const completed = Date.parse(completedAt);
  if (
    !Number.isFinite(started) ||
    !Number.isFinite(completed) ||
    completed < started
  ) {
    return "";
  }

  const totalSeconds = Math.round((completed - started) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes} 分 ${seconds} 秒` : `${seconds} 秒`;
}

function escapeMarkdown(value) {
  return String(value).replace(/([\\`*_{}\[\]()#+.!|>-])/g, "\\$1");
}

function postToDingTalk(accessToken, secret, data) {
  const url = new URL("https://oapi.dingtalk.com/robot/send");
  url.searchParams.set("access_token", accessToken);

  if (secret) {
    const timestamp = Date.now();
    const sign = crypto
      .createHmac("sha256", secret)
      .update(`${timestamp}\n${secret}`)
      .digest("base64");
    url.searchParams.set("timestamp", timestamp);
    url.searchParams.set("sign", sign);
  }

  return new Promise((resolve, reject) => {
    const request = https.request(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      (response) => {
        let responseBody = "";
        response.on("data", (chunk) => (responseBody += chunk));
        response.on("end", () => {
          let result;
          try {
            result = JSON.parse(responseBody);
          } catch {
            reject(new Error(`invalid DingTalk response: ${responseBody}`));
            return;
          }

          if (result.errcode === 0) {
            resolve();
          } else {
            reject(new Error(result.errmsg || "DingTalk request failed"));
          }
        });
      },
    );

    request.on("error", reject);
    request.write(JSON.stringify(data));
    request.end();
  });
}
