const mongoose = require('mongoose');
const validator = require('validator');
const slugify = require('slugify');
const geoCoder = require('../utils/geocoder');



const jobSchema = new  mongoose.Schema({
    title : {
        type: 'String',
        required: [true,'please enter Job Title.'],
        trim :true,
        maxlength:[100,'Job title can not exceed 100 characters']
    },
    slug : String,
    description : {
        type:String,
        required: [true,'please enter Job Description'],
        maxlength:[1000,'Job description can not exceed 1000 characters']
    },
    email : {
        type:String,
        validate :[validator.isEmail, 'Please Add a valid email address']
    },
    address : {
        type:String,
        required:[true,'Please add an address']
    },
    location : {
        type: {
            type:String,
            enum : ['Point']
        },
        coordinates: {
            type:[Number],
            index:'2dsphere'
        },
        formattedAddress :String,
        city:String,
        state:String,
        zipcode:String,
        country:String

    },
    company : {
        type:String,
        required:[true,'Please add an Compamy Name']
    },
    industry : {
        type: [String],
        required:[true,'Please enter a industry for this Job'],
        enum:  {
            values : [
                'Business',
                'Information Technology',
                'Banking',
                'Educatoion/Training',
                'Telecomuniaction',
                'Other'
            ],
            message : 'Please select correct options for industry'
        }
    },
    jobType : {
        type:String,
        required:[true,'Please enter Job type'],
        enum : {
            values : [
                'FullTime',
                'PartTime',
                'Internship'
            ],
            message : 'Please select correct Option for Job Type'
        }
    }
    ,
    minEducation : {
        type:String,
        required:[true,'Please enter minimum education'],
        enum : {
            values : [
                'Bachelors',
                'Masters',
                'Phd'
            ],
            message : 'Please select correct options for Educatoion'
        }
    },
    positions : {
        type:Number,
        default:1
    },
    experience : {
        type:String,
        required:[true,'Please enter experience required'],
        enum : {
            values : [
                'No Experience',
                '1 Years - 2 Years',
                '2 Years - 5 Years',
                '5 Years+'
            ],
            message : 'Please select correct options for experince'
        }
    },
    salary : {
        type:Number,
        required:[true,'Please enter excpected salary for this job']
    },
    postingDate : {
        type:Date,
        default:Date.now
    },
    lastDate : {
        type:Date,
        default: new Date().setDate(new Date().getDate() + 10)
    },
    applicantsApplied : {
        type:[Object],
        select:false
    },
    user: {
        type:mongoose.Schema.ObjectId,
        ref : 'User',
        required: true
    },
    companyImage: {
        type:String,
    }
});

// Creating job slug befroe saving 

jobSchema.pre('save',function(next) {
   //Creating slug before saving to db
   this.slug  = slugify(this.title, {lower:true})
   next(); 
}) 

//Setting up location

jobSchema.pre('save',async function(next) {
    const loc = await geoCoder.geocode(this.address);
    this.location =  {
        type:'Point',
        coordinates:[loc[0].longitude,loc[0].latitude],
        formattedAddress:loc[0].formattedAddress,
        city:loc[0].city,
        state:loc[0].stateCode,
        zipcode:loc[0].zipcode,
        country:loc[0].countryCode
    }
    next();
})

module.exports = mongoose.model('Job',jobSchema);