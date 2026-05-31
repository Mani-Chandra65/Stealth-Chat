import * as authService from './auth.service.js';
import { registerSchema } from './auth.validation.js';

export const register = async (req,res,next)=>{
    try {
        const data = registerSchema.parse(req.body);
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
        const { email, passwordHash } = req.body;
        
        let deviceName = req.headers['user-agent'] || 'Unknown Device';
        let ipAddress = req.ip || req.connection.remoteAddress || 'Unknown IP';
        
        const loginData = await authService.login({ email, passwordHash, deviceName, ipAddress });
        
        res.cookie('refreshToken', loginData.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });

        res.status(200).json({
            success: true,
            message: 'Login successful',
            accessToken: loginData.accessToken,
            publicKey: loginData.publicKey,
            encryptedPrivateKey: loginData.encryptedPrivateKey,
            user: loginData.user
        });
    } catch (error) {
        next(error);
    }
}
