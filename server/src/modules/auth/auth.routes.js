import {Router} from "express";
import {
    register,
    login,
    refreshToken,
    logout,
    // verifyEmail,
    // forgetPassword
} from "./auth.controller.js";

const router = Router();

router.get('/',(req,res)=>{
    return res.status(200).send("Router home");
})

router.post("/register",register);
router.post("/login",login);
router.post("/refresh-token",refreshToken);
router.post("/logout",logout);
// router.post("/verify-email",verifyEmail);
// router.post("/forget-password",forgetPassword);

export default router;
