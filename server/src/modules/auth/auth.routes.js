import {Router} from "express";
import {
    register,
    login,
    // verifyEmail,
    // refreshToken,
    // logout,
    // forgetPassword
} from "./auth.controller.js";

const router = Router();


router.get('/',(req,res)=>{
    return res.status(200).send("Router home");
})

router.post("/register",register);
router.post("/login",login);
// router.post("/verify-email",verifyEmail);
// router.post("/refresh-token",refreshToken);
// router.post("/logout",logout);
// router.post("/forget-password",forgetPassword);





export default router;
