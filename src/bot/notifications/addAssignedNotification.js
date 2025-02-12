/**
 * Формирует сообщение о новой задаче.
 * @param {object} issue - Данные задачи.
 * @returns {string} - Сформированное сообщение.
 */
export function formAssignedUserNotification(issue, assignee) {
	const { title, html_url, assignees, created_at, labels, state } = issue
	// console.log(unassignedUser)
	const labelsText =
		labels && labels.length > 0
			? labels.map(label => `#${label.name}`).join(', ')
			: 'Нет меток'

	const assigneesText =
		assignees && assignees.length > 0
			? assignees.map(a => a.login).join(', ')
			: 'Не указано'

	const message =
		`*🔔 Новое назначение на задачу!*\n\n` +
		`📌 *Заголовок задачи:* ${title}\n` +
		`🔗 *Ссылка на задачу:* [Открыть задачу](${html_url})\n` +
		`📅 *Дата создания:* ${new Date(created_at).toLocaleString('ru-RU')}\n` +
		`📂 *Текущий статус:* ${state === 'open' ? '🟢 Открыта' : '🔴 Закрыта'}\n` +
		`🏷 *Метки задачи:* ${labelsText || 'Нет меток'}\n` +
		`👥 *Назначено на:* ${assigneesText || 'Не назначено'}`

	return { message }
}
