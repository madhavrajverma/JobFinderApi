const User = require('../models/user');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const ErrorHadnler = require('../utils/errorHandler');
const sendToken = require('../utils/jwtToken');
const fs = require('fs');
const path = require('path');
const Job = require('../models/jobs')
const APIFilter = require('../utils/apifilter')
const cloudinary = require('cloudinary');




const Test = require('../models/testModel')

// Get Current user profrils => /api/v1/me


exports.getUserProfile = catchAsyncErrors(async (req,res,next) => {
    
    const user = await User.findById(req.user.id)
    .populate({ 
        path:'jobPublished',
        select:'title postingDate'
    })

    if(!user) {
        return next(new ErrorHadnler('Invalid User id',401));
    }
    res.status(200).json({
        success: true,
        data: user
    })
})


//Update current  user Password  => /api/v1/password/update

exports.updatePassword = catchAsyncErrors (async (req,res,next) => {
    const user = await User.findById(req.user.id).select('+password');

    // check previous user password

    const isMatched = await user.comparePassword(req.body.currentPassword);

    if(!isMatched) {
        return next(new ErrorHadnler('password is incorrect',401));
    } 

    user.password = req.body.newPassword;
    await user.save();
    

    sendToken(user,200,res);
})


// Update Current User Data => /api/v1/me/update

exports.updateUser = catchAsyncErrors(async (req,res,next)=> {
    const newUserData =   {
        name:req.body.name,
        email:req.body.email
    }

    const user = await User.findByIdAndUpdate(req.user.id,newUserData, {
        new :true,
        runValidators:true,
    })

    res.status(200).json({
        success: true,
        data:user
    })
})


// Update userProfileImage or Comapany logo for industry =>api/v1/me/update/image

exports.updateUserProfile = catchAsyncErrors(async (req,res,next)=> {
   
    console.log(req.files.file)

    const result = await cloudinary.v2.uploader.upload(req.files.file.tempFilePath, {
        folder: 'userImage',
        width: 150,
        crop: "scale"
    })

    console.log(result.secure_url)

    
    //   const file = req.files.file;
    //   const oldFileName = file.name;
    //   console.log(oldFileName)
    
      // check file type
    
    //   const supportedFile = /.png|.jpg/;
    
    //   if (!supportedFile.test(path.extname(file.name))) {
    //     return next(new ErrorHandler("please Upload document file", 400));
    //   }
    
      // check document size
    
    //   if (file.size > process.env.MAX_FILE_SIZE) {
    //     return next(new ErrorHandler("Please upload file less than 2 MB", 400));
    //   }
    
      // Renaming resume
    
    //   file.name = `${req.user.name.replace(" ", "_")}_${oldFileName}${
    //     path.parse(file.name).ext
    //   }`;
      

    //   let uploadPath = `${process.env.UPLOAD_PATH}/${file.name}`
    
    //   file.mv(uploadPath, async (err) => {
    //     if (err) {
    //       console.log(err);
    //       return next(new ErrorHandler("Image Upload failed", 500));
    //     }
    
    

        let user = await User.findById(req.user.id)
        user.userImage = result.secure_url
        await user.save()
    
        res.status(200).json({
          success: true,
          message: "Applied to job succesfully",
          data: result.secure_url,
        });
    })
// })

// Delet Curren User = > api/v1/me/delete 

exports.deleteUser = catchAsyncErrors( async (req, res, next) => {

   await deleteUserData(req.user.id, req.user.role);
    
    const user = await User.findByIdAndDelete(req.user.id);

    res.cookie('token', 'none', {
        expires : new Date(Date.now()),
        httpOnly : true
    });

    res.status(200).json({
        success : true,
        message : 'Your account has been deleted.'
    })
});


// Show all applied Jobs => /api/jobs/applied

exports.getAppliedJobs = catchAsyncErrors(async (req,res,next) => {
    const jobs = await Job.find({'applicantsApplied.id' : req.user.id}).select('+applicantsApplied');

    res.status(200).json({
        success: true,
        results : jobs.length,
        data:jobs
    })
})


//show all jobs published by employeer => /api/v1/jobs/published


exports.getPublishedJobs = catchAsyncErrors(async (req,res,next) => {
    const jobs = await Job.find({user:req.user.id});

    res.status(200).json({
        success:true,
        results : jobs.length,
        data:jobs
    })
})

// adding controller methods only acessible by admins

//Show all user => /api/v1/users

exports.getUser = catchAsyncErrors(async (req,res,next) => {
    const apiFilters = new APIFilter(User.find(),req.query)
                            .filter()
                           .sort()
                           .limitFields()
                           .searchByQuery()
                           .pagination();

    const users = await apiFilters.query;

    res.status(200).json({
        success: true,
        results: users.length,
        data:users
    })
})

// Delete User(Admin) => /api/v1/user/:id/delete
exports.deleteUserByAdmin = catchAsyncErrors(async (req,res,next) => {
    const user = await User.findById(req.params.id)

    if(!user) {
        return next(new ErrorHandler('User not found with id',404))
    }


   await deleteUserData(user._id,user.role)
   user.remove()

   res.status(200).json({
       success: true,
       message: 'User is deleted   by admin '
   })
})


// Delete user files and employeer jobs
async function deleteUserData(user, role) {
    if(role === 'employeer') {
        await Job.deleteMany({user : user});
    }

    if(role === 'user') {
        const appliedJobs = await Job.find({'applicantsApplied.id' : user}).select('+applicantsApplied');

        for(let i=0; i<appliedJobs.length; i++) {
            let obj = appliedJobs[i].applicantsApplied.find(o => o.id === user);
            console.log(__dirname);
            let filepath = `${__dirname}/public/uploads/${obj.resume}`.replace('\controller', '');

            fs.unlink(filepath, err => {
                if(err) return console.log(err);
            });

            appliedJobs[i].applicantsApplied.splice(appliedJobs[i].applicantsApplied.indexOf(obj.id));

             appliedJobs[i].save();
        }
    }
}


exports.uploadData  = catchAsyncErrors(async (req,res,next) => {
    if (!req.files) {
        return next(new ErrorHandler("Please Upload file", 400));
      }
    
      const file = req.files.file;
      const oldFileName = file.name;
    
      // check file type
    
      const supportedFile = /.png|.jpg/;
    
      if (!supportedFile.test(path.extname(file.name))) {
        return next(new ErrorHandler("please Upload document file", 400));
      }
    
      // check document size
    
      if (file.size > process.env.MAX_FILE_SIZE) {
        return next(new ErrorHandler("Please upload file less than 2 MB", 400));
      }
    
      // Renaming resume
      let uploadPath = `${process.env.UPLOAD_PATH}/${file.name}`
    
      file.mv(uploadPath, async (err) => {
        if (err) {
          console.log(err);
          return next(new ErrorHandler("Image Upload failed", 500));
        }
    
        const newData = new Test({
            imageUrl:uploadPath
        })

        await newData.save()
    
        res.status(200).json({
          success: true,
          message: "Image Upload  succesfully",
          data: file.name,
        });
    })
})


exports.getData  = catchAsyncErrors(async (req,res,next) => {
    let data = await Test.find();

    res.status(200).json({
        success: true,
        message: 'Result Fetched succesfully',
        data:data
    })
})