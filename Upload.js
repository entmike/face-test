module.exports = {
	upload : options=>{
		return new Promise((resolve,reject)=>{
			const fs = require("fs");
			if(options){
				var fields = "bucket,file,bucketKey,AWS,table,rekogCollection".split(",");
				const s3 = new options.AWS.S3({
					apiVersion: '2006-03-01'
				});
				for(field of fields) if(options[field] === undefined) reject(`Field ${field} required for upload options.`);
				new Promise((resolve,reject)=>{
					fs.readFile(options.file, (err,data)=>{
						err ? reject(err) : resolve(data)
					})
				})
				.then(fileContents=>{
					new Promise((resolve,reject)=>{
						// Rejecrt is actually a good thing in this scenario...
						if(options.overwrite) reject("Overwrite Set.");
						s3.headObject({
							Bucket: options.bucket,	
							Key: options.bucketKey
						}).promise().catch(err=>{
							reject(err);
						}).then(data=>{
							resolve(data);
						});
					})
					.then((data)=>{
						// File already exists.
						console.log(options.bucketKey + " already exists.");
						reject(options.bucketKey + " already exists.  Use overwrite flag to replace.");
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
								if(!options.skipRekognition){
									require("./Rekog").process({
										AWS : options.AWS,
										bucket : options.bucket,
										bucketKey : options.bucketKey,
										rekogCollection : options.rekogCollection,
										table : options.table
									}).then(data=>{
										resolve(data);
									}).catch(err=>{
										reject(err);
									});
								}else{
									resolve("Upload complete");
								}
							},
							(err)=>{
								console.log("Error uploading to S3.");
								reject(`Error uploading to S3.${err}`);
							}
						);
					});
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