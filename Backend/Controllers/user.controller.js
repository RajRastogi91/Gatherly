import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";

export const register = async (req, res) => {
    try {
        const {username, email, password} = req.body;

        if(!username || !email || !password){
            return res.status(400).json({
                message: "All fields are required.",
                success: false
            });
        }

        if (username.trim().length < 3) {
             return res.status(400).json({
                message: "Username must be at least 3 characters.",
                success: false
                });
            }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters.",
                success: false
            });
        }
        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({ email: normalizedEmail });
        if(existingUser){
             return res.status(401).json({
                message: 'Email already exist. Try a different email.',
                success: false
            });
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            username: username.trim(),
            email: normalizedEmail,
            password: hashedPassword
        });

        return res.status(201).json({
            message: 'Account Created Successfully!',
            success: true
        });

    } catch (error) {
        console.error("Register Error:", error);

        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
};