import type {
  APIMessageComponentInteraction,
  APIMessageStringSelectInteractionData,
} from "discord-api-types/v10";
import { InteractionResponseType, MessageFlags } from "discord-api-types/v10";
import type { Context } from "hono";
import { discordApi, type Env } from "../discord";
import { ephemeral } from "../lib/utils";

export default async function roleSelect(
  interaction: APIMessageComponentInteraction,
  c: Context<{ Bindings: Env }>,
) {
  const values = (interaction.data as APIMessageStringSelectInteractionData)
    .values;
  const userId = interaction.member?.user.id ?? interaction.user?.id;
  const guildId = interaction.guild_id;

  if (!userId || !guildId) {
    return c.json(ephemeral("Role tidak bisa diperbarui di sini."));
  }

  const configuredRoles = Object.entries(c.env.ROLES);
  const roleIds = configuredRoles.map(([, role]) => role.id);
  const selectedRoleIds = new Set(values);
  if (values.some((roleId) => !roleIds.includes(roleId))) {
    return c.json(ephemeral("Role tidak valid."));
  }

  try {
    const memberResponse = await discordApi(
      c.env,
      `/guilds/${guildId}/members/${userId}`,
    );
    const member = (await memberResponse.json()) as { roles: string[] };
    const currentRoleIds = new Set(member.roles);
    const addedRoleIds = roleIds.filter(
      (roleId) => selectedRoleIds.has(roleId) && !currentRoleIds.has(roleId),
    );
    const removedRoleIds = roleIds.filter(
      (roleId) => !selectedRoleIds.has(roleId) && currentRoleIds.has(roleId),
    );

    await Promise.all(
      [...addedRoleIds, ...removedRoleIds].map((roleId) =>
        discordApi(
          c.env,
          `/guilds/${guildId}/members/${userId}/roles/${roleId}`,
          {
            method: selectedRoleIds.has(roleId) ? "PUT" : "DELETE",
            reason: selectedRoleIds.has(roleId)
              ? "Role dipilih melalui panel role"
              : "Role dihapus melalui panel role",
          },
        ),
      ),
    );

    const roleName = (roleId: string) => `<@&${roleId}>`;
    const formatRoles = (roleIds: string[]) =>
      roleIds.length > 0 ? roleIds.map(roleName).join(", ") : "Tidak ada";

    return c.json({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        embeds: [
          {
            title: "Role berhasil diperbarui",
            color: 5793266,
            fields: [
              {
                name: "Role ditambahkan",
                value: formatRoles(addedRoleIds),
                inline: false,
              },
              {
                name: "Role dihapus",
                value: formatRoles(removedRoleIds),
                inline: false,
              },
            ],
          },
        ],
      },
    });
  } catch (error) {
    console.error("Gagal memperbarui role:", error);
    return c.json(ephemeral("Role gagal diperbarui."));
  }
}
