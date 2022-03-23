const Job = require("../models/jobs");
const geoCoder = require("../utils/geocoder");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const APIFilter = require("../utils/apifilter");
const path = require("path");
const fs = require("fs");

// Get all Jobs => /api/v1/jobs/
exports.getJobs = catchAsyncErrors(async (req, res, next) => {
  const apiFilters = new APIFilter(Job.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .searchByQuery()
    .pagination();

  const jobs = await apiFilters.query;
  res.status(200).json({
    success: true,
    results: jobs.length,
    data: jobs,
  });
});

// create a new Job => /api/v1/job/new

exports.newJob = catchAsyncErrors(async (req, res, next) => {
  //Adding user to body and
  req.body.user = req.user.id;
  const job = await Job.create(req.body);

  res.status(200).json({
    success: true,
    message: "Job created successfully",
    data: job,
  });
});

// Get a single Job with id and slug => /api/v1/job/:id/:slug

exports.getJob = catchAsyncErrors(async (req, res, next) => {
  const job = await Job.find({
    $and: [{ _id: req.params.id }, { slug: req.params.slug }],
  }).populate({
    path: "user",
    select: "name",
  });

  if (!job || job.length == 0) {
    return next(new ErrorHandler("Job Not Found", 404));
  }

  res.status(200).json({
    success: true,
    data: job,
  });
});



// Update a job =>/api/v1/job/:id

exports.updateJob = catchAsyncErrors(async (req, res, next) => {
  let job = await Job.findById(req.params.id);

  if (!job) {
    return next(new ErrorHandler("Job Not Found", 404));
  }

  // check if the user is owner
  if (job.user.toString() != req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorHandler(
        `User ${req.params.id} is not allowed to update this job`
      )
    );
  }
  job = await Job.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  return res.status(200).json({
    success: true,
    message: "Job updated successfully",
    data: job,
  });
});

// Delete the job => /api/v1/job/:id

exports.deleteJob = catchAsyncErrors(async (req, res, next) => {
  let job = await Job.findById(req.params.id).select('+applicantsApplied');

  if (!job) {
    return next(new ErrorHandler("Job Not Found", 404));
  }

  if (job.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorHandler(
        `User ${req.params.id} is not allowed to delete this job`
      )
    );
  }

  // Delleteing files asscoiated with job name

  for (let i = 0; i < job.applicantsApplied.length; i++) {
    let filepath = `${__dirname}/public/uploads/${job.applicantsApplied[i].resume}`.replace(
      "controller",
      "" 
    );

    fs.unlink(filepath, (err) => {
      if (err) return console.log(err);
    });
  }

  job = await Job.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Job deleted successfully",
  });
});

//Search jobs with in radius => /api/v1/jobs/:zipcode/:distance

exports.getJobsInRadius = catchAsyncErrors(async (req, res, next) => {
  const { zipcode, distance } = req.params;
  // fetch latitude and longitude form geoCoder with zipcode

  const loc = await geoCoder.geocode(zipcode);
  const latitude = loc[0].latitude;
  const longitude = loc[0].longitude;

  const radius = distance / 3963;

  const jobs = await Job.find({
    location: {
      $geoWithin: {
        $centerSphere: [[longitude, latitude], radius],
      },
    },
  });

  res.status(200).json({
    success: true,
    results: jobs.length,
    data: jobs,
  });
});

// Get stats about a topic(job) => /api/v1/stats/:topic

exports.jobStats = catchAsyncErrors(async (req, res, next) => {
  const stats = await Job.aggregate([
    {
      $match: { $text: { $search: '"' + req.params.topic + '"' } },
    },
    {
      $group: {
        _id: { $toUpper: "$experience" },
        totalJobs: { $sum: 1 },
        avgPostion: { $avg: "$positions" },
        avgSalary: { $avg: "$salary" },
        minSalary: { $min: "$salary" },
        maxSalary: { $max: "$salary" },
      },
    },
  ]);

  if (stats.length == 0) {
    return next(
      new ErrorHandler(`No stats found for - ${req.params.topic}`, 200)
    );
  }

  res.status(200).json({
    success: true,
    data: stats,
  });
});

// apply to job using resume  => /api/v1/job/:id/apply

exports.applyJob = catchAsyncErrors(async (req, res, next) => {
  let job = await Job.findById(req.params.id).select("+applicantsApplied");

  if (!job) {
    return next(new ErrorHandler("Job not found", 404));
  }
  // check that if job last data has been passed or not

  if (job.lastDate < new Date(Date.now())) {
    return next(
      new ErrorHandler("You cannot appiled to this job date is Over", 400)
    );
  }
  // check if user has applied befort

  for (let i = 0; i < job.applicantsApplied.length; i++) {
    if (job.applicantsApplied[i].id === req.user.id) {
      return next(
        new ErrorHandler("You have already applied for this job.", 400)
      );
    }
  }

  // job = await Job.find({})

  // check the files that
  if (!req.files) {
    return next(new ErrorHandler("Please Upload file", 400));
  }

  const file = req.files.file;

  // check file type

  const supportedFile = /.docs|.pdf/;

  if (!supportedFile.test(path.extname(file.name))) {
    return next(new ErrorHandler("please Upload document file", 400));
  }

  // check document size

  if (file.size > process.env.MAX_FILE_SIZE) {
    return next(new ErrorHandler("Please upload file less than 2 MB", 400));
  }

  // Renaming resume

  file.name = `${req.user.name.replace(" ", "_")}_${job._id}${
    path.parse(file.name).ext
  }`;

  let uploadPath = `${process.env.UPLOAD_PATH}/${file.name}`
  file.mv(uploadPath, async (err) => {
    if (err) {
      console.log(err);
      return next(new ErrorHandler("Resume Upload failed", 500));
    }

    await Job.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          applicantsApplied: {
            id: req.user.id,
            resume: uploadPath,
          },
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Applied to job succesfully",
      data: file.name,
    });
  });
});
