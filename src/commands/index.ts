import setupVerification from "./setup-verification";
import setupRole from "./setup-role";
import setupRules from "./setup-rules";
import whoIs from "./who-is";
import { ApplicationCommandOptionType } from "discord-api-types/v10";

export const commands = [
  {
    name: "setup-verification",
    description: "Kirim panel verifikasi ke channel ini (khusus admin)",
    default_member_permissions: "8", // Administrator
    dm_permission: false,
    execute: setupVerification,
  },
  {
    name: "setup-role",
    description: "Kirim panel pilih role ke channel ini (khusus admin)",
    default_member_permissions: "8", // Administrator
    dm_permission: false,
    execute: setupRole,
  },
  {
    name: "setup-rules",
    description: "Kirim peraturan server ke channel ini (khusus admin)",
    default_member_permissions: "8", // Administrator
    dm_permission: false,
    execute: setupRules,
  },
  {
    name: "who-is",
    description: "Tampilkan nama dan kelas user yang terverifikasi",
    options: [
      {
        name: "user",
        description: "User Discord yang ingin dicari",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
    ],
    execute: whoIs,
  },
] as const;

export function getCommands() {
  // Return an array of command without execute property, to be used for registering commands with Discord API
  return commands.map(({ execute, ...command }) => command);
}
