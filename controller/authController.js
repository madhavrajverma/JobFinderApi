const User = require('../models/user')
const catchAsyncErrors = require('../middlewares/catchAsyncErrors')
const ErrorHandler = require('../utils/errorHandler')
const sendToken = require('../utils/jwtToken');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');


// Register a new User  => /api/v1/register
exports.registerUser =  catchAsyncErrors (async (req,res,next) => {
    const {name ,email ,role ,password,userImage} =  req.body;
    
    const user = await User.create({
        name,
        email,
        password,
        role,
        userImage
    });

    // create JWT TOKEN 
   sendToken(user,200,res)
});

//Login User => /api/v1/login
exports.login =  catchAsyncErrors(async (req,res,next) => {
    const {email,password} = req.body;
    
    //Checks if email or password is entere by user

    if(!email || !password) {
        return next(new ErrorHandler('Please enter email and password',400));
    }

    // Finding user in database
     const user = await  User.findOne({email}).select('+password');
    

     if(!user) {
         return next(new ErrorHandler('Invalid email and password ',401));

     }

     // check if password is correct

     const isPasswordMatched = await user.comparePassword(password);
     

     if(!isPasswordMatched) {
         return next(new ErrorHandler('Invalid password',401))
     }

    // create JSON WEB TOken 

    sendToken(user,200,res)

});

//Forgot Password => api/v1/password/forgot
exports.forgotPassword = catchAsyncErrors(async (req,res,next) => {
    const  user = await User.findOne({email:req.body.email});
    if(!user) {
        return next(new ErrorHandler('Email doesnt exist',404));
    }
    // Get Reset Token from

    const resetToken = user.getResetPasswordToken();

    await user.save({validateBeforeSave:false});

    // create reset password url and redirect

    const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/password/reset/${resetToken}`;

    const message = `Your passwoord reset link is as follow :\n\n${resetUrl}\n\n
                  if you have not request this ,the please ignore that`

                  try {
                    await sendEmail({
                        email:user.email,
                        subject:'Password Reset email',
                        message
                    })
                
                    res.status(200).json({
                        success: true,
                        message:`Email sent succesfuly to ${user.email}`,
                    })
                  }catch(error) {
                      user.resetPasswordExpire = undefined;
                      user.resetPasswordToken = undefined;
                      await user.save({validateBeforeSave :false});

                      return next(new ErrorHandler('Email is not sent',500));
                  }
   

})

//Reset Password => /api/v1/password/reset/:token
exports.resetPassword = catchAsyncErrors(async (req,res,next) => {
    // Has Url token  

    const resetPasseordToken = crypto
                  .createHash('sha256')
                  .update(req.params.token)
                  .digest('hex');

  const user = await User.findOne({
             resetPasseordToken,
              resetPasswordExpire: {$gt:Date.now()}
})

if(!user) {
    return next(new ErrorHandler('Password reset token is invalid',400));
}

   // Setup new Password reset
   user.password = req.body.password;
   user.resetPasseordToken = undefined;
   user.resetPasswordExpire = undefined;
   
   await user.save();

   sendToken(user,200,res);

})

// Logout => /api/v1/logout

exports.logout = catchAsyncErrors(async (req,res,next) => {
    res.cookie('token','none', {
        expires: new Date(Date.now()),
        httpOnly: true
    })
    
    res.status(200).json({
        success: true,
        message:"Logged out successfully"
    })
})