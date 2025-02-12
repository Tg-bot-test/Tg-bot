import axios from "axios";

async function getTasks(userToken, projectId) {
  const query = `
    query ($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          items(first: 50) {
            nodes {
              id
              content {
                ... on Issue {
                  title
                  url
                  createdAt
                }
                ... on PullRequest {
                  title
                  url
                  createdAt
                }
              }
              fieldValues(first: 50) {
                nodes {
                  ... on ProjectV2ItemFieldValueCommon {
                    field {
                      ... on ProjectV2SingleSelectField {
                        id
                        name
                      }
                      ... on ProjectV2Field {
                        id
                        name
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                  }
                  ... on ProjectV2ItemFieldTextValue {
                    text
                  }
                  ... on ProjectV2ItemFieldDateValue {
                    date
                  }
                  ... on ProjectV2ItemFieldNumberValue {
                    number
                  }
                  ... on ProjectV2ItemFieldIterationValue {
                    title
                    duration
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const variables = { projectId };

  try {
    const response = await axios.post(
      "https://api.github.com/graphql",
      { query, variables },
      {
        headers: {
          Authorization: `Bearer ${userToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (response.data.errors) {
      throw new Error("Ошибка GraphQL: " + response.data.errors[0]?.message);
    }

    const items = response.data?.data?.node?.items?.nodes || [];

    return items.map((item) => {
      const fields = item.fieldValues.nodes.reduce((acc, fieldValue) => {
        const fieldName = fieldValue.field?.name;
        if (fieldName) {
          acc[fieldName] =
            fieldValue.text ||
            fieldValue.name ||
            fieldValue.date ||
            fieldValue.number ||
            fieldValue.title ||
            null;
        }
        return acc;
      }, {});

      return {
        id: item.id,
        title: item.content?.title || "Без названия",
        url: item.content?.url || null,
        createdAt: item.content?.createdAt || null,
        fields,
      };
    });
  } catch (error) {
    handleError(error);
    throw new Error("Не удалось получить задачи. Проверьте данные проекта.");
  }
}

function handleError(error) {
  console.error(
    "Ошибка при получении задач Projects V2:",
    error.response?.data || error.message
  );
}

