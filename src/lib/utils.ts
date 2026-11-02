import {
  InteractionResponseType,
  MessageFlags,
  type APIModalSubmitInteraction,
} from "discord-api-types/v10";

export function ephemeral(content: string) {
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: { content, flags: MessageFlags.Ephemeral },
  };
}

export function getModalValue(
  i: APIModalSubmitInteraction,
  customId: string,
): string {
  for (const row of i.data.components as any[]) {
    for (const c of row.components ?? []) {
      if (c.custom_id === customId) return String(c.value ?? "");
    }
  }
  return "";
}
