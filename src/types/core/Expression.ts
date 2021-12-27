import {
  RuleBuilder,
  CommandMessage,
  TypeOrPromise,
  Client
} from "../..";

export type Expression = string | RegExp | RuleBuilder;

export type ExpressionFunction = (command?: CommandMessage, client?: Client) => TypeOrPromise<Expression>;
