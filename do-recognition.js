module.exports = {
	doRecognition : function (faceCollection,bucketName, bucketKey){
		const AWS = require("aws-sdk");
		AWS.config.update({
		  region: "us-west-2",
		  credentials : new AWS.SharedIniFileCredentials({profile: 'personal-account'})
		});
		const rekognition = new AWS.Rekognition({
			apiVersion: '2016-06-27'
		});
		const dynamodb = new AWS.DynamoDB({
			apiVersion: '2012-08-10'
		});
		var imageId = bucketName + "-" + bucketKey.replace(/\//g,"-");
		dynamodb.getItem({
			TableName : 'imageInfo',
			Key : {
				'bucket' : { S : bucketName },
				'image' : { S : bucketKey }
			}
		}).promise().then((data)=>{
			if(data.Item && data.Item.faceDetails) {
				// rekognition already run
				console.log("Already rekognition data for '" + bucketKey + ".  Skipping");
				return;
			}
			Promise.all([rekognition.detectLabels({
				Image: {
					"S3Object": { 
						"Bucket": bucketName,
						"Name": bucketKey
					}
				}
			}).promise(),rekognition.detectFaces({
				Image: {
					"S3Object": { 
						"Bucket": bucketName,
						"Name": bucketKey
					}
				}
			}).promise(),rekognition.indexFaces({
				"CollectionId": faceCollection,
				"Image": {
					"S3Object": {
					"Bucket": bucketName,
					"Name": bucketKey
					}
				},
				"ExternalImageId": imageId,
				"DetectionAttributes": [
					"ALL"
				]
			}).promise()]).then((data)=>{
				var docClient = new AWS.DynamoDB.DocumentClient();
				// console.log(data);
				docClient.put({
					TableName: 'imageInfo',
					Item: {
						'bucket' : bucketName,
						'image' : bucketKey,
						'labels' : data[0].Labels,
						'faceDetails' : data[1].FaceDetails,
						'faceIndex' : data[2]
					}
				}, function(err, data) {
					if (err) {
						console.log("Error", err);
					} else {
						// console.log(bucketKey);
					}
				});
			});
		});
	}
}