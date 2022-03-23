const mongoose = require('mongoose');


const testSchema = mongoose.Schema({
    imageUrl: {
        type:String,
    }
})

module.exports = mongoose.model('Test',testSchema)
