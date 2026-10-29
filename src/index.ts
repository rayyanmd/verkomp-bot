import { Hono } from "hono";
import { verifyKey } from "discord-interactions";
import {
  ButtonStyle,
  ComponentType,
  InteractionResponseType,
  InteractionType,
  MessageFlags,
  TextInputStyle,
  type APIInteraction,
  type APIModalSubmitInteraction,
} from "discord-api-types/v10";
import { discordApi, type Env } from "./discord";
import { verifyAndReply } from "./functions/verify";
import { listStudents } from "./utils/students";

const app = new Hono<{ Bindings: Env }>();

const ephemeral = (content: string) => ({
  type: InteractionResponseType.ChannelMessageWithSource,
  data: { content, flags: MessageFlags.Ephemeral },
});

function getModalValue(i: APIModalSubmitInteraction, customId: string): string {
  for (const row of i.data.components as any[]) {
    for (const c of row.components ?? []) {
      if (c.custom_id === customId) return String(c.value ?? "");
    }
  }
  return "";
}

app.get("/", (c) => c.text("Verkomp Bot Active"));

app.post("/", async (c) => {
  const signature = c.req.header("X-Signature-Ed25519");
  const timestamp = c.req.header("X-Signature-Timestamp");
  const body = await c.req.text();

  if (
    !signature ||
    !timestamp ||
    !(await verifyKey(body, signature, timestamp, c.env.DISCORD_PUBLIC_KEY))
  ) {
    return c.text("Invalid signature", 401);
  }

  const interaction = JSON.parse(body) as APIInteraction;

  switch (interaction.type) {
    case InteractionType.Ping:
      return c.json({ type: InteractionResponseType.Pong });

    case InteractionType.ApplicationCommand: {
      if (interaction.data.name !== "setup-verification") {
        return c.json(ephemeral("Command tidak dikenal."));
      }
      const isAdmin =
        (BigInt(interaction.member?.permissions ?? "0") & 8n) !== 0n;
      if (!isAdmin)
        return c.json(ephemeral("Hanya admin yang bisa memakai command ini."));

      await discordApi(c.env, `/channels/${interaction.channel?.id}/messages`, {
        method: "POST",
        body: {
          embeds: [
            {
              title: "✅ Verifikasi Mahasiswa",
              description:
                "Klik tombol di bawah, lalu masukkan **NIM** kamu untuk mendapatkan akses ke server.",
              color: 0x5865f2,
            },
          ],
          components: [
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.Button,
                  style: ButtonStyle.Success,
                  label: "Verifikasi",
                  custom_id: "verify_start",
                },
              ],
            },
          ],
        },
      });
      return c.json(ephemeral("Panel verifikasi berhasil dikirim."));
    }

    case InteractionType.MessageComponent: {
      if (interaction.data.custom_id !== "verify_start") {
        return c.json(ephemeral("Tombol tidak dikenal."));
      }
      return c.json({
        type: InteractionResponseType.Modal,
        data: {
          custom_id: "verify_modal",
          title: "Verifikasi NIM",
          components: [
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.TextInput,
                  custom_id: "nim",
                  label: "NIM",
                  style: TextInputStyle.Short,
                  min_length: 3,
                  max_length: 20,
                  required: true,
                  placeholder: "Masukkan NIM kamu",
                },
              ],
            },
          ],
        },
      });
    }

    case InteractionType.ModalSubmit: {
      if (interaction.data.custom_id !== "verify_modal") {
        return c.json(ephemeral("Form tidak dikenal."));
      }
      const nim = getModalValue(interaction, "nim");
      c.executionCtx.waitUntil(verifyAndReply(c.env, interaction, nim));
      return c.json({
        type: InteractionResponseType.DeferredChannelMessageWithSource,
        data: { flags: MessageFlags.Ephemeral },
      });
    }

    default:
      return c.text("Unsupported interaction", 400);
  }
});

app.get("/yang-belum-masuk", async (c) => {
  const key = c.req.query("key");
  if (!c.env.ADMIN_SECRET || !key || key !== c.env.ADMIN_SECRET) {
    return c.text("Unauthorized", 401);
  }

  try {
    const students = await listStudents(c.env);
    const unverified = (
      await Promise.all(
        students.map(async (student) => {
          const verified = await c.env.VERIFIED.get(
            `nim:${student.student_id}`,
          );
          return verified ? undefined : student;
        }),
      )
    ).filter((student): student is NonNullable<typeof student> => !!student);

    const byClass = new Map<string, typeof unverified>();
    for (const student of unverified) {
      const studentsInClass = byClass.get(student.class) ?? [];
      studentsInClass.push(student);
      byClass.set(student.class, studentsInClass);
    }

    const lines = [...byClass.entries()]
      .sort(([classA], [classB]) => classA.localeCompare(classB))
      .flatMap(([className, studentsInClass]) => [
        `Kelas ${className}`,
        ...studentsInClass.map(
          (student) => `${student.student_id} - ${student.name}`,
        ),
        "",
      ]);

    return c.text(
      lines.length > 0
        ? lines.join("\n").trimEnd()
        : "Semua mahasiswa sudah terverifikasi.",
    );
  } catch (err) {
    console.error("Gagal mengambil daftar mahasiswa yang belum masuk:", err);
    return c.text("Terjadi kesalahan saat mengambil daftar mahasiswa.", 500);
  }
});

export default app;
