import jwt from "jsonwebtoken";

const isAuthenticated = async (req, res, next) => {
    try {
        const token = req.cookie.token;
        if(!token){
            return res.status(401).json({
                message: "User Unauthorized.",
                success: false
            });
        }

        const decode = await jwt.verify(token, process.env.SECRET_KEY);
        if(!decode) {
            return res.status(401).json({
                message: "Invalid token!",
                success: false
            });
        }

        req.id = decode.userId;
        next();
        
    } catch (error) {
        console.error("Authentication Error:", error);

        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });    
    }
};