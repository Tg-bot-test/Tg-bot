import { DataTypes, Model } from 'sequelize'
import sequelize from '../../config/database.js'

class User extends Model {}

User.init(
	{
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		telegram_id: {
			type: DataTypes.BIGINT,
			allowNull: false,
		},
		github_username: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		github_token: {
			type: DataTypes.STRING,
			allowNull: true, // Теперь токен может быть null
		},
		created_at: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: DataTypes.NOW,
		},
		updated_at: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: DataTypes.NOW,
		},
	},
	{
		sequelize: sequelize,
		modelName: 'User',
		tableName: 'users',
		timestamps: false,
		underscored: true,
		indexes: [
			{ fields: ['telegram_id'], unique: true },
			{ fields: ['github_token'], unique: false },
		],
	}
)

User.beforeUpdate(user => {
	user.updated_at = new Date()
})

export default User
