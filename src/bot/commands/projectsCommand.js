import { InlineKeyboard } from "grammy";
import {
  getRepositories,
  getProjectsV2,
  getTasks,
  getTaskDetails,
  getProjectFields,
} from "../../services/githubService.js";
import db from "../../db/models/index.js";

const ITEMS_PER_PAGE = 20;

// Команда для отображения репозиториев
export async function projectsCommand(ctx) {
  console.log("Команда /project вызвана");
  const chatId = ctx.chat.id;

  try {
    const user = await db.User.findOne({ where: { telegram_id: chatId } });
    if (!user || !user.github_token) {
      console.log("Пользователь не авторизован");
      return ctx.reply(
        "Вы не авторизованы. Используйте /auth для авторизации."
      );
    }

    const userToken = user.github_token;
    const repositories = await getRepositories(userToken);

    if (!repositories.length) {
      return ctx.reply("У вас нет доступных репозиториев.");
    }

    // Сохраняем репозитории в сессии (или в базе данных)
    ctx.session.repositories = repositories;

    // Показываем первую страницу
    await showRepositoryPage(ctx, 1);
  } catch (error) {
    console.error("Ошибка в projectsCommand:", error.message);
    ctx.reply("Произошла ошибка при обработке команды. Попробуйте позже.");
  }
}

// Функция для отображения страницы с репозиториями
export async function showRepositoryPage(ctx, page) {
  const repositories = ctx.session.repositories || [];
  const totalPages = Math.ceil(repositories.length / ITEMS_PER_PAGE);

  // Проверяем, что номер страницы корректен
  if (page < 1 || page > totalPages) {
    return ctx.reply("Недействительный номер страницы.");
  }

  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const pageRepositories = repositories.slice(startIndex, endIndex);

  const keyboard = new InlineKeyboard();
  pageRepositories.forEach((repo) => {
    keyboard.text(repo.name, `repo_${repo.id}`).row();
  });

  // Добавляем кнопки "Назад" и "Вперед"
  if (page > 1) {
    keyboard.text("⬅ Назад", `page_${page - 1}`);
  }
  if (page < totalPages) {
    keyboard.text("Вперед ➡", `page_${page + 1}`);
  }

  // Показываем текущую страницу
  await ctx.reply(`Страница ${page} из ${totalPages}`, {
    reply_markup: keyboard,
  });
}

// Показать проекты с пагинацией
export async function showProjectPage(ctx, page) {
  const projects = ctx.session.projects || [];
  const totalPages = Math.ceil(projects.length / ITEMS_PER_PAGE);

  if (page < 1 || page > totalPages) {
    return ctx.reply("Недействительный номер страницы.");
  }

  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const pageProjects = projects.slice(startIndex, endIndex);

  const keyboard = new InlineKeyboard();
  pageProjects.forEach((project) => {
    const repoId = ctx.session.currentRepoId; // Получаем текущий репозиторий из сессии
    keyboard.text(project.title, `project_${project.id}_${repoId}`).row();
  });

  if (page > 1) {
    keyboard.text("⬅ Назад", `project_page_${page - 1}`);
  }
  if (page < totalPages) {
    keyboard.text("Вперед ➡", `project_page_${page + 1}`);
  }

  await ctx.editMessageText(`Проекты. Страница ${page} из ${totalPages}`, {
    reply_markup: keyboard,
  });
}

export async function showTasksPage(ctx, tasks, page, deadlineField) {
  const totalPages = Math.ceil(tasks.length / ITEMS_PER_PAGE);

  if (page < 1 || page > totalPages) {
    return ctx.reply("Недействительный номер страницы.");
  }

  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const pageTasks = tasks.slice(startIndex, endIndex);

  const keyboard = new InlineKeyboard();

  pageTasks.forEach((task) => {
    const taskName = task.title || "Без названия";
    const deadline = task.fields[deadlineField.name]
      ? new Date(task.fields[deadlineField.name]).toLocaleDateString()
      : "Нет дедлайна";

    keyboard
      .text(`${taskName} (Дедлайн: ${deadline})`, `task_${task.id}`)
      .row();
  });

  if (page > 1) {
    keyboard.text("⬅ Назад", `tasks_page_${page - 1}`);
  }
  if (page < totalPages) {
    keyboard.text("Вперед ➡", `tasks_page_${page + 1}`);
  }

  await ctx.editMessageText(`Страница ${page} из ${totalPages}`, {
    reply_markup: keyboard,
  });
}

