import { Context, Hono } from "hono";
import { verifyKey } from "discord-interactions";
import {
  InteractionResponseType,
  InteractionType,
  type APIInteraction,
} from "discord-api-types/v10";
import { type Env } from "./discord";
import { listStudents, saveStudents, type Student } from "./lib/students";
import { ephemeral } from "./lib/utils";
import { commands } from "./commands/index";
import { components } from "./components/index";
import { modals } from "./modals/index";
import studentsPage from "./pages/students.html";

const app = new Hono<{ Bindings: Env }>();

function isAdminRequest(c: Context<{ Bindings: Env }>): boolean {
  const key = c.req.query("key");
  return Boolean(c.env.ADMIN_SECRET && key && key === c.env.ADMIN_SECRET);
}

async function readStudent(c: Context<{ Bindings: Env }>): Promise<Student> {
  const body = await c.req.json<Partial<Student>>();
  const student = {
    student_id: String(body.student_id ?? "").trim(),
    name: String(body.name ?? "").trim(),
    class: String(body.class ?? "").trim(),
  };
  if (!student.student_id || !student.name || !student.class) {
    throw new Error("NIM, nama, dan kelas wajib diisi.");
  }
  return student;
}

app.get("/", (c) => c.text("Verkomp Bot Active"));

app.get("/students", (c) => {
  if (!isAdminRequest(c)) return c.text("Unauthorized", 401);
  return c.html(studentsPage);
});

app.get("/students/api", async (c) => {
  if (!isAdminRequest(c)) return c.json({ error: "Unauthorized" }, 401);
  try {
    return c.json(await listStudents(c.env));
  } catch (error) {
    console.error("Gagal mengambil data mahasiswa:", error);
    return c.json({ error: "Data mahasiswa belum tersedia." }, 500);
  }
});

app.post("/students/api", async (c) => {
  if (!isAdminRequest(c)) return c.json({ error: "Unauthorized" }, 401);
  try {
    const student = await readStudent(c);
    const students = await listStudents(c.env);
    if (students.some((item) => item.student_id === student.student_id)) {
      return c.json({ error: "NIM sudah terdaftar." }, 409);
    }
    await saveStudents(c.env, [...students, student]);
    return c.json(student, 201);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Data tidak valid.";
    return c.json({ error: message }, 400);
  }
});

app.put("/students/api", async (c) => {
  if (!isAdminRequest(c)) return c.json({ error: "Unauthorized" }, 401);
  const originalId = c.req.query("student_id")?.trim();
  if (!originalId) return c.json({ error: "NIM lama wajib diisi." }, 400);
  try {
    const student = await readStudent(c);
    const students = await listStudents(c.env);
    const index = students.findIndex((item) => item.student_id === originalId);
    if (index < 0) return c.json({ error: "Mahasiswa tidak ditemukan." }, 404);
    if (
      student.student_id !== originalId &&
      students.some((item) => item.student_id === student.student_id)
    ) {
      return c.json({ error: "NIM baru sudah terdaftar." }, 409);
    }
    students[index] = student;
    await saveStudents(c.env, students);
    return c.json(student);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Data tidak valid.";
    return c.json({ error: message }, 400);
  }
});

app.delete("/students/api", async (c) => {
  if (!isAdminRequest(c)) return c.json({ error: "Unauthorized" }, 401);
  const studentId = c.req.query("student_id")?.trim();
  if (!studentId) return c.json({ error: "NIM wajib diisi." }, 400);
  try {
    const students = await listStudents(c.env);
    const remaining = students.filter(
      (student) => student.student_id !== studentId,
    );
    if (remaining.length === students.length) {
      return c.json({ error: "Mahasiswa tidak ditemukan." }, 404);
    }
    await saveStudents(c.env, remaining);
    return c.json({ ok: true });
  } catch (error) {
    console.error("Gagal menghapus data mahasiswa:", error);
    return c.json({ error: "Data gagal dihapus." }, 500);
  }
});

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