async function getProjectFields(userToken, projectId) {
  const query = `
    query ($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          fields(first: 50) {
            nodes {
              ... on ProjectV2SingleSelectField {
                id
                name
                options {
                  name
                }
              }
              ... on ProjectV2Field {
                id
                name
                dataType
              }
              ... on ProjectV2Field {
                id
                name
              }
              ... on ProjectV2Field {
                id
                name
              }
              ... on ProjectV2IterationField {
                id
                name
              }
            }
          }
        }
      }
    }
  `;

  const variables = { projectId };

  try {
    const response = await axios.post(
      "https://api.github.com/graphql",
      { query, variables },
      {
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.errors) {
      throw new Error("Ошибка GraphQL: " + response.data.errors[0]?.message);
    }

    const fields = response.data?.data?.node?.fields?.nodes || [];

    if (!fields.length) {
      console.error("Поля проекта не найдены или данные некорректны.");
      return [];
    }

    return fields.map((field) => ({
      id: field.id,
      name: field.name,
      dataType: field.dataType,
      options: field.options?.map((option) => option.name) || [],
    }));
  } catch (error) {
    handleError(error);
    throw new Error("Не удалось получить поля проекта.");
  }
}

async function getComments(userToken, issueId) {
  const query = `
    query($issueId: ID!) {
      node(id: $issueId) {
        ... on ProjectV2Item {
          content {
            ... on Issue {
              comments(first: 100) {
                nodes {
                  id
                  body
                  author {
                    login
                  }
                  createdAt
                }
              }
            }
          }
        }
      }
    }
  `;

  const variables = { issueId };

  try {
    const response = await axios.post(
      "https://api.github.com/graphql",
      { query, variables },
      {
        headers: {
          Authorization: `Bearer ${userToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    // Проверка ошибок в GraphQL ответе
    handleGraphQLErrors(response);

    const comments = response?.data?.data?.node?.content?.comments?.nodes || [];

    if (!comments.length) {
      console.log("Комментарии не найдены или задача не существует.");
      return [];
    }

    return comments.map(({ id, body, author, createdAt }) => ({
      id,
      body,
      user: { login: author?.login || "Unknown" },
      createdAt,
    }));
  } catch (error) {
    handleError(error);
    throw new Error(
      "Не удалось получить комментарии. Проверьте данные задачи."
    );
  }
}

function handleGraphQLErrors(response) {
  if (response.data.errors) {
    console.error("GraphQL ошибки:", response.data.errors);
    throw new Error("Ошибка GraphQL: " + response.data.errors[0]?.message);
  }
}

async function getRepositories(userToken) {
  try {
    const response = await axios.get("https://api.github.com/user/repos", {
      headers: { Authorization: `token ${userToken}` },
    });
    return response.data;
  } catch (error) {
    console.error(
      "Ошибка при получении репозиториев:",
      error.response?.data || error.message
    );
    throw new Error("Не удалось получить репозитории. Проверьте токен.");
  }
}

async function getProjectsV2(userToken, owner, repo) {
  const query = `
    query ($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        projectsV2(first: 10) {
          nodes {
            id
            title
            url
          }
        }
      }
    }
  `;

  const variables = { owner, repo };

  try {
    const response = await axios.post(
      "https://api.github.com/graphql",
      { query, variables },
      {
        headers: {
          Authorization: `Bearer ${userToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    // Проверка ошибок GraphQL
    handleGraphQLErrors(response);

    // Извлечение проектов из данных ответа
    const projects = response?.data?.data?.repository?.projectsV2?.nodes || [];

    if (!projects.length) {
      console.log("Проекты не найдены или данные некорректны.");
      return [];
    }

    return projects;
  } catch (error) {
    handleError(
      error,
      "Не удалось получить проекты. Проверьте токен или данные репозитория."
    );
  }
}
// Функция для глубокого логирования объектов
function deepLog(obj) {
  return JSON.stringify(obj, null, 2); // Печатает объект с отступами
}

async function getTaskDetails(userToken, taskId) {
  const query = `
    query ($taskId: ID!) {
      node(id: $taskId) {
        ... on ProjectV2Item {
          id
          content {
            ... on Issue {
              title
              body
              url
              createdAt
              updatedAt
              assignees(first: 10) {
                nodes {
                  login
                }
              }
              number
              repository {
                owner {
                  login
                }
                name
                isInOrganization
              }
              id
            }
            ... on DraftIssue {
              title
              body
            }
          }
          fieldValues(first: 50) {
            nodes {
              ... on ProjectV2ItemFieldValueCommon {
                field {
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                  }
                  ... on ProjectV2Field {
                    id
                    name
                  }
                }
              }
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
              }
              ... on ProjectV2ItemFieldTextValue {
                text
              }
              ... on ProjectV2ItemFieldDateValue {
                date
              }
              ... on ProjectV2ItemFieldNumberValue {
                number
              }
              ... on ProjectV2ItemFieldIterationValue {
                title
                duration
              }
            }
          }
          project {
            number
          }
        }
      }
    }
  `;

  const variables = { taskId };

  try {
    const response = await axios.post(
      "https://api.github.com/graphql",
      { query, variables },
      {
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    handleGraphQLErrors(response);

    const taskData = response.data?.data?.node;
    if (!taskData) {
      throw new Error(`Задача с taskId ${taskId} не найдена.`);
    }

    const issue = taskData.content;
    const fields = formatFields(taskData.fieldValues.nodes);
    const assignees = formatAssignees(issue?.assignees?.nodes);
    const projectNumber = taskData.project?.number || "Unknown";
    const url = generateCustomUrl(issue, projectNumber, taskData.id);

    return {
      id: taskData.id,
      title: issue?.title || "Без названия",
      body: issue?.body || "Нет описания",
      url,
      createdAt: issue?.createdAt || null,
      updatedAt: issue?.updatedAt || null,
      assignees,
      fields,
    };
  } catch (error) {
    handleError(error, "Не удалось получить данные о задаче.");
  }
}

// Вспомогательная функция для форматирования полей задачи
function formatFields(fields) {
  return fields.map((fieldValue) => {
    const fieldName = fieldValue?.field?.name || "Unknown";
    const value =
      fieldValue.name || // SingleSelect
      fieldValue.text || // Text field
      fieldValue.date || // Date field
      fieldValue.number || // Number field
      fieldValue.title || // Iteration field
      null;

    return { fieldName, value };
  });
}

// Вспомогательная функция для форматирования списка назначенных пользователей
function formatAssignees(assignees) {
  return (
    assignees?.map((assignee) => assignee.login).join(", ") || "Не назначен"
  );
}

// Вспомогательная функция для генерации ссылки на задачу
function generateCustomUrl(issue, projectNumber, taskId) {
  if (!issue?.repository) return issue?.url;

  const ownerType = issue.repository.isInOrganization ? "orgs" : "users";
  return `https://github.com/${ownerType}/${issue.repository.owner.login}/projects/${projectNumber}/views/1?pane=issue&itemId=${taskId}&issue=${issue.repository.owner.login}%7C${issue.repository.name}%7C${issue.number}`;
}

export {
  getRepositories,
  getTasks,
  getComments,
  getProjectsV2,
  getTaskDetails,
  getProjectFields,
};
