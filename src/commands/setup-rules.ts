import type { APIInteraction } from "discord-api-types/v10";
import type { Context } from "hono";
import { discordApi, type Env } from "../discord";
import { ephemeral } from "../lib/utils";

export default async function setupRules(
  interaction: APIInteraction,
  c: Context<{ Bindings: Env }>,
) {
  const isAdmin = (BigInt(interaction.member?.permissions ?? "0") & 8n) !== 0n;
  if (!isAdmin)
    return c.json(ephemeral("Hanya admin yang bisa memakai command ini."));

  const channelId = interaction.channel?.id;
  if (!channelId) return c.json(ephemeral("Command harus dipakai di channel."));

  await discordApi(c.env, `/channels/${channelId}/messages`, {
    method: "POST",
    body: {
      flags: 32768,
      components: [
        {
          type: 17,
          accent_color: 5793266,
          components: [
            {
              type: 10,
              content: "# 📜 Peraturan Discord Ilkomerz63\nBaca ye.",
            },
            {
              type: 14,
              divider: true,
              spacing: 1,
            },
            {
              type: 10,
              content:
                "### 1. Saling menghormati\nJaga sikap dan gunakan bahasa yang sopan. Dilarang melakukan penghinaan, bullying, provokasi, diskriminasi, atau SARA.",
            },
            {
              type: 10,
              content:
                "### 2. Dilarang spam\nJangan flood chat, mengirim pesan berulang, memakai mention berlebihan, atau mengganggu channel dengan suara dan notifikasi yang tidak perlu.",
            },
            {
              type: 10,
              content:
                "### 3. Konten yang aman\nDilarang mengirim konten NSFW, gore, pornografi, malware, scam, perjudian, atau tautan yang membahayakan anggota lain.",
            },
            {
              type: 10,
              content:
                "### 4. Jaga privasi\nJangan menyebarkan data pribadi, foto, percakapan, atau akun orang lain tanpa izin. Dilarang doxxing dan mengancam anggota lain.",
            },
            {
              type: 10,
              content:
                "### 5. Dilarang SARA\nDilarang mengirim atau membagikan konten yang memicu konflik antar kelompok, termasuk konten yang bersifat provokatif, menyinggung, atau menghina.",
            },
            {
              type: 14,
              divider: true,
              spacing: 1,
            },
            {
              type: 10,
              content: "jangan ngelanggar ye",
            },
          ],
        },
      ],
    },
  });

  return c.json(ephemeral("Panel peraturan berhasil dikirim."));
}
