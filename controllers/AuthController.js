const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const AuthController = {

    /* Register new user */
    async register(req, res) {
        try {
            const { username, email, password } = req.body;

            // Check if user already exists
            const existingUser = await User.findOne({
                $or: [{ email }, { username }]
            });

            if (existingUser) {
                return res.status(400).json({
                    type: "error",
                    message: existingUser.email === email ? "Email already registered" : "Username already taken"
                });
            }

            // Create new user
            const user = new User({ username, email, password });
            await user.save();

            // Generate JWT token
            const accessToken = jwt.sign(
                { id: user._id, username: user.username, isAdmin: user.isAdmin },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Remove password from response
            const userResponse = user.toObject();
            delete userResponse.password;

            res.status(201).json({
                type: "success",
                message: "User registered successfully",
                data: {
                    user: userResponse,
                    accessToken
                }
            });

        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                type: "error",
                message: "Registration failed",
                error: error.message
            });
        }
    },

    /* Login user */
    async login(req, res) {
        try {
            const { username, password } = req.body;

            // Find user by username or email
            const user = await User.findOne({
                $or: [{ username }, { email: username }]
            });

            if (!user) {
                return res.status(400).json({
                    type: "error",
                    message: "Invalid credentials"
                });
            }

            // Check password
            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                return res.status(400).json({
                    type: "error",
                    message: "Invalid credentials"
                });
            }

            // Generate JWT token
            const accessToken = jwt.sign(
                { id: user._id, username: user.username, isAdmin: user.isAdmin },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Remove password from response
            const userResponse = user.toObject();
            delete userResponse.password;

            res.status(200).json({
                type: "success",
                message: "Login successful",
                data: {
                    user: userResponse,
                    accessToken
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                type: "error",
                message: "Login failed",
                error: error.message
            });
        }
    },

    /* Get user profile */
    async getProfile(req, res) {
        try {
            const user = await User.findById(req.user.id).select('-password');
            
            if (!user) {
                return res.status(404).json({
                    type: "error",
                    message: "User not found"
                });
            }

            res.status(200).json({
                type: "success",
                data: user
            });

        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to get profile",
                error: error.message
            });
        }
    }
};

module.exports = AuthController;