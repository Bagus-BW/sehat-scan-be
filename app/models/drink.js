'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class drink extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.hasMany(models.drink_detail, {
        foreignKey: {
          name: "drink_id"
        },
        onDelete: "CASCADE",
        hooks: true
      })
    }
  }
  drink.init({
    drink_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true
    },
    drink_name: DataTypes.STRING,
    description: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'drink',
  });

  drink.removeAttribute("id");
  
  return drink;
};