import {
  InteractionResponseType,
  MessageFlags,
  type APIModalSubmitInteraction,
} from "discord-api-types/v10";
import type { Context } from "hono";
import type { Env } from "../discord";
import { verifyAndReply } from "../lib/verify";
import { getModalValue } from "../lib/utils";

export default function verifyModal(
  interaction: APIModalSubmitInteraction,
  c: Context<{ Bindings: Env }>,
) {
  const nim = getModalValue(interaction, "nim");
  c.executionCtx.waitUntil(verifyAndReply(c.env, interaction, nim));
  return c.json({
    type: InteractionResponseType.DeferredChannelMessageWithSource,
    data: { flags: MessageFlags.Ephemeral },
  });
}
