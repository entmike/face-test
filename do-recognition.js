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
		var imageId = bucketName + "-" + bucketKey.replace(/\//g,"-");
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
	}
}