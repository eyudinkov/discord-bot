import { ClientEvents } from "discord.js";
import { CommandMessage } from "../..";

type DiscordEvents = ClientEvents & { commandMessage: [CommandMessage] };

export type ArgsOf<K extends keyof DiscordEvents> = DiscordEvents[K];
