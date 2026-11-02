import verifyStart from "./verify-start";
import roleSelect from "./role-select";

export const components = [
  {
    customId: "verify_start",
    execute: verifyStart,
  },
  {
    customId: "role_select",
    execute: roleSelect,
  },
] as const;
