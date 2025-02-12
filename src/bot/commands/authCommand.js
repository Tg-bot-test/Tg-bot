import { InlineKeyboard } from "grammy"; // Импорт конструктора для создания inline-клавиатуры
import db from "../../db/models/index.js"; // Импорт моделей базы данных
import axios from "axios"; // Импорт библиотеки для выполнения HTTP-запросов

// Функция для экранирования специальных символов в MarkdownV2
function escapeMarkdownV2(text) {
  return text.replace(/([\\_*[\]()>#+.!$&|{}=])/g, "\\$1").replace(/-/g, "\\-");
}

// Основная команда для авторизации пользователей
export async function authCommand(ctx, chatTokens, authState) {
  const userId = ctx.from.id; // Получаем Telegram ID пользователя

  // Пытаемся найти пользователя в базе данных по Telegram ID
  let user = await db.User.findOne({ where: { telegram_id: userId } });

  if (user) {
    // Если пользователь уже существует в базе, уведомляем его
    await ctx.reply(
      `Вы уже авторизованы. Ваш текущий GitHub токен: ${
        user.github_token || "не указан"
      }`,
      {
        // Добавляем клавишу для изменения токена
        reply_markup: new InlineKeyboard().text(
          "Изменить GitHub токен",
          "change_token"
        ),
      }
    );
    chatTokens.set(ctx.chat.id, user.github_token); // Сохраняем токен в локальном хранилище
  } else {
    // Если пользователя нет в базе, включаем режим ожидания токена
    ctx.session.awaitingToken = true;

    // Инструкция для авторизации
    const message = `
  Вы еще не авторизованы. Для авторизации вам нужно создать личный токен доступа на GitHub.
  
  1. Перейдите по [ссылке](https://github.com/settings/tokens/new?scopes=repo,read:org,notifications,read:user,project) для создания токена.
  2. Убедитесь, что вы добавили следующие права:
	 - \`repo\` (доступ к вашим репозиториям)
	 - \`read:org\` (чтение информации о вашей организации)
	 - \`notifications\` (доступ к вашим уведомлениям)
	 - \`read:user\` (чтение информации о пользователе)
	 - \`project\` (доступ к проектам)
  
  После создания токена отправьте его мне для завершения авторизации.
	  `;

    await ctx.reply(escapeMarkdownV2(message), { parse_mode: "MarkdownV2" }); // Отправляем инструкцию в виде форматированного сообщения
  }
}

// Обработчик для изменения токена (вызывается при нажатии на inline-кнопку)
export async function changeTokenCallback(ctx) {
  const userId = ctx.from.id; // Получаем Telegram ID пользователя

  // Пытаемся найти пользователя в базе данных
  const user = await db.User.findOne({ where: { telegram_id: userId } });

  if (user) {
    // Если пользователь найден, включаем режим ожидания нового токена
    ctx.session.awaitingToken = true;
    await ctx.reply("Введите новый GitHub токен:");
  } else {
    // Если пользователя нет, предлагаем пройти авторизацию
    await ctx.reply(
      "Вы ещё не авторизованы. Используйте /auth для начала авторизации."
    );
  }

  // Закрываем callback-клавиатуру, если она была открыта
  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery();
  }
}

// Обработчик получения нового токена от пользователя
export async function handleNewToken(ctx, chatTokens, authState) {
  const chatId = ctx.chat.id; // ID чата, где отправлено сообщение
  const token = ctx.message.text.trim(); // Новый токен, введенный пользователем

  // Проверяем, находится ли пользователь в режиме ожидания токена
  if (ctx.session.awaitingToken) {
    if (!token) {
      // Если токен пустой, отправляем сообщение с просьбой повторить ввод
      return ctx.reply("Введите валидный токен GitHub.");
    }

    try {
      // Проверяем валидность токена через API GitHub
      const response = await axios.get("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${token}` }, // Передаем токен в заголовке
      });

      const username = response.data.login; // Получаем имя пользователя с GitHub

      // Сохраняем токен и данные в базе данных
      let user = await db.User.findOne({ where: { telegram_id: chatId } });

      if (!user) {
        // Если пользователя нет, создаем новую запись
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

      // Завершаем процесс авторизации
      chatTokens.set(chatId, token); // Сохраняем токен в локальном хранилище
      ctx.session.awaitingToken = false; // Сбрасываем флаг ожидания токена
      ctx.reply(`Токен сохранен! Вы авторизованы как ${username}.`);
    } catch (error) {
      console.error("Ошибка проверки токена:", error.message);

      if (error.response?.status === 401) {
        // Если токен неверный, уведомляем пользователя
        return ctx.reply("Неверный токен. Попробуйте ввести правильный токен.");
      } else {
        // Обрабатываем другие ошибки
        return ctx.reply(
          "Произошла ошибка при проверке токена. Попробуйте позже."
        );
      }
    }
  } else {
    // Если режим ожидания токена выключен, уведомляем пользователя
    ctx.reply("Вы не можете изменить токен сейчас. Используйте /auth.");
  }
}
