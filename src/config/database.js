import { Sequelize } from 'sequelize'
import dotenv from 'dotenv'

dotenv.config() // Подключение переменных окружения из .env файла

const sequelize = new Sequelize('tgBotApp', 'root', process.env.MYSQL_PASS, {
	host: process.env.MYSQL_HOST || 'db', // Используем имя сервиса Docker
	port: process.env.MYSQL_PORT || 3306,
	dialect: 'mysql',
	logging: false, // Уберите или установите console.log, чтобы включить логи запросов
})

export default sequelize
