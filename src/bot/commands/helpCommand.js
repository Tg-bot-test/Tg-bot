//Здесь храниться команда для вывода всех команд
// Объект с описанием доступных команд
const commandsDescription = new Map([
  [
    "/auth",
    "Авторизация через токен. Используйте эту команду, чтобы начать процесс авторизации.",
  ],
  ["/help", "Вывод списка доступных команд и их описания."],
  ["/project", "Выбор проекта для просмотра задач"],
]);

/**
 * Команда /help: отправляет пользователю список доступных команд
 * @param {Context} ctx Контекст команды
 */
export async function helpCommand(ctx) {
  let message = "🤖 *Доступные команды бота:*\n\n";

  for (const [command, description] of commandsDescription) {
    message += `• ${command} — ${description}\n`;
  }

  await ctx.reply(message, { parse_mode: "Markdown" });
}

/**
 * Функция для добавления новой команды в список /help
 * @param {string} command Имя команды
 * @param {string} description Описание команды
 */
export function addCommandDescription(command, description) {
  commandsDescription.set(command, description);
}

/**
 * Функция для удаления команды из списка /help
 * @param {string} command Имя команды
 */
export function removeCommandDescription(command) {
  commandsDescription.delete(command);
}
