import type { WeeklyReport } from "@keepet/shared";

// 用 Resend API 寄信（https://resend.com），免費版 3,000 封/月。
// wrangler.toml 需加：RESEND_API_KEY（secret）、FROM_EMAIL（自訂網域或 onboarding@resend.dev 測試）
// 若 RESEND_API_KEY 未設，靜默略過（本地開發不寄信）。

export interface EmailEnv {
  RESEND_API_KEY?: string;
  FROM_EMAIL?: string;
}

/** 產生週報 HTML 信件內容 */
function buildReportHtml(reports: WeeklyReport[], familyName: string): string {
  const weekOf = new Date(reports[0]?.week_start ?? Date.now()).toLocaleDateString("zh-Hant", {
    month: "long",
    day: "numeric",
  });

  const rows = reports
    .map(
      (r) => `
    <tr>
      <td style="padding:12px 8px; font-size:16px">${r.avatar}</td>
      <td style="padding:12px 8px; font-weight:700">${r.child_name}</td>
      <td style="padding:12px 8px; text-align:center">✅ ${r.tasks_approved}</td>
      <td style="padding:12px 8px; text-align:center; color:#22C55E">+${r.points_earned}</td>
      <td style="padding:12px 8px; text-align:center; color:#F97316">-${r.points_spent}</td>
      <td style="padding:12px 8px; text-align:center; font-weight:700">${r.balance}</td>
      <td style="padding:12px 8px; text-align:center">Lv.${r.pet_level}</td>
      <td style="padding:12px 8px; text-align:center">🏅 ${r.achievements_unlocked}</td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FFF7ED;font-family:-apple-system,sans-serif">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;border:1px solid #FDE7CE">
    <div style="background:#F97316;padding:28px 32px;text-align:center">
      <span style="font-size:48px">🐾</span>
      <h1 style="margin:8px 0 4px;color:#fff;font-size:24px">KeePet 週報</h1>
      <p style="margin:0;color:rgba(255,255,255,.85);font-size:15px">${familyName} · ${weekOf}這一週</p>
    </div>
    <div style="padding:28px 32px">
      <p style="color:#6B7280;font-size:15px;margin:0 0 20px">以下是這週每位小朋友的表現，繼續加油！</p>
      <div style="overflow:auto">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="background:#FFF7ED;color:#6B7280">
              <th style="padding:8px;text-align:left" colspan="2">小朋友</th>
              <th style="padding:8px">完成任務</th>
              <th style="padding:8px">賺積分</th>
              <th style="padding:8px">花積分</th>
              <th style="padding:8px">餘額</th>
              <th style="padding:8px">寵物</th>
              <th style="padding:8px">成就</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
    <div style="padding:20px 32px;background:#FFF7ED;text-align:center">
      <p style="margin:0;color:#6B7280;font-size:13px">
        在 KeePet App 可以看到更多細節 ·
        <a href="https://keepet.app/unsubscribe" style="color:#F97316">取消訂閱</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

/** 寄送週報給一位家長。best-effort，失敗只 log 不拋例外。 */
export async function sendWeeklyReport(
  env: EmailEnv,
  to: string,
  familyName: string,
  reports: WeeklyReport[],
): Promise<void> {
  if (!env.RESEND_API_KEY || reports.length === 0) return;
  const from = env.FROM_EMAIL ?? "KeePet <noreply@keepet.app>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `🐾 KeePet 週報 — ${familyName}`,
        html: buildReportHtml(reports, familyName),
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("Resend API error:", res.status, err);
    }
  } catch (err) {
    console.error("sendWeeklyReport failed:", err);
  }
}