export async function showPaginatedTasks(ctx, tasks, page) {
  const totalPages = Math.ceil(tasks.length / ITEMS_PER_PAGE);

  if (page < 1 || page > totalPages) {
    return ctx.reply("Недействительный номер страницы.");
  }

  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const pageTasks = tasks.slice(startIndex, endIndex);

  const keyboard = new InlineKeyboard();

  pageTasks.forEach((task) => {
    const taskName = task.title || "Без названия";
    keyboard.text(taskName, `task_${task.id}`).row();
  });

  if (page > 1) {
    keyboard.text("⬅️ Назад", `taskss_page_${page - 1}`);
  }
  if (page < totalPages) {
    keyboard.text("Вперёд ➡️", `taskss_page_${page + 1}`);
  }

  await ctx.editMessageText(`Страница ${page} из ${totalPages}`, {
    reply_markup: keyboard,
  });
}

// Обработка inline-запросов (выбор репозитория, проекта и задачи)
// Обработка проекта (получение задач)
// Вспомогательная функция для получения пользователя
async function getUserFromContext(ctx) {
  const chatId = ctx.chat.id;
  const user = await db.User.findOne({ where: { telegram_id: chatId } });
  if (!user || !user.github_token) {
    await ctx.answerCallbackQuery();
    await ctx.reply("Вы не авторизованы. Используйте /auth для авторизации.");
    return null;
  }
  ctx.session.user = {
    github_username: user.github_username, // Проверьте, есть ли это поле в базе
    github_token: user.github_token,
  };
  return user;
}

// Вспомогательная функция для обработки ошибок
async function handleError(
  ctx,
  error,
  message = "Произошла ошибка. Попробуйте позже."
) {
  console.error(error);
  await ctx.answerCallbackQuery();
  await ctx.reply(message);
}

// Маппинг действий
const actionHandlers = {
  page: handlePageAction,
  repo: handleRepoAction,
  project: handleProjectAction,
  deadline: handleDeadlineAction,
  skip: handleSkipAction,
  task: handleTaskAction,
  tasks_page: handleTasksPageAction,
  taskss_page: handleAdditionalTasksPageAction, // Новый обработчик
};

// Главная функция
export async function handleInlineQuery(ctx) {
  try {
    const action = ctx.callbackQuery.data;
    const [prefix, ...args] = action.split("_");

    const user = await getUserFromContext(ctx);
    if (!user) return;

    const handler = actionHandlers[prefix];
    if (handler) {
      await handler(ctx, args, user.github_token);
    } else {
      console.warn("Неизвестное действие:", action);
    }
  } catch (error) {
    await handleError(ctx, error);
  }
}

// Обработчики действий
async function handlePageAction(ctx, args, userToken) {
  const page = parseInt(args[0], 10);
  await showRepositoryPage(ctx, page);
}

async function handleRepoAction(ctx, args, userToken) {
  const repoId = args[0];
  const repositories = await getRepositories(userToken);
  const selectedRepo = repositories.find((repo) => String(repo.id) === repoId);

  if (!selectedRepo) {
    return handleError(
      ctx,
      new Error(`Репозиторий не найден: ${repoId}`),
      "Репозиторий не найден."
    );
  }

  const projects = await getProjectsV2(
    userToken,
    selectedRepo.owner.login,
    selectedRepo.name
  );
  if (!projects.length) {
    return ctx.reply("В этом репозитории нет проектов.");
  }

  ctx.session.projects = projects;
  ctx.session.currentRepoId = repoId;
  await showProjectPage(ctx, 1);
}

async function handleProjectAction(ctx, args, userToken) {
  const [prefix, uniqueId, repoId] = args;
  const projectId = `${prefix}_${uniqueId}`;
  const repositories = await getRepositories(userToken);
  const selectedRepo = repositories.find((repo) => String(repo.id) === repoId);

  if (!selectedRepo) {
    return handleError(
      ctx,
      new Error(`Репозиторий не найден: ${repoId}`),
      "Репозиторий не найден."
    );
  }

  const tasks = await getTasks(userToken, projectId);
  if (!tasks.length) {
    return ctx.reply("В этом проекте нет задач.");
  }

  const projectFields = await getProjectFields(userToken, projectId);
  const dateFields = projectFields.filter((field) => field.dataType === "DATE");

  const keyboard = new InlineKeyboard();
  dateFields.forEach((field) => {
    const buttonData = `deadline_${field.id}_${projectId}`;
    if (buttonData.length < 64) {
      keyboard.text(field.name, buttonData).row();
    }
  });
  keyboard.text("Пропустить", `skip_${projectId}`).row();

  await ctx.answerCallbackQuery();
  await ctx.reply("Выберите поле для сортировки по дедлайну:", {
    reply_markup: keyboard,
  });
}

