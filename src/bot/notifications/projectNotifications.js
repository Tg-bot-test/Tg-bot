/**
 * Формирует сообщение о проекте.
 * @param {string} action - Действие (`created`, `updated`, `deleted`).
 * @param {object} project - Данные проекта.
 * @returns {string} - Сформированное сообщение.
 */
export function formatProjectNotification(action, project) {
	let actionText = ''
	if (action === 'created') {
		actionText = '🔵 Новый проект создан!'
	} else if (action === 'updated') {
		actionText = '🟠 Проект обновлен!'
	} else if (action === 'deleted') {
		actionText = '❌ Проект удален!'
	}

	return (
		`${actionText}\n\n` +
		`*Название проекта:* ${project.name}\n` +
		`*Описание:* ${project.body || 'Нет описания'}\n` +
		`*Ссылка:* [Открыть проект](${project.html_url})\n` +
		`*Дата изменения:* ${new Date(project.updated_at).toLocaleString('ru-RU')}`
	)
}
