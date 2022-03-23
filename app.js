const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet')
const mongoSantize = require('express-mongo-sanitize')
const xssClean = require('xss-clean')
const hpp = require('hpp');
const cors = require('cors')
const path = require('path')

const cloudinary = require('cloudinary')
const bodyParser = require('body-parser')

cloudinary.config({ 
    cloud_name: 'dj5nxkcmj', 
    api_key: '139277927443753', 
    api_secret: 'BPnD7N9b0YgCb3oF1O-VyKTXhDg',
    secure: true
  });


const app = express();
const ErrorHandler = require('./utils/errorHandler')

const connectDatabase = require('./config/database');



// Setting up config.env

dotenv.config({path: './config/config.env'});

//Handling uncaught exceptions

process.on('uncaughtException', err => {
    console.log(`Error ${err.message}`)
    console.log('shutting  down the server due to uncaught exceptions')
    procces.exit(1)
})


//connceting to databse

connectDatabase()

const errorMiddleware = require('./middlewares/error')

//  Setup Json  Body parser 

app.use(express.json());



app.use(bodyParser.urlencoded({ extended: true }));



//Set cookie parser

app.use(cookieParser());


// handle file uploads

app.use(fileUpload({
    useTempFiles:true
}));

// Snatize data 

app.use(mongoSantize());

// prevetn XSS attacks 

app.use(xssClean());


//prevetn paramter polution 

app.use(hpp({
    whitelist:['positions']
}));

// Rate Limiting 

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  });
  
// Setup cors  accesible by any domain

app.use(cors())

  //  apply to all requests
  app.use(limiter);


  // setup security headers
app.use(helmet());

// Creating own Middleware


//Importing routes 

const jobs = require('./routes/jobs');
const auth = require('./routes/auth');
const user = require('./routes/user')


app.use('/public/uploads', express.static(path.join(__dirname,'public/uploads')))






const PORT = process.env.PORT;


// app.use('/api/v1',test)

const {uploadData,getData} = require('./controller/userController')

app.post('/upload/data' , uploadData )

app.get('/get/data',getData);

app.use('/api/v1',jobs);
app.use('/api/v1/',auth);
app.use('/api/v1/',user);



// handle unhandled routes

app.all('*',(req,res,next) => {
    next(new ErrorHandler(`${req.originalUrl} route not found`,404));
})


// Middleware to handle error
app.use(errorMiddleware);


const server = app.listen(PORT, () => { 
    console.log(`Server Started on port${process.env.PORT} in ${process.env.NODE_ENV} mode`);
} );

//Handling unhandled  promise rejection errors

process.on('unhandledRejection',err => {
    console.log(`Error ${err.message}`)
    console.log('shutting down server due to unhandled promise rejection')
    server.close( ()=> {
        process.exit(1)
    })
});

