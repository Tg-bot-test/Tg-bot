/**
 * Формирует сообщение о новой задаче.
 * @param {object} issue - Данные задачи.
 * @returns {string} - Сформированное сообщение.
 */
export function formatTaskNotification(issue) {
	const { title, html_url, assignees, created_at, labels, state } = issue

	const labelsText =
		labels && labels.length > 0
			? labels.map(label => `#${label.name}`).join(', ')
			: 'Нет меток'

	const assigneesText =
		assignees && assignees.length > 0
			? assignees.map(a => a.login).join(', ')
			: 'Не указано'

	const message =
		`🆕 *Создана новая задача!*\n\n` +
		`📌 *Заголовок задачи:* ${title}\n` +
		`🔗 *Ссылка:* [Открыть задачу](${html_url})\n` +
		`📅 *Дата создания:* ${new Date(created_at).toLocaleString('ru-RU')}\n` +
		`📂 *Статус:* ${state === 'open' ? '🟢 Открыта' : '🔴 Закрыта'}\n` +
		`🏷️ *Метки:* ${labelsText || 'Отсутствуют'}\n` +
		`👥 *Назначено на:* ${assigneesText || 'Не указано'}`

	// Формируем сообщение
	return { message }
}
