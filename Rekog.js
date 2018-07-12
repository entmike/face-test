module.exports = {
	process : options=>{
		return new Promise((resolve,reject)=>{
			const rekognition = new options.AWS.Rekognition({
				apiVersion: '2016-06-27'
			});
			var imageId = options.bucket + "-" + options.bucketKey.replace(/\//g,"-");
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
					"ExternalImageId": imageId,
					"DetectionAttributes": [
						"ALL"
					]
				}).promise()
			]).then(data=>{
				var docClient = new options.AWS.DynamoDB.DocumentClient();
				docClient.put({
					TableName: options.table,
					Item: {
						'bucket' : options.bucket,
						'image' : options.bucketKey,
						'labels' : data[0].Labels,
						'faceDetails' : data[1].FaceDetails,
						'faceIndex' : data[2]
					}
				}).promise()
				.then(data=>{resolve("Done!")})
				.catch(err=>{reject(err);});
			}).catch(err=>{
				reject(err);
			});
		});
	}
}