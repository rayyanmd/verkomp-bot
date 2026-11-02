import setupVerification from "./setup-verification";
import setupRole from "./setup-role";
import setupRules from "./setup-rules";

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
] as const;

export function getCommands() {
  // Return an array of command without execute property, to be used for registering commands with Discord API
  return commands.map(({ execute, ...command }) => command);
}
