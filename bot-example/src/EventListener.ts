import {
  Discord,
  CommandMessage,
  Command,
  Description,
  On,
  ArgsOf,
  Guard,
} from "../../src";
import { GuardListener } from "./Guard";
import axios, { AxiosResponse } from "axios";
import { MessageEmbed } from "discord.js";

@Discord("!")
@Description("Meme bot")
export abstract class EventListener {
  @Command("ping")
  @Guard(GuardListener)
  ping(command: CommandMessage): void {
    command.reply("pong!");
  }

  @Command("sendmeme")
  async meme(command: CommandMessage): Promise<void> {
    try {
      const memesResult = (await axios.get(
        "https://meme-api.herokuapp.com/gimme/1"
      )) as AxiosResponse;
      const memes = memesResult.data.memes;
      const memeUrl = memes[0]?.url;

      command.author.send("Here is your meme", {
        files: [memeUrl],
      });
    } catch (e) {
      command.author.send(`Sorry, I couldn't get the meme`);
    }
  }

  @On("ready")
  initialize(): void {
    console.log("Bot logged in.");
  }

  @On("message")
  @Guard(GuardListener)
  recievedMessage([message]: ArgsOf<"message">): void {
    const embed = new MessageEmbed()
      .setTitle("Got new message")
      .setColor("#3EB595")
      .addField("Author", message.author, true)
      .addField("at", new Date(message.createdTimestamp), true)
      .setFooter(`Message ID: ${message.id} | Author ID: ${message.author.id}`);
    message.channel.send({ embed });
  }

  @On("messageDelete")
  @Guard(GuardListener)
  async messageDeleted([message]: ArgsOf<"messageDelete">): Promise<void> {
    const logs = await message.guild.fetchAuditLogs({ type: 72 });
    const entry = logs.entries.first();
    message.channel.send(`${message.content} was deleted by ${entry.executor}`);
  }
}
