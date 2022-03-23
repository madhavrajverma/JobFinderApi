
const express = require('express');

const router = express.Router();





const {uploadData}  = require('../controller/testController'); 


router.route('/uplaod/data').post(uploadData);

module.exports = router;
