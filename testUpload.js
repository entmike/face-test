const FaceServer = require("./index");
const AWS = require("aws-sdk");
AWS.config.update({
	region: "us-west-2",
	credentials : new AWS.SharedIniFileCredentials({profile: 'personal-account'})
});

FaceServer.upload({
	AWS : AWS,
	bucket : "com.entmike.miketest2",
	file : "images/image.jpg",
	bucketKey : "testupload.jpg"
}).then(data=>{
	console.log(data);
}).catch(err=>{
	console.error(err);
});