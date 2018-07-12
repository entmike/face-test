const uuidv1 = require('uuid/v1');
module.exports = {
	process : options=>{
		return new Promise((resolve,reject)=>{
			const rekognition = new options.AWS.Rekognition({
				apiVersion: '2016-06-27'
			});
			var imageId = options.bucket + "-" + options.bucketKey.replace(/\//g,"-");
			var uuid = uuidv1();

			Promise.all([
				rekognition.detectLabels({
					Image: {
						"S3Object": { 
							"Bucket": options.bucket,
							"Name": options.bucketKey
						}
					}
				}).promise(),
				rekognition.detectFaces({
				Image: {
					"S3Object": { 
						"Bucket": options.bucket,
						"Name": options.bucketKey
					}
				}
				}).promise(),
				rekognition.indexFaces({
					"CollectionId": options.rekogCollection,
					"Image": {
						"S3Object": {
						"Bucket": options.bucket,
						"Name": options.bucketKey
						}
					},
					"ExternalImageId": uuid,
					"DetectionAttributes": [
						"ALL"
					]
				}).promise()
			]).then(rekogData=>{
				var docClient = new options.AWS.DynamoDB.DocumentClient();
				docClient.put({
					TableName: options.table,
					Item: {
						'bucket' : options.bucket,
						'image' : options.bucketKey,
						'ExternalImageId' : uuid,
						'labels' : rekogData[0].Labels,
						'faceDetails' : rekogData[1].FaceDetails,
						'faceIndex' : rekogData[2]
					}
				}).promise()
				.then(data=>{
					resolve(`Rekognition data successfully stored to ${options.table}.   ${rekogData[2].FaceRecords.length} faces detected.`)
				})
				.catch(err=>{reject(`Error writing to DynamoDB table ${options.table}\n\n${err}`);});
			}).catch(err=>{
				reject(err);
			});
		});
	}
}