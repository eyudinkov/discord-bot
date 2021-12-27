import { ClientOptions as DiscordJSClientOptions } from "discord.js";
import { LoadClass } from "./LoadClass";

export interface ClientOptions extends DiscordJSClientOptions {
  silent?: boolean;
  classes: LoadClass[];
  variablesChar: string;
}
