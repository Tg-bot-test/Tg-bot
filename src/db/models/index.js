import sequelize from "../../config/database.js";
import User from "./User.js"; // Импорт модели User
import { Sequelize } from "sequelize";

const db = {
  sequelize, // Подключение к базе данных
  Sequelize, // Экспорт Sequelize для использования в других местах
  User, // Подключаем модель User
};

// Синхронизация моделей
(async () => {
  try {
    await sequelize.authenticate();
    console.log("Подключение к базе данных успешно установлено.");
    await sequelize.sync({ alter: true }); // Обновляем таблицы в соответствии с моделями
    console.log("Синхронизация моделей завершена.");
  } catch (error) {
    console.error("Ошибка подключения к базе данных:", error);
  }
})();

export default db;
