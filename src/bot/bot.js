import { Bot } from "grammy";
import { registerCommands } from "./commands/index.js";
import { setupSession } from "../utils/session.js";
import { config } from "../utils/config.js";

// Создаем бота
const bot = new Bot(config.BOT_API_KEY);

// Настраиваем сессии
setupSession(bot);

// Создаем `chatTokens` и `authState`
const chatTokens = new Map(); // Хранилище токенов для чатов
const authState = new Map(); // Хранилище состояний авторизации

// Регистрация команд
registerCommands(bot, chatTokens, authState);

// Запуск бота
try {
  bot.start();
  console.log("Bot started.");
} catch (error) {
  console.error("Error starting bot:", error);
}

export default bot;
