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

export const getAllPost = async (req, res) => {
    try {
        const posts = await Post.find().sort({createdAt:-1}).populate({path:'author', select:'username, profilePicture'}).populate({
        path:'comments',
        sort:{createdAt:-1},
        populate:{
            path:'author',
            select:'username, profilePicture'
        }
    });
    return res.status(200).json({
        posts,
        success:true
    });

    } catch (error) {
       console.error("getAllPost Error:", error);

        return res.status(500).json({
            message: "Internal server error.",
            success: false
        }); 
    }
};

export const getUserPost = async (req, res) => {
    try {
        const authorId = req.id;
        const posts = await Post.find({author:authorId}).sort({createdAt:-1}).populate({
            path:'author',
            select:'username, profilePicture'
        }).populate({
            path:'comments',
            sort:{createdAt:-1},
            populate:{
                path:'author',
                select:'username, profilePicture'
            }
        });

        return res.status(200).json({
        posts,
        success:true
        });
    } catch (error) {
        console.error("getUserPost Error:", error);

        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
};

export const likePost = async (req, res) => {
    try {
        const likedByUser = req.id;
        const postId = req.params.id;
        const post = await Post.findById(postId);
        if(!post) return res.status(404).json({
            message:'Post not found.',
            success:false
        });
        //like logic started
        await Post.updateOne({$addToSet: {likes: likedByUser}});
        await Post.save();
        //implement socket io for real time notification

        return res.status(200).json({
            message:'Post Liked.',
            success:true
        });
    } catch (error) {
        console.error("Like Error:", error);

        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
};

export const dislikePost = async (req, res) => {
    try {
        const likedByUser = req.id;
        const postId = req.params.id;
        const post = await Post.findById(postId);
        if(!post) return res.status(404).json({
            message:'Post not found.',
            success:false
        });
        //like logic started
        await Post.updateOne({$pull: {likes: likedByUser}});
        await Post.save();
        //implement socket io for real time notification

        return res.status(200).json({
            message:'Post disLiked.',
            success:true
        });
    } catch (error) {
        console.error("disLike Error:", error);

        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
};

export const addComment = async (req, res) => {
    try {
        const postId = req.params.id;
        const commentByUser = req.id;
        const {text} = req.body;

        const post = await Post.findyById(postId);
        if(!text) return res.status(400).json({
            message:"text is required.",
            success: false
        });

        const comment = await Comment.create({
            text,
            author:commentByUser,
            post:postId
        }).populate({
            path:'author',
            select:'username, profilePicture'
        });

        post.comments.push(comment._id);
        await post.save();

        return res.status(201).json({
            message:'comment added.',
            comment,
            success: true
        })

    } catch (error) {
        console.error("addComment Error:", error);

        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
};

export const getPostComments = async(req, res) => {
    try {
        const postId = req.params.id;

        const comments = await Comment.find({post:postId}).populate('author', 'username, profilePicture');

        if(!comments) return res.status(400).json({message:'no comments found on this post.', success:flase});

        return res.status(200).json({success:true, comments});
    } catch (error) {
        console.error("getPostComment Error:", error);

        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
};

export const deletePost = async (req, res) => {
    try {
        const postId = req. params.id;
        const authorId = req.id;

        const post = await Post.findById(postId);
        if(!post) return res.status(404).json({
            message:"post not found.",
            success: false
        });
        // check if logged-in user is the owner of post
        if(post.author.toString() !== authorId) return res.status(403).json({
            message:"Unauthorize user."
        });

        await Post.findByIdAndDelete(postId);

        // remove the post id from user's post
        let user = await User.findById(authorId);
        user.posts = user.posts.filter(id => id.toString() !== postId);
        await user.save();

        // delete associated comments
        await Comments.deleteMany({post:postId});
        return res.status(200).json({
            message:"post deleted.",
            success:true
        })

    } catch (error) {
        console.error("deletePost Error:", error);

        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
};

export const bookmarkPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id;
        const post = await Post.findById(postId);
        if(!post) return res.status(404).json({
            message:"Post not found.",
            success:false
        });

        const user = await User.findById(authorId);
        if(user.bookmarks.includes(post._id)){
            // already bookmarked
            await user.updateOne({$pull:{bookmarks:post._id}});
            await user.save();
            return res.status(200).json({
                type:'unsaved',
                message:'Post removed successfully.',
                success: true
            });
        } else{
            // remove from bookmark
            await user.updateOne({$addToSet:{bookmarks:post._id}});
            await user.save();
            return res.status(200).json({
                type:'saved',
                message:'post bookmarked',
                success:true
            });
        }
    } catch (error) {
        console.error("bookmarkPost Error:", error);

        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
}