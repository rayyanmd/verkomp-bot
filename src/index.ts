import { Hono } from "hono";
import { verifyKey } from "discord-interactions";
import {
  InteractionResponseType,
  InteractionType,
  type APIInteraction,
} from "discord-api-types/v10";
import { type Env } from "./discord";
import { listStudents } from "./lib/students";
import { ephemeral } from "./lib/utils";
import { commands } from "./commands/index";
import { components } from "./components/index";
import { modals } from "./modals/index";

const app = new Hono<{ Bindings: Env }>();

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
      const command = commands.find(
        (cmd) => cmd.name === interaction.data.name,
      );
      if (!command) return c.json(ephemeral("Command tidak dikenal."));

      return command.execute(interaction, c);
    }

    case InteractionType.MessageComponent: {
      const component = components.find(
        (handler) => handler.customId === interaction.data.custom_id,
      );
      if (!component) return c.json(ephemeral("Tombol tidak dikenal."));

      return component.execute(interaction, c);
    }

    case InteractionType.ModalSubmit: {
      const modal = modals.find(
        (handler) => handler.customId === interaction.data.custom_id,
      );
      if (!modal) return c.json(ephemeral("Form tidak dikenal."));

      return modal.execute(interaction, c);
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
