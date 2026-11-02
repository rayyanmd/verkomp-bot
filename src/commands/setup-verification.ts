import { APIInteraction } from "discord-api-types/v10";
import { discordApi, Env } from "../discord";
import { Context } from "hono";
import { ephemeral } from "../lib/utils";

export default async function setupVerificationCommand(
  interaction: APIInteraction,
  c: Context<{ Bindings: Env }>,
) {
  const isAdmin = (BigInt(interaction.member?.permissions ?? "0") & 8n) !== 0n;
  if (!isAdmin)
    return c.json(ephemeral("Hanya admin yang bisa memakai command ini."));

  await discordApi(c.env, `/channels/${interaction.channel?.id}/messages`, {
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
              content: "# Selamat Datang 😚\ndi server **ILKOMERrZZ'63!!**",
            },
            {
              type: 14,
              divider: true,
              spacing: 1,
            },
            {
              type: 9,
              components: [
                {
                  type: 10,
                  content:
                    "###  Verifikasi\nKlik tombol verifikasi dulu blay, masukin **NIM** lu buat masuk.\n\n",
                },
              ],
              accessory: {
                type: 2,
                style: 3,
                label: "Verifikasi",
                emoji: {
                  name: "☑️",
                  animated: false,
                },
                custom_id: "verify_start",
              },
            },
            {
              type: 14,
              divider: true,
              spacing: 2,
            },
            {
              type: 10,
              content: "__‼️ **JANGAN MENGGUNAKAN NIM ORANG LAIN** ‼️__",
            },
          ],
        },
      ],
    },
  });
  return c.json(ephemeral("Panel verifikasi berhasil dikirim."));
}
