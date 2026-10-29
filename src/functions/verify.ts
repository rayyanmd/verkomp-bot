import type { APIModalSubmitInteraction } from "discord-api-types/v10";
import { discordApi, editOriginalResponse, type Env } from "../discord";
import { findStudent } from "../utils/students";

async function runVerification(
  env: Env,
  interaction: APIModalSubmitInteraction,
  nim: string,
): Promise<string> {
  const member = interaction.member;
  const guildId = interaction.guild_id;
  if (!member || !guildId)
    return "Verifikasi hanya bisa dilakukan di dalam server.";

  const userId = member.user.id;

  if (member.roles.includes(env.VERIFIED_ROLE_ID)) {
    return "Kamu sudah terverifikasi.";
  }

  const student = await findStudent(env, nim);
  if (!student) {
    return "❌ NIM tidak ditemukan. Pastikan NIM benar, atau hubungi admin jika merasa ini keliru.";
  }

  const kvKey = `nim:${student.student_id}`;
  const owner = await env.VERIFIED.get(kvKey);
  if (owner && owner !== userId) {
    return "❌ NIM ini sudah dipakai oleh akun Discord lain. Hubungi admin jika ini kesalahan.";
  }

  const classRoles: Record<string, string> =
    typeof env.CLASS_ROLES === "string"
      ? JSON.parse(env.CLASS_ROLES)
      : env.CLASS_ROLES;
  const classRoleId = classRoles[student.class];
  if (!classRoleId) {
    console.error(
      `Role untuk kelas "${student.class}" belum diatur di CLASS_ROLES`,
    );
    return `⚠️ Role untuk kelas ${student.class} belum diatur. Hubungi admin.`;
  }

  const reason = `Verifikasi NIM ${student.student_id}`;
  for (const roleId of [env.VERIFIED_ROLE_ID, classRoleId]) {
    await discordApi(
      env,
      `/guilds/${guildId}/members/${userId}/roles/${roleId}`,
      {
        method: "PUT",
        reason,
      },
    );
  }

  await env.VERIFIED.put(kvKey, userId);

  try {
    await discordApi(env, `/channels/${env.WELCOME_CHANNEL_ID}/messages`, {
      method: "POST",
      body: {
        content: `<@${userId}>`,
        allowed_mentions: { users: [userId] },
        embeds: [
          {
            title: "🎉 Selamat Datang!",
            description: `Selamat bergabung di server, **${student.name}**!`,
            color: 0x57f287,
            fields: [
              { name: "Nama Lengkap", value: student.name, inline: true },
              { name: "NIM", value: student.student_id, inline: true },
              { name: "Kelas", value: student.class, inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      },
    });
  } catch (err) {
    console.error("Gagal kirim welcome:", err);
  }

  return `✅ Verifikasi berhasil! Selamat datang, **${student.name}**.`;
}

export async function verifyAndReply(
  env: Env,
  interaction: APIModalSubmitInteraction,
  nim: string,
): Promise<void> {
  let message: string;
  try {
    message = await runVerification(env, interaction, nim);
  } catch (err) {
    console.error("Verifikasi gagal:", err);
    message = "⚠️ Terjadi kesalahan saat verifikasi. Hubungi admin.";
  }
  await editOriginalResponse(
    interaction.application_id,
    interaction.token,
    message,
  );
}
