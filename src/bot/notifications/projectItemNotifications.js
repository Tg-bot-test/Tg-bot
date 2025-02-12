/**
 * Формирует сообщение о элементе проекта.
 * @param {string} action - Действие (`created`, `updated`, `deleted`).
 * @param {object} project_item - Данные элемента проекта.
 * @returns {string} - Сформированное сообщение.
 */
export function formatProjectItemNotification(action, project_item) {
	let actionText = ''
	if (action === 'created') {
		actionText = '🆕 Новый элемент проекта создан!'
	} else if (action === 'updated') {
		actionText = '🔄 Элемент проекта обновлен!'
	} else if (action === 'deleted') {
		actionText = '❌ Элемент проекта удален!'
	}

	return (
		`${actionText}\n\n` +
		`*Название элемента:* ${project_item.content.title}\n` +
		`*Описание:* ${project_item.content.body || 'Нет описания'}\n` +
		`*Ссылка:* [Открыть элемент проекта](${project_item.html_url})\n` +
		`*Дата изменения:* ${new Date(project_item.updated_at).toLocaleString(
			'ru-RU'
		)}`
	)
}
