import { session } from "grammy";

export function setupSession(bot) {
  bot.use(
    session({
      initial: () => ({ awaitingToken: false }),
    })
  );
}
