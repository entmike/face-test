module.exports = {
	upload : options=>{
		return new Promise((resolve,reject)=>{
			const fs = require("fs");
			if(options){
				var fields = "bucket,file,bucketKey,AWS".split(",");
				const s3 = new options.AWS.S3({
					apiVersion: '2006-03-01'
				});
				for(field of fields) if(options[field] === undefined) reject(`Field ${field} required for upload options.`);
				new Promise((resolve,reject)=>{
					fs.readFile(options.file, "base64", (err,data)=>{
						err ? reject(err) : resolve(data)
					})
				})
				.then(fileContents=>{
					s3.headObject({
						Bucket: options.bucket,	
						Key: options.bucketKey
					}).promise()
					.then((data)=>{
						// File already exists.
						console.log(bucketKey + " already exists.");
						// doRecognition(faceCollection,bucketName,bucketKey);
					},(err)=>{
						// console.log(bucketKey + " does not exist.");
						// uploadParams.Body = fs.createReadStream(imagePath + "/" + file);
						s3.upload ({
							Bucket: options.bucket,
							Key: options.bucketKey,
							Body: fileContents
						}).promise().then(
							(data)=>{
								console.log("File uploaded.")
								resolve("File uploaded.");
							},
							(err)=>{
								console.log("Error uploading to S3.");
								reject(`Error uploading to S3.${err}`);
							}
						);
					});
					resolve(data);
				})
				.catch(err=>{
					reject(`File upload failed.\n\n${err}`);
				});

			}else{
				reject("No options specified");
			}
		});
	}
}