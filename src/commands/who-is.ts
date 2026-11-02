import {
  InteractionResponseType,
  type APIInteraction,
} from "discord-api-types/v10";
import type { Context } from "hono";
import { type Env } from "../discord";
import { listStudents } from "../lib/students";

function embedResponse(title: string, description: string, color = 5793266) {
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      embeds: [{ title, description, color }],
    },
  };
}

export default async function whoIs(
  interaction: APIInteraction,
  c: Context<{ Bindings: Env }>,
) {
  const commandData = interaction.data;
  const userOption =
    commandData && "options" in commandData
      ? commandData.options?.find((option) => option.name === "user")
      : undefined;
  const targetUserId =
    userOption && "value" in userOption && typeof userOption.value === "string"
      ? userOption.value
      : undefined;

  if (!targetUserId) {
    return c.json(
      embedResponse(
        "User tidak ditemukan",
        "Pilih user Discord terlebih dahulu.",
        0xed4245,
      ),
    );
  }

  try {
    const students = await listStudents(c.env);
    const matches = await Promise.all(
      students.map(async (student) => ({
        student,
        userId: await c.env.VERIFIED.get(`nim:${student.student_id}`),
      })),
    );
    const student = matches.find(
      (match) => match.userId === targetUserId,
    )?.student;

    if (!student) {
      return c.json(
        embedResponse(
          "User belum terverifikasi",
          `<@${targetUserId}> belum memiliki data verifikasi.`,
          0xed4245,
        ),
      );
    }

    return c.json(
      embedResponse(
        "Data mahasiswa",
        `<@${targetUserId}> terdaftar sebagai **${student.name}** dari kelas **${student.class}**.`,
      ),
    );
  } catch (error) {
    console.error("Gagal mencari data user:", error);
    return c.json(
      embedResponse(
        "Terjadi kesalahan",
        "Data user tidak dapat dicari sekarang.",
        0xed4245,
      ),
    );
  }
}
