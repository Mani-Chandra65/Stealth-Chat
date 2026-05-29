import * as authService from './auth.service.js';
import { registerSchema } from './auth.validation.js';

export const register = async (req,res,next)=>{
    try {
        const data= registerSchema.parse(req.body);
        const user = await authService.register(data);
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        next(error);
    }
};

export const login = async (req,res,next) => {
    try {
        const { email, password } = req.body;
        const user = await authService.login({ email, password });
        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
}

// export const verifyEmail = async (req,res,next) => {
//     try {
//         const {otp} = req.body;
//         co
//     }
// }