import bot from "./src/bot/bot.js";
import "./src/bot/webhook.js"; // Просто импортируем, чтобы сервер запустился

bot.start();
console.log("бот запущен");
