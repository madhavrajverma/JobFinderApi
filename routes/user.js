const express = require('express');


const router  = express.Router();

const {
    getUserProfile,
    updatePassword,
    updateUser,
    deleteUser,
    getAppliedJobs,
    getPublishedJobs,
    getUser,
    deleteUserByAdmin,
    updateUserProfile,

}  = require('../controller/userController')
const {isAuthenticated,authorizeRoles} =  require('../middlewares/auth');

// router.use(isAuthenticated);



// router.route('/uplaod/data').put(uploadData);

router.route('/me').get(isAuthenticated,getUserProfile);
router.route('/password/update').put(isAuthenticated,updatePassword);
router.route('/me/update').put(isAuthenticated,updateUser)
router.route('/me/delete').delete(isAuthenticated,deleteUser)
router.route('/jobs/applied').get(isAuthenticated,authorizeRoles('user'),getAppliedJobs)
router.route('/jobs/published').get(isAuthenticated,authorizeRoles('employeer','admin'),getPublishedJobs)
router.route('/me/update/image').put(isAuthenticated,updateUserProfile);
// Admin olny routes

router.route('/users').get(isAuthenticated,authorizeRoles('admin'),getUser)
router.route('/user/:id').delete(isAuthenticated,authorizeRoles('admin'),deleteUserByAdmin)


module.exports = router;