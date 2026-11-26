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

export function splitMessage(text: string, maxLength = 1950): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    let splitIndex = remaining.lastIndexOf("\n\n", maxLength);
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      splitIndex = remaining.lastIndexOf("\n", maxLength);
    }
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      splitIndex = remaining.lastIndexOf(" ", maxLength);
    }
    if (splitIndex === -1) {
      splitIndex = maxLength;
    }

    chunks.push(remaining.substring(0, splitIndex).trimEnd());
    remaining = remaining.substring(splitIndex).trimStart();
  }

  return chunks;
}
