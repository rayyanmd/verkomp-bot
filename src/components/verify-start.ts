import {
  ComponentType,
  InteractionResponseType,
  TextInputStyle,
  type APIMessageComponentInteraction,
} from "discord-api-types/v10";
import type { Context } from "hono";
import type { Env } from "../discord";

export default function verifyStart(
  _interaction: APIMessageComponentInteraction,
  c: Context<{ Bindings: Env }>,
) {
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
              placeholder: "Masukin NIM",
            },
          ],
        },
      ],
    },
  });
}
