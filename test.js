const fs = require('fs');
const path = require('path');
const doRecognition = require("./do-recognition").doRecognition;
var imagePath = process.argv[2];
var bucketName = "com.entmike.miketest2";
var faceCollection = "mike";

const AWS = require("aws-sdk");
AWS.config.update({
  region: "us-west-2",
  credentials : new AWS.SharedIniFileCredentials({profile: 'personal-account'})
});
const rekognition = new AWS.Rekognition({
	apiVersion: '2016-06-27'
});
const s3 = new AWS.S3({
	apiVersion: '2006-03-01'
});
const dynamodb = new AWS.DynamoDB({
	apiVersion: '2012-08-10'
});
Promise.all([
	rekognition.createCollection({ "CollectionId": faceCollection }).promise().catch((err)=>{
		// Face Collection might already exist
		console.error(err);
	}),
	s3.createBucket({"Bucket" : bucketName }).promise().catch((err)=>{
		// Bucket might already exist
	}),
	dynamodb.createTable({
		TableName : "imageInfo",
		KeySchema: [       
			{ AttributeName: "bucket", KeyType: "HASH" },
			{ AttributeName: "image", KeyType: "RANGE" }
		],
		AttributeDefinitions: [       
			{ AttributeName: "bucket", AttributeType: "S" },
			{ AttributeName: "image", AttributeType: "S" }
		],
		ProvisionedThroughput: {       
			ReadCapacityUnits: 10, 
			WriteCapacityUnits: 10
		}
	}).promise().catch((err)=>{
		// Table might already exist
	}),
	new Promise((resolve, reject)=>{
		fs.readdir(imagePath, (err, files) => {
			err ? reject(err) : resolve(files);
		});
	}).catch((err) => {
		throw("Cannot read directory.  Exiting,");
	})
]/*.map(p => p.catch((err)=>err))*/)
.then((data)=>{
	var fileList = data[3];
	var files = fileList.filter((e)=>{
		return path.extname(e).toLowerCase() === '.jpg';
	});
	for(var file of files){
		new Promise((resolve, reject)=>{
			var f = file;
			fs.readFile(imagePath + "/" + f, 'base64', (err, data) => {
				err ? reject(err) : resolve({file : f, data:data});
			});
			var bucketKey = imagePath + "/" + path.basename(file);
			s3.headObject({
				Bucket: bucketName,	
				Key: bucketKey
			}).promise()
			.then((data)=>{
				// File already exists.
				// console.log(bucketKey + " already exists.");
				doRecognition(faceCollection,bucketName,bucketKey);
			},(err)=>{
				// console.log(bucketKey + " does not exist.");
				var uploadParams = {Bucket: bucketName, Key: '', Body: ''};
				uploadParams.Key = bucketKey;
				uploadParams.Body = fs.createReadStream(imagePath + "/" + file);
				s3.upload (uploadParams).promise().then(
					(data)=>{doRecognition(faceCollection,bucketName,bucketKey);},
					(err)=>{console.log("Error uploading to S3.");}
				);
			});
		})
	}
});