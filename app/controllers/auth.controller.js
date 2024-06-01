require("dotenv").config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const responseFormatter = require("../helpers/responseFormatter");
const sendMail = require("../helpers/email");
const { User, Role } = require("../models");

class AuthController {
  static register = async (req, res) => {
    try {
      const {
        name,
        email,
        password
      } = req.body;
      const clearEmail = email.toLowerCase();

      const emailExist = await User.findOne({ where: { email: email } });

      if (emailExist) {
        return res
          .status(409)
          .json(
            responseFormatter.error(null, "Email already exist", res.statusCode)
          );
      }

      const salt = process.env.SALT;
      const encryptedPassword = await bcrypt.hash(password + salt, 10);

      const user = await User.create({
        name: name,
        email: clearEmail,
        password: encryptedPassword,
        is_active: false,
        role_id: 2,
      });

      const userData = {
        id: user.dataValues.user_id,
        name: user.dataValues.name,
        email: user.dataValues.email
      };

      const mailOptions = {
        from: "BAGUS.10119064 <bagus.10119064@mahasiswa.unikom.ac.id>",
        to: clearEmail,
        subject: "Account Activation",
        html: `<a href='http://localhost:5173/activation?token=${btoa(
          JSON.stringify(userData)
        )}'>Click this link to activate your account</a>`,
      };

      sendMail(mailOptions);

      return res
        .status(201)
        .json(
          responseFormatter.success(
            userData,
            "User created",
            res.statusCode
          )
        );
    } catch (error) {
      return res
        .status(500)
        .json(responseFormatter.error(null, error.message, res.statusCode));
    }
  };

  static async login(req, res) {
    try {
      const { email, password } = req.body;
      const clearEmail = email.toLowerCase();
      const salt = process.env.SALT;
      
      const user = await User.findOne(
      { 
        where: { email: clearEmail } ,
        attributes: {
          exclude: ["createdAt", "updatedAt"]
        },
        include: [
          {
            model: Role,
            attributes: ["role_id", "role_name"],
          }
        ],
      }
      );
      
      if (!user) {
        return res.status(404).json(responseFormatter.error(null, "User not foud!", res.statusCode));
      }
      
      if(!user.is_active) {
        return res.status(401).json(responseFormatter.error(null, "Your account is not active, please check your email!", res.statusCode));
      }

      const isMatch = await bcrypt.compare(password + salt, user.password);

      if (!isMatch) {
        return res.status(401).json(responseFormatter.error(null, "email or password doesn't match!", res.statusCode));
      }

      const token = jwt.sign({
        name: user.name,
        email: user.email,
        role: user.role
      }, process.env.JWT_SIGNATURE_KEY);

      return res.status(200).json(responseFormatter.success(
        { 
          token, 
          user : {
            id: user.user_id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        }, "Authenticated", res.statusCode));
    } catch (error) {
      return res.status(500).json(responseFormatter.error(null, error.message, res.statusCode));
    }
  }

  static activation = async (req, res) => {
    try {
      const { token } = req.body;
      const userId = JSON.parse(atob(token)).id

      const employee = await User.findByPk(userId);

      if (!employee) {
        return res.status(404).json(responseFormatter.error(employee, "User not found", res.statusCode));
      }

      const retrivied = await User.update({
        is_active: true
      }, {
        where: {
          user_id: userId
        }
      });

      return res.status(200).json(responseFormatter.success(retrivied, "your account has been successfully activate", res.statusCode));
    } catch (error) {
      return res.status(500).json(responseFormatter.error(null, error.message, res.statusCode));
    }
  }

  static async requestForgotPassword(req, res) {
    try {
      const { email } = req.body;
      const clearEmail = email.toLowerCase();

      const emailExist = await User.findOne({ 
        where: { email: clearEmail },
        attributes: {
          exclude: ["is_active", "password", "createdAt", "updatedAt"]
        }
      });

      if (!emailExist) {
        return res.status(404).json(responseFormatter.error(emailExist, "Email not registered", res.statusCode));
      } 

      const mailOptions = {
        from: "BAGUS.10119064 <bagus.10119064@mahasiswa.unikom.ac.id>",
        to: email,
        subject: "Reset Password",
        html: `<p>Click this link to reset your password <a href="http://localhost:5173/reset-password?token=${btoa(JSON.stringify(emailExist))}">Reset Password</a></p>`
      };

      sendMail(mailOptions);

      return res.status(200).json(responseFormatter.success(emailExist, "link to reset password has been sent to your email", res.statusCode));
    } catch (error) {
      return res.status(500).json(responseFormatter.error(null, error.message, res.statusCode));
    }
  }

  static async resetPassword(req, res) {
    try {
      const { token, password } = req.body;
      const userId = JSON.parse(atob(token)).user_id;

      const employee = await User.findByPk(userId, {
        attributes: {
          exclude: ["is_active", "password", "createdAt", "updatedAt"]
        }
      });

      if (!employee) {
        return res.status(404).json(responseFormatter.error(employee, "User not found", res.statusCode));
      }

      const salt = process.env.SALT;
      const encryptedPassword = await bcrypt.hash(password + salt, 10);

      await User.update({
        password: encryptedPassword,
      }, {
        where: {
          user_id: userId
        }
      });

      return res.status(200).json(responseFormatter.success(employee, "your password has been successfully changed", res.statusCode));
    } catch (error) {
      return res.status(500).json(responseFormatter.error(null, error.message, res.statusCode));
    }
  }
}

module.exports = AuthController;