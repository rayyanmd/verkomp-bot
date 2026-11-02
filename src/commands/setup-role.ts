import type { APIInteraction } from "discord-api-types/v10";
import type { Context } from "hono";
import { discordApi, type Env } from "../discord";
import { ephemeral } from "../lib/utils";

export default async function setupRole(
  interaction: APIInteraction,
  c: Context<{ Bindings: Env }>,
) {
  const isAdmin = (BigInt(interaction.member?.permissions ?? "0") & 8n) !== 0n;
  if (!isAdmin)
    return c.json(ephemeral("Hanya admin yang bisa memakai command ini."));

  const roles = Object.entries(c.env.ROLES);
  const channelId = interaction.channel?.id;
  if (!channelId) return c.json(ephemeral("Command harus dipakai di channel."));

  await discordApi(c.env, `/channels/${channelId}/messages`, {
    method: "POST",
    body: {
      flags: 32768,
      components: [
        {
          type: 17,
          components: [
            {
              type: 10,
              content:
                "## Pilih Role\nPilih role yang ingin kamu ambil dari daftar di bawah.",
            },
            {
              type: 14,
              divider: true,
              spacing: 1,
            },
            {
              type: 1,
              components: [
                {
                  type: 3,
                  custom_id: "role_select",
                  placeholder: "Pilih role",
                  min_values: 0,
                  max_values: roles.length,
                  options: roles.map(([name, role]) => ({
                    label: name,
                    value: role.id,
                    description: `Ambil role ${name}`,
                    emoji: {
                      id: role.emoji,
                    },
                  })),
                },
              ],
            },
          ],
        },
      ],
    },
  });

  return c.json(ephemeral("Panel role berhasil dikirim."));
}
