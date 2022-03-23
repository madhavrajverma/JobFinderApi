const express = require('express');

const router = express.Router();

const  {registerUser,login,forgotPassword,resetPassword,logout} = require('../controller/authController')
const {isAuthenticated,authorizeRoles} = require('../middlewares/auth')


router.route('/register').post(registerUser)
router.route('/login').post(login)
router.route('/password/forgot').post(forgotPassword);
router.route('/password/reset/:token').put(resetPassword);
router.route('/logout').get(isAuthenticated,logout);


module.exports = router;