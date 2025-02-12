import axios from "axios";
import { InlineKeyboard } from "grammy";
import db from "../../db/models/index.js";

export async function tokenHandler(ctx, chatTokens, authState) {
  const chatId = ctx.chat.id;
  const token = ctx.message.text.trim();

  // Проверяем, есть ли состояние авторизации
  if (!authState) {
    throw new Error("authState is not initialized.");
  }

  // Инициализируем состояние авторизации, если его нет
  if (!authState.has(chatId)) {
    authState.set(chatId, { step: 0 });
  }

  // Проверяем, если пользователь уже авторизован
  if (chatTokens.has(chatId)) {
    return ctx.reply("Вы уже авторизованы!");
  }

  // Проверка на введённый токен
  if (!token) {
    return ctx.reply("Введите валидный токен GitHub.");
  }

  try {
    // Проверяем токен через GitHub API
    const response = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const username = response.data.login;

    // Сохраняем токен в базе данных
    let user = await db.User.findOne({ where: { telegram_id: chatId } });

    if (!user) {
      // Если пользователя нет, создаем его
      user = await db.User.create({
        telegram_id: chatId,
        github_username: username,
        github_token: token,
      });
    } else {
      // Если пользователь есть, обновляем токен
      user.github_token = token;
      await user.save();
    }

    // Завершаем процесс авторизации, сохраняем токен
    chatTokens.set(chatId, token);
    authState.delete(chatId); // Убираем состояние ожидания авторизации

    ctx.reply(`Токен сохранен! Вы авторизованы как ${username}.`);
  } catch (error) {
    console.error("Ошибка проверки токена:", error.message);

    if (error.response?.status === 401) {
      const keyboard = new InlineKeyboard().row();

      return ctx.reply("Неверный токен. Введите правильный токен", {
        reply_markup: keyboard,
      });
    } else {
      return ctx.reply(
        "Произошла ошибка при проверке токена. Попробуйте позже."
      );
    }
  }
}
