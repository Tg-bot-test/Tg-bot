import {
  authCommand,
  changeTokenCallback,
  handleNewToken,
} from "./authCommand.js";
import { setUserKeyboard } from "../../utils/keyboard.js";
import { tokenHandler } from "../middlewares/authMiddleware.js";
import { helpCommand, addCommandDescription } from "./helpCommand.js";
import {
  projectsCommand,
  handleInlineQuery,
  showRepositoryPage,
  showProjectPage,
  showPaginatedTasks,
  showTasksPage,
} from "./projectsCommand.js";
import { showTaskComments } from "./commentsCommand.js";

export async function registerCommands(
  bot,
  chatTokens,
  authState = new Map(),
  userStates = new Map()
) {
  bot.command("help", helpCommand);
  // Команда /auth
  bot.command("auth", async (ctx) => {
    const userState = userStates.get(ctx.chat.id) || "free";

    if (userState === "busy") {
      return ctx.reply(
        "Вы находитесь в процессе выполнения задачи. Завершите текущую задачу, чтобы использовать команды."
      );
    }

    await authCommand(ctx, chatTokens, authState); // Вызываем логику авторизации
    userStates.set(ctx.chat.id, "free"); // Устанавливаем состояние пользователя как свободное
    await setUserKeyboard(ctx, "free");
  });
  bot.command("project", projectsCommand);

  bot.command("amogus", async (ctx) => {
    const gifUrl =
      "https://media1.tenor.com/m/gQV5VzHLWQIAAAAd/among-us-sus.gif"; // URL вашей гифки

    try {
      await ctx.replyWithAnimation(gifUrl); // Отправляем гифку как анимацию
    } catch (error) {
      console.error("Ошибка отправки гифки:", error);
      await ctx.reply("Не удалось отправить гифку. Попробуйте позже.");
    }
  });

  bot.command("start", async (ctx) => {
    // Приветственное сообщение
    const welcomeMessage = `
  Добро пожаловать! 🎉
  Я бот для управления проектами и задачами.
  
  Вот, что вы можете сделать:
  - Авторизуйтесь через команду /auth.
  - Посмотрите список ваших проектов через /project.
  - Нужна помощь? Используйте /help.
  
  Выберите действие с помощью кнопок ниже.
    `;

    try {
      // Отправляем сообщение с клавиатурой
      await ctx.reply(welcomeMessage, await setUserKeyboard(ctx, "free"));
    } catch (error) {
      console.error("Ошибка отправки приветственного сообщения:", error);
      await ctx.reply("Не удалось отправить приветственное сообщение.");
    }
  });

  // Обработчик inline-запросов
  bot.on("callback_query:data", async (ctx) => {
    const action = ctx.callbackQuery.data;
    console.log("Нажата кнопка:", action); // Логируем полученное действие

    if (action.startsWith("repo_")) {
      console.log("Нажата кнопка репозитория:", action);
      await handleInlineQuery(ctx); // Обрабатываем запрос для репозитория
    } else if (action.startsWith("page_")) {
      const page = parseInt(action.split("_")[1], 10);
      console.log("Переход на страницу:", page); // Проверяем, какая страница запрошена
      await showRepositoryPage(ctx, page);
    } else if (action.startsWith("project_page_")) {
      const page = parseInt(action.split("_")[2], 10);
      return await showProjectPage(ctx, page);
    } else if (action.startsWith("project_")) {
      console.log("Нажата кнопка проекта:", action);
      await handleInlineQuery(ctx); // Обрабатываем запрос для проекта
    } else if (action.startsWith("task_")) {
      console.log("Нажата кнопка задачи:", action);
      await handleInlineQuery(ctx); // Обрабатываем запрос для задачи
    } else if (action.startsWith("show_comments_")) {
      console.log("Нажата кнопка комментариев:", action);
      await showTaskComments(ctx); // Вызов функции для комментариев
    } else if (action.startsWith("deadline_")) {
      console.log("Нажато поле дедлайна:", action);
      await handleInlineQuery(ctx); // Обрабатываем запрос для выбора поля дедлайна
    } else if (action.startsWith("tasks_page_")) {
      const page = parseInt(action.split("_")[2], 10);
      const sortedTasks = ctx.session.sortedTasks || [];
      const deadlineField = ctx.session.deadlineField;
      if (!sortedTasks.length) {
        return ctx.reply("Задачи отсутствуют.");
      }
      await showTasksPage(ctx, sortedTasks, page, deadlineField);
    } else if (action.startsWith("skip_")) {
      console.log("Нажата кнопка пропустить:", action);
      await handleInlineQuery(ctx);
    } else if (action.startsWith("taskss_page")) {
      const actionParts = action.split("_");
      const projectId = `${actionParts[1]}_${actionParts[2]}`;
      const page = parseInt(actionParts[2]);
      const task = ctx.session.assignedTasks;

      // Сохраняем текущий проект в сессии
      ctx.session.projectId = projectId;

      // Вызываем обработчик из `projectsCommand.js`
      await showPaginatedTasks(ctx, task, page);
    } else if (action === "change_token") {
      await changeTokenCallback(ctx); // Обрабатываем изменение токена
    }

    await ctx.answerCallbackQuery(); // Убираем индикатор загрузки
  });

  // Дополняем список доступных команд
  addCommandDescription(
    "/auth",
    "Авторизация через токен. Используйте эту команду, чтобы начать процесс авторизации."
  );
  addCommandDescription(
    "/help",
    "Вывод списка доступных команд и их описания."
  );
  // Обработка текстовых сообщений (например, токена)
  // Обработка текстовых сообщений
  bot.on("message:text", async (ctx) => {
    const userState = userStates.get(ctx.chat.id) || "free";
    const text = ctx.message.text.trim();
    const chatId = ctx.chat.id;
    const isAuthorized = chatTokens.has(chatId);

    // Если ожидается ввод токена, обрабатываем его в приоритетном порядке
    if (ctx.session.awaitingToken) {
      await handleNewToken(ctx, chatTokens, authState);
      return; // Завершаем обработку
    }

    if (userState === "busy") {
      return ctx.reply("Вы находитесь в процессе выполнения задачи.");
    }

    if (isAuthorized) {
      // Обработка других текстовых команд для авторизованных пользователей
      if (text === "Помощь") {
        await helpCommand(ctx);
      } else if (text === "Проекты") {
        await projectsCommand(ctx);
      } else if (text === "Авторизация") {
        await ctx.reply("Вы уже авторизованы.");
      } else {
        await ctx.reply("Я не понимаю такую команду. Попробуйте ещё раз.");
      }
    } else {
      // Обработка для неавторизованных пользователей
      if (text === "Авторизация") {
        await authCommand(ctx, chatTokens, authState);
      } else if (text === "Помощь") {
        await helpCommand(ctx);
      } else if (text === "Проекты") {
        await ctx.reply("Сначала авторизуйтесь, используя команду /auth.");
      } else {
        await ctx.reply("Я не понимаю такую команду. Попробуйте ещё раз.");
      }
    }
  });

  // Хранилище стикеров
  const stickerMemory = new Map();

  // Обработка стикеров
  bot.on("message", async (ctx) => {
    // Проверяем, если сообщение содержит стикер
    if (ctx.message.sticker) {
      const chatId = ctx.chat.id;
      const stickerId = ctx.message.sticker.file_id;

      // Если чат ещё не был добавлен, создаём для него новый список стикеров
      if (!stickerMemory.has(chatId)) {
        stickerMemory.set(chatId, []);
      }

      // Добавляем стикер в память
      stickerMemory.get(chatId).push(stickerId);

      // Отправляем случайный стикер
      const stickers = stickerMemory.get(chatId);
      const randomSticker =
        stickers[Math.floor(Math.random() * stickers.length)];

      // Отправляем случайный стикер из памяти
      await ctx.replyWithSticker(randomSticker);
    }
  });

  // Также, можно добавить команду для очистки памяти стикеров, если нужно
  bot.command("clear_stickers", (ctx) => {
    const chatId = ctx.chat.id;
    stickerMemory.delete(chatId);
    ctx.reply("Память стикеров была очищена.");
  });

  // Инициализация состояния пользователя
  bot.on("message", async (ctx) => {
    if (!userStates.has(ctx.chat.id)) {
      userStates.set(ctx.chat.id, "free"); // Устанавливаем начальное состояние как "свободен"
      await setUserKeyboard(ctx, "free");
    }
  });
}
