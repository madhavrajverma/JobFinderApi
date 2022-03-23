const jwt = require('jsonwebtoken')
const User = require('../models/user')
const catchAsycnErrors = require('../middlewares/catchAsyncErrors')
const ErrorHandler = require('../utils/errorHandler')


// Check if a user is authenticated or not authenticated

exports.isAuthenticated = catchAsycnErrors(async(req,res,next) => {
    let token;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if(!token) {
        return next(new ErrorHandler('Log in first to acces this resourse',401));
    }
     const decoded = jwt.verify(token , process.env.JWT_SECRET);
     req.user = await User.findById(decoded.id);
     next();
});

// this is code on tv really amazing look 

//Handling users roles


exports.authorizeRoles = (...roles) => {
    return(req,res,next) => {
        if(!roles.includes(req.user.role)) {
            return next(new ErrorHandler(`Role(${req.user.role})is not allowed to acces this resoursec` ,403 ))
        }

        next();
    }
}