import sharp from "sharp";
import cloudinary from "../utils/cloudinary.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";

export const createPost = async (req, res) => {
    try {
        const {caption} = req.body;
        const image = req.file;
        const authorId = req.id;

        if(!image){
            return res.status(400).json({
                message: "Image required!",
                success: false
            });
        }

        const optimizedBuffer = await sharp(image.buffer).resize({width:800, height:800, fit:'inside'}).toFormat('jpeg', {quality:80}).toBuffer();

        const fileUri = `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`;
        const cloudResponse = await cloudinary.uploader(fileUri);
        const post = await Post.create({
            caption,
            image:cloudResponse.secure_url,
            author:authorId
        });

        const user = await User.findById(authorId);
        if(user) {
            user.posts.push(post._id);
            await user.save();
        }

        await post.populate({path:'author', select:'-password'});
        return res.status(201).json({
            message: "Post created successfully.",
            success: true,
            post,
        });

    } catch (error) {
        console.error("createPost Error:", error);

        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });    
    }
};