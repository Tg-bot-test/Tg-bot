// src/bot/commands/commentsCommand.js

import { InlineKeyboard } from "grammy";
import { getComments } from "../../services/githubService.js"; // Импортируем функцию для получения комментариев
import { getTaskDetails } from "../../services/githubService.js"; // Если нужно для других задач
import db from "../../db/models/index.js";

// Функция для экранирования символов MarkdownV2
// Функция для экранирования символов MarkdownV2
function escapeMarkdownV2(text) {
  return text.replace(/([\\_*[\]()>#+.!$&|{}])/g, "\\$1").replace(/-/g, "\\-"); // Экранирование дефиса
}

// Функция для проверки авторизации пользователя
async function checkUserAuthorization(ctx) {
  const chatId = ctx.chat.id;
  const user = await db.User.findOne({ where: { telegram_id: chatId } });
  if (!user || !user.github_token) {
    console.log("Пользователь не авторизован");
    return null; // Возвращаем null, если пользователь не авторизован
  }
  return user.github_token; // Возвращаем токен пользователя
}

// Функция для получения комментариев задачи и создания кнопки
export async function showTaskComments(ctx) {
  const action = ctx.callbackQuery.data;
  const taskId = action.split("_").slice(2).join("_"); // Извлекаем ID задачи

  console.log("Получен taskId:", taskId);

  try {
    const userToken = await checkUserAuthorization(ctx); // Получаем токен
    if (!userToken) return; // Если токен не получен, выходим
    const comments = await getComments(userToken, taskId); // Функция для получения комментариев

    if (comments && comments.length > 0) {
      for (const comment of comments) {
        // Находим ссылки на изображения
        const imageLinks = Array.from(
          comment.body.matchAll(/!\[Image\]\((https:\/\/.*?)\)/g),
          (match) => match[1]
        );

        // Удаляем ссылки из текста комментария
        const cleanedBody = comment.body.replace(
          /!\[Image\]\(https:\/\/.*?\)/g,
          ""
        );

        // Формируем текст комментария
        const commentText = `
🖊 **Автор:** ${escapeMarkdownV2(comment.user.login)}
📅 **Дата:** ${escapeMarkdownV2(new Date(comment.createdAt).toLocaleString())}
💬 **Комментарий:**\n${escapeMarkdownV2(cleanedBody)}
`;

        if (imageLinks.length > 0) {
          // Формируем массив медиа для отправки
          const mediaGroup = imageLinks.map((url, index) => ({
            type: "photo",
            media: url,
            caption: index === 0 ? commentText : "", // Текст добавляется только к первой картинке
            parse_mode: index === 0 ? "MarkdownV2" : undefined,
          }));

          // Отправляем текст и изображения как одну группу
          await ctx.replyWithMediaGroup(mediaGroup);
        } else {
          // Если изображений нет, отправляем только текст
          await ctx.reply(commentText, { parse_mode: "MarkdownV2" });
        }
      }
    } else {
      // Если комментариев нет, отправляем это сообщение
      await ctx.reply(escapeMarkdownV2("Комментариев нет."), {
        parse_mode: "MarkdownV2",
      });
    }

    await ctx.answerCallbackQuery(); // Подтверждаем действие
  } catch (error) {
    console.error("Ошибка при получении комментариев:", error);
    await ctx.reply(
      escapeMarkdownV2(`Не удалось загрузить комментарии: ${error.message}`), // Экранируем сообщение об ошибке
      { parse_mode: "MarkdownV2" }
    );
  }
}
