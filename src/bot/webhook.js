import express from 'express'
import { notify } from './notifications/index.js' // Ваша функция уведомлений

const app = express()
const PORT = 3001

// Массив для хранения данных о полученных событиях Webhook
let webhookData = []
const MAX_EVENTS = 2 // Максимальное количество событий для хранения

// Middleware для обработки JSON-данных в теле запросов
app.use(express.json())

/**
 * Endpoint для обработки Webhook событий.
 * GitHub отправляет POST-запросы с данными о событиях, которые мы обрабатываем.
 */
app.post('/webhook', async (req, res) => {
	try {
		const event = req.headers['x-github-event'] // Тип события
		const payload = req.body // Полезная нагрузка

		// Логирование события
		console.log(`Получено событие: ${event} Получен action: ${payload.action}`)

		// Сохраняем событие в массив
		webhookData.push({
			event,
			payload,
			timestamp: new Date(),
		})

		// Удаляем старые события, если превышен лимит
		if (webhookData.length > MAX_EVENTS) {
			webhookData.shift()
		}

		// Передаем событие в обработчик
		await notify(event, payload)

		// Возвращаем успешный ответ
		res.status(200).send('Webhook обработан.')
	} catch (error) {
		console.error('Ошибка обработки вебхука:', error.message)
		res.status(400).send('Ошибка обработки вебхука.')
	}
})

/**
 * Endpoint для просмотра сохраненных данных о событиях Webhook.
 */
app.get('/webhook', (req, res) => {
	res.status(200).json(webhookData)
})

// Запуск сервера
app.listen(PORT, () => {
	console.log(`Сервер запущен на http://localhost:${PORT}`)
})
