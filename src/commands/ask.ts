import {
  InteractionResponseType,
  MessageFlags,
  type APIInteraction,
} from "discord-api-types/v10";
import type { Context } from "hono";
import {
  createFollowupMessage,
  editOriginalResponse,
  type Env,
} from "../discord";
import { askLLM } from "../lib/llm";
import { ephemeral, splitMessage } from "../lib/utils";

async function handleAsk(
  env: Env,
  interaction: APIInteraction,
  question: string,
): Promise<void> {
  const appId = interaction.application_id;
  const token = interaction.token;

  try {
    const reply = await askLLM(env, question);

    const quotedQuestion = question
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
    const formatted = `💬 **Pertanyaan:**\n${quotedQuestion}\n\n🤖 **Jawaban:**\n${reply}`;

    const chunks = splitMessage(formatted);

    await editOriginalResponse(appId, token, chunks[0]);

    for (let i = 1; i < chunks.length; i++) {
      await createFollowupMessage(appId, token, chunks[i]);
    }
  } catch (err) {
    console.error("Error executing /ask command:", err);
    const message =
      err instanceof Error ? err.message : "Terjadi kesalahan pada AI chatbot.";
    try {
      await editOriginalResponse(
        appId,
        token,
        `⚠️ **Gagal mendapatkan respon dari AI:**\n${message}`,
      );
    } catch (editErr) {
      console.error("Failed to send error response to Discord:", editErr);
    }
  }
}

export default async function ask(
  interaction: APIInteraction,
  c: Context<{ Bindings: Env }>,
) {
  const commandData = interaction.data;
  const options =
    commandData && "options" in commandData ? commandData.options : [];

  const questionOption = options?.find((opt) => opt.name === "question");
  const privateOption = options?.find((opt) => opt.name === "private");

  const question =
    questionOption &&
    "value" in questionOption &&
    typeof questionOption.value === "string"
      ? questionOption.value.trim()
      : "";

  const isPrivate =
    privateOption &&
    "value" in privateOption &&
    typeof privateOption.value === "boolean"
      ? privateOption.value
      : false;

  if (!question) {
    return c.json(ephemeral("Silakan masukkan pertanyaan kamu terlebih dahulu."));
  }

  const promise = handleAsk(c.env, interaction, question);
  if (c.executionCtx?.waitUntil) {
    c.executionCtx.waitUntil(promise);
  } else {
    promise.catch(console.error);
  }

  return c.json({
    type: InteractionResponseType.DeferredChannelMessageWithSource,
    data: isPrivate ? { flags: MessageFlags.Ephemeral } : {},
  });
}
