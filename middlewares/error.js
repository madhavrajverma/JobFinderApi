
const ErrorHandler = require('../utils/errorHandler')

module.exports =  (err,req,res,next) => {

   err.statusCode = err.statusCode || 500;

   if(process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
        success: false,
        error:err,
        errMessage :err.message,
        stack:err.stack

    })
}

if(process.env.NODE_ENV === 'production') {
   let error = {...err};
   error.message = err.message;

   // Wrong Mongoose Object ID Error Message
   if(err.name === 'CastError') {
       const message = `Resource Not found Invalid:${err.path}`;
       error = new ErrorHandler(message ,404);
   }




   // Handling mongoose validation error

   if(err.name == 'ValidationError') {
       const message = Object.values(err.errors).map(value => value.message);
       error = new ErrorHandler(message,400);
    }

    // Handling mongoose duplicate key errors
    if(err.code == 11000) {
        const message = `Duplicate ${Object.keys(err.keyValue)} entered`;
        error = new ErrorHandler(message, 400);
    }

    // Handling Wrong  jWT  token error 

    if(err.name === 'JsonWebTokenError') {
        const message = 'JSON token is invalid Try Again';
        error = new ErrorHandler(message,500);
    }

    // Handline TokenExpiredEroor 

    if(err.name == 'TokenExpiredError') {
        const message = 'Json web token is expired .Try again';
        error = new ErrorHandler(message,500);
    }
   res.status(error.statusCode).json( {
       success: false,
       message : error.message || 'Internal Server Error'
   })
}


}