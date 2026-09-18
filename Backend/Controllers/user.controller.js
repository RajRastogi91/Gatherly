import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";

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

export const login = async (req, res) => {
   try {
     const {email, password} = req.body;
    
     if(!email || !password) {
        return res.status(400).json({
            message: "All fields are required!",
            success: false
        });
     }
     let user = await User.findOne({email});
     if(!user) {
        return res.status(400).json({
            message: "Incorrect email.",
            succes: false
        });
     }

     const isPasswordMatch = await bcrypt.compare(password, user.password);
     if(!isPasswordMatch) {
        return res.status(400).json({
            message: "Incorrect password.",
            status: false
        });
     }
     
     user = {
        _id: User._id,
        username: User.username,
        email: User.email,
        profilePicture: User.profilePicture,
        bio: User.bio,
        followers: User.followers,
        following: User.following,
        posts: User.post,
     }

     const token = await jwt.sign({userId:user._id}, process.env.SECRET_KEY, {expiresIn:'1d'});
        return cookie('token', token, {httpOnly:true, sameSite:'strict', maxAge: 1*24*60*60*1000}).json({
            message: `Welcome back ${user.username}`,
            success: true,
            user
        });
    
   } catch (error) {
        console.error("Login Error:", error);

        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });  
   }
};

export const logout = async (_, res) => {
    try {
        return res.cookie("token", "", {maxAge:0}).json({
            message: "Logged out successfully!",
            success: true
        });

    } catch (error) {
        console.error("Logout Error:", error);

        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });  
    }
};

export const getProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        let user = await User.findById(userId);
        return res.status(200).json({
            user,
            success: true
        });

    } catch (error) {
        console.error("getProfile Error:", error);

        return res.status(500).json({
            message: "Internal server error.",
            success: false
        }); 
    }
};

export const editProfile = async (req, res) => {
    try {
        const userId = req.id;
        const {bio, gender} = req.body;
        let profilePicture = req.file;
        let cloudResponse;

        if(profilePicture) {
            const fileUri = getDataUri(profilePicture);
            cloudResponse = await cloudinary.uploader.upload(fileUri);
        }

        const user = await User.findById(userId);
        if(!user) {
            return res.status(404).json({
                message: "User not found.",
                success: false
            }); 
        }
        if(bio) user.bio = bio;
        if(gender) user.gender = gender;
        if(profilePicture) user.profilePicture = cloudResponse.secure_url;

        await user.save();

        return res.status(200).json({
            message: "Profile Updated Successfully!",
            success: true
        });

    } catch (error) {
        console.error("editProfile error", error);

        return res.status(500).json({
            message: "Internal Server Error.",
            success: false
        });
    }
};

export const getSuggestedUsers = async (req, res) => {
    try {
        const suggestedUsers = await User.find({_id:{$ne:req.id}}).select("-password");
        if(!suggestedUsers){
            return res.status(400).json({
                message: "Currently do not have any users."
            })
        };
        return res.status(200).json({
            success: true,
            users: suggestedUsers
        });
    } catch (error) {
        console.error("getSuggestedUsers error", error);

        return res.status(500).json({
            message: "Internal Server Error.",
            success: false
        });
    }
};

export const followUnfollow = async (req, res) => {
    try {
        const currentUserId = req.id;
        const targetUserId = req.params.id;

        // Cannot follow yourself
        if (currentUserId === targetUserId) {
            return res.status(400).json({
                message: "You cannot follow yourself.",
                success: false
            });
        }

        const currentUser = await User.findById(currentUserId);
        const targetUser = await User.findById(targetUserId);

        if (!targetUser) {
            return res.status(404).json({
                message: "User not found.",
                success: false
            });
        }

        // Check if already following
        const isFollowing = currentUser.following.includes(targetUserId);

        if (isFollowing) {
            // UNFOLLOW
            currentUser.following.pull(targetUserId);
            targetUser.followers.pull(currentUserId);

            await currentUser.save();
            await targetUser.save();

            return res.status(200).json({
                message: `You unfollowed ${targetUser.username}.`,
                success: true,
                following: false
            });
        }

        // FOLLOW
        currentUser.following.push(targetUserId);
        targetUser.followers.push(currentUserId);

        await currentUser.save();
        await targetUser.save();

        return res.status(200).json({
            message: `You are now following ${targetUser.username}.`,
            success: true,
            following: true
        });

    } catch (error) {
        console.error("Follow/Unfollow Error:", error);

        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
};