// Обработчик для действия "deadline"
async function handleDeadlineAction(ctx, args, userToken) {
  const fieldId = `${args[0]}_${args[1]}`;
  const projectId = `${args[2]}_${args[3]}`;

  console.log("fieldId:", fieldId);
  console.log("projectId:", projectId);

  const tasks = await getTasks(userToken, projectId);
  const projectFields = await getProjectFields(userToken, projectId);
  const deadlineField = projectFields.find((field) => field.id === fieldId);

  if (!deadlineField) {
    return ctx.reply("Не удалось найти выбранное поле.");
  }

  const tasksWithDetails = await Promise.all(
    tasks.map(async (task) => {
      const taskDetails = await getTaskDetails(userToken, task.id);
      return { ...task, details: taskDetails };
    })
  );

  const assignedTasks = tasksWithDetails.filter((task) => {
    const assigneesString = task.details?.assignees;
    if (!assigneesString) return false;

    const assignees = assigneesString
      .split(",")
      .map((assignee) => assignee.trim());

    return assignees.includes(ctx.session.user.github_username);
  });

  if (!assignedTasks.length) {
    return ctx.reply("Вы не назначены на задачи в этом проекте.");
  }

  const sortedTasks = assignedTasks.sort((a, b) => {
    const deadlineA = a.fields[deadlineField.name];
    const deadlineB = b.fields[deadlineField.name];
    return new Date(deadlineA) - new Date(deadlineB);
  });

  ctx.session.sortedTasks = sortedTasks;
  ctx.session.deadlineField = deadlineField;

  await showTasksPage(ctx, sortedTasks, 1, deadlineField);
}

// Обработчик для действия "skip"
async function handleSkipAction(ctx, args, userToken) {
  const [prefix, uniqueId] = args;
  const projectId = `${prefix}_${uniqueId}`;
  console.log(args);
  console.log(projectId);

  try {
    const tasks = await getTasks(userToken, projectId);
    const tasksWithDetails = await Promise.all(
      tasks.map(async (task) => {
        const taskDetails = await getTaskDetails(userToken, task.id);
        return { ...task, details: taskDetails };
      })
    );

    const assignedTasks = tasksWithDetails.filter((task) => {
      const assigneesString = task.details?.assignees;
      if (!assigneesString) return false;

      const assignees = assigneesString
        .split(",")
        .map((assignee) => assignee.trim());

      return assignees.includes(ctx.session.user.github_username);
    });

    if (!assignedTasks.length) {
      return ctx.reply("Вы не назначены на задачи в этом проекте.");
    }

    ctx.session.assignedTasks = assignedTasks;
    await showPaginatedTasks(ctx, assignedTasks, 1);
  } catch (error) {
    await handleError(ctx, error, "Ошибка при обработке кнопки 'Пропустить'.");
  }
}

// Обработчик для действия "task"
async function handleTaskAction(ctx, args, userToken) {
  const taskId = args.join("_"); // Полный ID задачи

  const task = await getTaskDetails(userToken, taskId);

  if (!task) {
    return ctx.reply("Задача не найдена или имеет неверную структуру данных.");
  }

  const taskDetails = `
📋 *Задача*: ${escapeMarkdown(task.title)}
📝 *Описание*: ${escapeMarkdown(task.body || "Нет описания")}
🔗 *Ссылка*: [Открыть задачу](${task.url})
🕒 *Создана*: ${escapeMarkdown(new Date(task.createdAt).toLocaleString())}
🔄 *Обновлена*: ${escapeMarkdown(new Date(task.updatedAt).toLocaleString())}
👤 *Ответственный*: ${escapeMarkdown(task.assignees || "Не назначен")}
`;

  const keyboard = new InlineKeyboard().text(
    "Показать комментарии",
    `show_comments_${taskId}`
  );

  await ctx.reply(taskDetails, {
    parse_mode: "MarkdownV2",
    reply_markup: keyboard,
  });
}

// Обработчик для действия "tasks_page"
async function handleTasksPageAction(ctx, args, userToken) {
  const page = parseInt(args[0], 10);
  const sortedTasks = ctx.session.sortedTasks || [];
  const deadlineField = ctx.session.deadlineField;

  if (!sortedTasks.length) {
    return ctx.reply("Задачи отсутствуют.");
  }

  await showTasksPage(ctx, sortedTasks, page, deadlineField);
}

// Обработчик для дополнительной пагинации (taskss_page)
async function handleAdditionalTasksPageAction(ctx, args, userToken) {
  const page = parseInt(args[0], 10);
  const assignedTasks = ctx.session.assignedTasks || [];

  if (!assignedTasks.length) {
    return ctx.reply("Задачи отсутствуют.");
  }

  await showPaginatedTasks(ctx, assignedTasks, page);
}

// Экранирование Markdown
function escapeMarkdown(text) {
  return text.replace(/([_\*\[\]()~`>#+\-=|{}.!-])/g, "\\$1");
}
