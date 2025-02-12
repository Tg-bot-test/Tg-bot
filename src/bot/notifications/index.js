// Импорт необходимых модулей
import bot from '../bot.js' // Telegram-бот для отправки уведомлений
import db from '../../db/models/index.js' // База данных пользователей
import { formatCommentNotification } from './commentNotifications.js' // Форматирование уведомлений для комментариев
import { formatTaskNotification } from './taskNotifications.js' // Форматирование уведомлений для задач
import { formatStatusNotification } from './statusAction.js' // Форматирование уведомлений для изменений статуса
import { formatProjectCardStatusNotification } from './projectCardStatusNotifications.js' // Форматирование уведомлений для карточек проекта
import { formUnassignedUserNotification } from './unassignedUserNotification.js'
import { formAssignedUserNotification } from './addAssignedNotification.js'
import { getTaskDetails } from '../../services/githubService.js' // Сервис для получения данных о задаче через GitHub API
import dotenv from 'dotenv' // Модуль для работы с переменными окружения

// Загрузка переменных окружения из файла .env
dotenv.config()

// Токен суперпользователя для авторизации в GitHub API
const userToken = process.env.BOT_API_SUPERUSER

// Множество для хранения обработанных событий
const processedEvents = new Set()

// Функция очистки устаревших событий
function cleanupProcessedEvents(eventId) {
	setTimeout(() => processedEvents.delete(eventId), 300) // Удаляем через ...
}

// Обработчики событий GitHub Webhooks
export const eventHandlers = {
	issues: async payload => {
		const { action, issue, assignee } = payload
		// console.log('Получено событие: issues', { action, issue, assignee })

		if (action === 'opened') {
			return formatTaskNotification(issue)
		} else if (['closed', 'reopened'].includes(action)) {
			return formatStatusNotification(action, issue)
		} else if (['unassigned'].includes(action)) {
			// console.log(assignee)
			return formUnassignedUserNotification(issue, assignee)
		} else if (['assigned'].includes(action)) {
			return formAssignedUserNotification(issue, assignee)
		}
		return null
	},

	issue_comment: async payload => {
		if (payload.action === 'created') {
			return formatCommentNotification(payload.comment, payload.issue)
		}
		return null
	},

	projects_v2_item: async payload => {
		const { action, projects_v2_item, changes } = payload

		if (action === 'edited' && changes?.field_value?.field_name === 'Status') {
			const nodeId = projects_v2_item?.node_id
			if (!nodeId) {
				console.error('Отсутствует node_id в событии projects_v2_item.')
				return null
			}

			try {
				const taskDetail = await getTaskDetails(userToken, nodeId)
				const { from, to } = changes.field_value

				if (!from || !to) {
					console.error('Отсутствуют данные статуса "from" или "to".')
					return null
				}

				return formatProjectCardStatusNotification(action, from, to, taskDetail)
			} catch (error) {
				console.error('Ошибка получения данных задачи:', error.message)
				return null
			}
		}

		console.log(
			`Событие projects_v2_item с action "${action}" не обрабатывается.`
		)
		return null
	},
}

async function getNodeID(payload) {
	try {
		const nodeId = payload.projects_v2_item.node_id
		if (!nodeId) {
			throw new Error('Отсутствует node_id.')
		}

		const taskDetail = await getTaskDetails(userToken, nodeId)
		const assigneesString = taskDetail.assignees

		if (!assigneesString || typeof assigneesString !== 'string') {
			throw new Error('Некорректный формат assignees.')
		}

		// Разбиваем строку и возвращаем массив объектов с login
		const assignees = assigneesString.split(',').map(assignee => ({
			login: assignee.trim(),
		}))

		// Логируем результат
		console.log('Полученные assignees:', assignees)

		return assignees
	} catch (error) {
		console.error('Ошибка в getNodeID:', error.message)
		return []
	}
}

/**
 * Универсальная функция обработки уведомлений.
 * Все события обрабатываются асинхронно и параллельно.
 * @param {string} event - Тип события.
 * @param {object} payload - Данные, переданные с вебхуком.
 */
// Универсальная функция обработки уведомлений.
export async function notify(event, payload) {
	let eventId

	// Генерация уникального идентификатора события
	if (
		event === 'issues' &&
		['unassigned', 'assigned'].includes(payload.action)
	) {
		const assigneeLogin = payload.assignee?.login || 'unknown'
		eventId = `${event}-${payload.issue?.id}-${payload.action}-${assigneeLogin}`
	} else {
		eventId = `${event}-${
			payload.issue?.id || payload.projects_v2_item?.id || ''
		}-${payload.action}`
	}

	// Добавляем событие в список обработанных
	processedEvents.add(eventId)
	cleanupProcessedEvents(eventId) // Удаляем через 5 минут

	const handler = eventHandlers[event]
	if (!handler) {
		console.warn(`Обработчик для события "${event}" не найден.`)
		return
	}

	try {
		// Асинхронная обработка события
		const notification = await handler(payload)
		if (!notification) {
			console.log(`Для события "${event}" сообщение не требуется.`)
			return
		}

		const { message, images = [] } = notification

		// Проверяем наличие текста сообщения
		if (!message || message.trim() === '') {
			console.warn(
				`Для события "${event}" текст сообщения пуст. Уведомление не будет отправлено.`
			)
			return
		}

		// Извлечение assignees
		let assignees = []
		if (event === 'projects_v2_item') {
			assignees = await getNodeID(payload) // Используем getNodeID
		} else if (['unassigned', 'assigned'].includes(payload.action)) {
			const assignee = payload.assignee // Объект assignee
			if (assignee && assignee.login) {
				// Преобразуем объект в массив с одним элементом для унификации
				assignees = [assignee]
			} else {
				console.log('Assignee отсутствует или невалидный:', assignee)
				// Переход к обработке ниже
				assignees =
					payload.issue?.assignees ||
					payload.assignees ||
					notification.taskDetail?.assignees ||
					[]
			}
		} else {
			assignees =
				payload.issue?.assignees ||
				payload.assignees ||
				notification.taskDetail?.assignees ||
				[]
			// console.log(assignees)
		}

		if (!Array.isArray(assignees) || assignees.length === 0) {
			console.log('Список назначенных пользователей пуст.')
			return
		}

		// Параллельная отправка уведомлений
		await Promise.all(
			assignees.map(async assignee => {
				// Проверяем, что у assignee есть login
				if (!assignee.login) {
					console.log(`У пользователя отсутствует login:`, assignee)
					return
				}

				const user = await db.User.findOne({
					where: { github_username: assignee.login },
				})

				if (user && user.telegram_id) {
					// Если есть изображения
					if (images.length > 0) {
						const mediaGroup = images.map((url, index) => ({
							type: 'photo',
							media: url,
							caption: index === 0 ? message : undefined,
							parse_mode: index === 0 ? 'Markdown' : undefined,
						}))

						// Отправляем галерею изображений
						await bot.api.sendMediaGroup(user.telegram_id, mediaGroup)
					} else {
						// Отправляем текстовое сообщение
						await bot.api.sendMessage(user.telegram_id, message, {
							parse_mode: 'Markdown',
						})
					}
					console.log(
						`Уведомление отправлено: Telegram ID: ${user.telegram_id}, GitHub Username: ${assignee.login}`
					)
				} else {
					console.log(
						`Пользователь ${assignee.login} не найден или не настроен Telegram ID.`
					)
				}
			})
		)
	} catch (error) {
		console.error(`Ошибка обработки уведомлений для события "${event}":`, error)
	}
}
