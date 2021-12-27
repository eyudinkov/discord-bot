import { Message } from "discord.js";
import { CommandMessage } from "../../types/public/CommandMessage";
import {
  DOn,
  DDiscord,
  DGuard,
  Client,
  DCommand,
  DCommandNotFound,
  ArgsOf,
  DiscordEvents,
  RuleBuilder,
  Modifier,
  DecoratorUtils,
  Rule,
  DIService
} from "../..";

export class MetadataStorage {
  private static _instance: MetadataStorage;
  private _events: DOn[] = [];
  private _commands: DCommand[] = [];
  private _commandNotFounds: DCommandNotFound[] = [];
  private _guards: DGuard[] = [];
  private _discords: DDiscord[] = [];
  private _modifiers: Modifier<any>[] = [];

  static get instance() {
    if (!this._instance) {
      this._instance = new MetadataStorage();
    }
    return this._instance;
  }

  static clear() {
    this._instance = new MetadataStorage();
  }

  get events() {
    return this._events as readonly DOn[];
  }

  get discords() {
    return this._discords as readonly DDiscord[];
  }

  get commands() {
    return this._commands as readonly DCommand[];
  }

  get commandsNotFound() {
    return this._commandNotFounds as readonly DCommandNotFound[];
  }

  addModifier(modifier: Modifier<any>) {
    this._modifiers.push(modifier);
  }

  addOn(on: DOn) {
    this._events.push(on);
  }

  addCommand(on: DCommand) {
    this._commands.push(on);
    this.addOn(on);
  }

  addCommandNotFound(on: DCommandNotFound) {
    this._commandNotFounds.push(on);
    this.addOn(on);
  }

  addGuard(guard: DGuard) {
    this._guards.push(guard);
    DIService.instance.addService(guard.classRef);
  }

  addDiscord(discord: DDiscord) {
    this._discords.push(discord);
    DIService.instance.addService(discord.classRef);
  }

  async build() {
    this._events = this._events.filter((on, index) => {
      const discord = this._discords.find((instance) => {
        return instance.from === on.classRef;
      });

      on.linkedDiscord = discord;

      if (on.hidden) {
        this.removeEvent(on);
        return false;
      }
      return true;
    });

    await Modifier.applyFromModifierListToList(this._modifiers, this._commands);
    await Modifier.applyFromModifierListToList(this._modifiers, this._commandNotFounds);
    await Modifier.applyFromModifierListToList(this._modifiers, this._discords);

    this._events.map((on) => {
      on.guards = DecoratorUtils.getLinkedObjects(on, this._guards);
      on.compileGuardFn();
    });
  }

  removeEvent(event: DOn) {
    const command = DecoratorUtils.getLinkedObjects(event, this._commands)[0];
    if (command) {
      this._commands.splice(this._commands.indexOf(command), 1);
    }

    const commandNotFound = DecoratorUtils.getLinkedObjects(event, this._commandNotFounds)[0];
    if (commandNotFound) {
      this._commandNotFounds.splice(this._commandNotFounds.indexOf(commandNotFound), 1);
    }

    return event;
  }

  trigger<Event extends DiscordEvents>(event: Event, client: Client, once: boolean = false) {
    const responses: any[] = [];

    let eventsToExecute = this._events.filter((on) => {
      return on.event === event && on.once === once && !(on instanceof DCommandNotFound);
    });

    return async (...params: ArgsOf<Event>) => {
      let paramsToInject: any = params;
      const isMessage = event === "message";
      let isCommand = false;
      let notFoundOn;
      let onCommands = [];

      onCommands = (await Promise.all(this.events.map(async (on) => {
        if (isMessage && on instanceof DCommand) {
          const message = params[0] as Message;
          isCommand = true;
          let pass: RuleBuilder[] = undefined;

          if (message.author.id === client.user.id) {
            return;
          }

          const commandMessage = CommandMessage.create(
            message,
            on
          );

          const computedDiscordRules = (await Promise.all(
            on.linkedDiscord.argsRules.map(async (ar) => await ar(commandMessage, client))
          )).flatMap((rules) => {
            return RuleBuilder.join(Rule(""), ...rules);
          });

          let computedCommandRules = (await Promise.all(
            on.argsRules.map(async (ar) => await ar(commandMessage, client))
          ));

          if (computedCommandRules.length <= 0) {
            computedCommandRules = [[
              Rule(on.key).spaceOrEnd()
            ]];
          }

          const allRules = computedDiscordRules.reduce<RuleBuilder[][]>((prev, cdr) => {
            return [
              ...computedCommandRules.map<RuleBuilder[]>((ccr) => [
                cdr,
                ...RuleBuilder.fromArray(ccr)
              ]),
              ...prev
            ];
          }, []).flatMap((rules) => {
            const res = RuleBuilder.join(Rule(""), ...rules);
            return [[
              res.copy().setSource(res.source.replace(Client.variablesExpression, "")),
              res
            ]];
          });

          pass = allRules.find((rule) => {
            return rule[0].regex.test(message.content);
          });

          if (pass) {
            CommandMessage.parseArgs(pass, commandMessage);

            commandMessage.commandContent = commandMessage.content;
            computedDiscordRules.map((cdr) => {
              commandMessage.commandContent = commandMessage.commandContent.replace(cdr.regex, "");
            });

            paramsToInject = commandMessage;
            return on;
          } else {
            const passNotFound = computedDiscordRules.some((cdr) => {
              return cdr.regex.test(message.content);
            });

            if (passNotFound) {
              notFoundOn = on.linkedDiscord.commandNotFound;
              paramsToInject = commandMessage;
            }
          }
        } else if (
          on.event === "message" &&
          !(on instanceof DCommandNotFound) &&
          !(on instanceof DCommand)
        ) {
          return on;
        }
        return undefined;
      }))).filter(c => c);

      if (isCommand) {
        const realCommands = onCommands.filter((e) => e instanceof DCommand);
        const onsInCommands = onCommands.filter((e) => !(e instanceof DCommand));

        if (realCommands.length > 0) {
          eventsToExecute = onCommands;
        } else if (notFoundOn && realCommands.length <= 0) {
          eventsToExecute = [
            ...onsInCommands,
            notFoundOn
          ];
        } else if (onsInCommands.length > 0) {
          eventsToExecute = onsInCommands;
        } else {
          eventsToExecute = [];
        }
      }

      for (const on of eventsToExecute) {
        let injectedParams = paramsToInject;
        if (
          isCommand &&
          !Array.isArray(injectedParams) &&
          !(on instanceof DCommand || on instanceof DCommandNotFound)
        ) {
          injectedParams = [paramsToInject];
        }

        const res = await on.getMainFunction<Event>()(injectedParams, client);
        if (res.executed) {
          responses.push(res.res);
        }
        if (res.on instanceof DCommandNotFound) {
          break;
        }
      }
      return responses;
    };
  }
}
