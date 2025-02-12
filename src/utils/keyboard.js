import { Keyboard } from "grammy";

export async function setUserKeyboard(ctx, state) {
  let keyboard;

  if (state === "free") {
    keyboard = new Keyboard()
      .text("Авторизация") // Заменили команду /auth на текст
      .text("Помощь") // Заменили команду /help на текст
      .row()
      .text("Проекты") // Заменили команду /project на текст
      .row();
  } else if (state === "busy") {
    keyboard = new Keyboard().text("Завершить задачу").row();
  }

  await ctx.reply("Ваше текущее меню обновлено:", {
    reply_markup: { keyboard: keyboard.build(), resize_keyboard: true },
  });
}
