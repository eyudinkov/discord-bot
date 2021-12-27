import { Client as ClientJS } from "discord.js";
import * as Glob from "glob";
import {
  MetadataStorage,
  LoadClass,
  ClientOptions,
  DiscordEvents,
  CommandInfos,
  InfosType,
  CommandNotFoundInfos,
  EventInfos,
  DiscordInfos,
  DOn
} from ".";

export class Client extends ClientJS {
  private static _variablesChar: string;
  private static _variablesExpression: RegExp;
  private _silent: boolean;
  private _loadClasses: LoadClass[];

  static get variablesChar() {
    return this._variablesChar;
  }

  static get variablesExpression() {
    return this._variablesExpression;
  }

  get silent() {
    return this._silent;
  }
  set silent(value: boolean) {
    this._silent = value;
  }

  constructor(options?: ClientOptions) {
    super(options);

    this._silent = !!options?.silent;
    this._loadClasses = options?.classes || [];

    Client._variablesChar = options?.variablesChar || ":";
    Client._variablesExpression = new RegExp(`\\s{1,}${Client._variablesChar}\\w*`, "g");
  }

  static getCommands<Type extends InfosType = any>(): CommandInfos<Type>[] {
    return MetadataStorage.instance.commands.map<CommandInfos<Type>>((c) => c.commandInfos);
  }

  static getEvent(): EventInfos[] {
    return MetadataStorage.instance.events.map<EventInfos>((event) => {
      return {
        event: event.event,
        once: event.once,
        linkedInstance: event.linkedDiscord
      };
    });
  }

  static getDiscords<Type extends InfosType = any>(): DiscordInfos<Type>[] {
    return MetadataStorage.instance.discords.map<DiscordInfos<Type>>((d) => d.discordInfos);
  }

  static getCommandsNotFound<Type extends InfosType = any>(): CommandNotFoundInfos<Type>[] {
    return MetadataStorage.instance.commandsNotFound.map<CommandNotFoundInfos<Type>>((c) => {
      return {
        infos: c.infos as InfosType<Type>,
        prefix: c.linkedDiscord.prefix,
        description: c.infos.description
      };
    });
  }

  login(token: string, ...loadClasses: LoadClass[]) {
    if (loadClasses.length > 0) {
      this._loadClasses = loadClasses;
    }

    this.build();

    MetadataStorage.instance.events.map((event) => {
      if (!this.silent) {
        let eventName = event.event;
        console.log(`${eventName}: ${event.classRef.name}.${event.key}`);
      }
    });

    const usedEvents = (
      MetadataStorage.instance.events
      .reduce<DOn[]>((prev, event, index) => {
        const found = MetadataStorage.instance.events.find((event2) => event.event === event2.event);
        const foundIndex = MetadataStorage.instance.events.indexOf(found);
        if (foundIndex === index || found.once !== event.once) {
          prev.push(event);
        }
        return prev;
      }, [])
    );

    usedEvents.map(async (on) => {
      if (on.once) {
        this.once(
          on.event as any,
          MetadataStorage.instance.trigger(
            on.event,
            this,
            true
          )
        );
      } else {
        this.on(
          on.event as any,
          MetadataStorage.instance.trigger(
            on.event,
            this
          )
        );
      }
    });

    return super.login(token);
  }

  async build() {
    this.loadClasses();
    await MetadataStorage.instance.build();
  }

  trigger (event: DiscordEvents, params?: any, once: boolean = false): Promise<any[]> {
    return MetadataStorage.instance.trigger(
      event,
      this,
      once
    )(params);
  }

  private loadClasses() {
    if (this._loadClasses) {
      this._loadClasses.map((file) => {
        if (typeof file === "string") {
          const files = Glob.sync(file);
          files.map((file) => {
            require(file);
          });
        }
      });
    }
  }
}
