import { GuardFunction } from "../../src";

export const GuardListener: GuardFunction<"message"> = async ([message], _, next) => {
  if (!message.author.bot) {
    await next();
  }
};
