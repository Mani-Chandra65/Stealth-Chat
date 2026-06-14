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
        if (error.code === 'EMAIL_EXISTS' || error.code === 'EMAIL_DELETED') {
            return res.status(409).json({
                success: false,
                error: error.message,
                field: 'email'
            });
        }

        if (error.code === 'USERNAME_EXISTS' || error.code === 'USERNAME_DELETED') {
            return res.status(409).json({
                success: false,
                error: error.message,
                field: 'username'
            });
        }

        if (error.code === '23505') {
            const isEmailConflict = error.constraint?.includes('email');
            return res.status(409).json({
                success: false,
                error: isEmailConflict
                    ? 'A user with this email already exists. Contact the owner if you think this is a problem.'
                    : 'A user with this username already exists.',
                field: isEmailConflict ? 'email' : 'username'
            });
        }

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

export const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.cookies;
        
        if (!refreshToken) {
            return res.status(401).json({ success: false, message: 'Refresh token missing' });
        }

        const data = await authService.refreshAuthToken(refreshToken);

        res.status(200).json({
            success: true,
            accessToken: data.accessToken,
            user: data.user
        });
    } catch (error) {
        res.clearCookie('refreshToken');
        res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }
};

export const logout = async (req, res, next) => {
    try {
        const { refreshToken } = req.cookies;
        
        await authService.logout(refreshToken);
        res.clearCookie('refreshToken');
        
        res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
};
