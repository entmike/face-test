const fs = require("fs");
module.exports = {
	uploadFolder : options=>{
		return new Promise((resolve,reject)=>{
			for(field of "bucket,folder,AWS,table,rekogCollection".split(",")) if(options[field] === undefined) reject(`Field ${field} required for upload options.`);
			new Promise((resolve, reject)=>{
				fs.readdir(options.folder, (err, files) => {
					err ? reject(err) : resolve(files);
				});
			}).then(fileNames=>{
				var uploadPromises = [];
				for(file of fileNames){
					var file = options.folder.replace(/\/$/, "") + "/" + file;
					uploadPromises.push(module.exports.upload({
						AWS : options.AWS,
						bucket : options.bucket,
						file : file,
						table : options.table,
						rekogCollection : options.rekogCollection,
						skipRekognition : options.skipRekognition?options.skipRekognition:false,
						overwrite : options.overwrite?options.overwrite:false
					}).catch(err=>{
						return err;	// Maybe file already exists.  Keep going, though.
					}));
				}
				Promise.all(uploadPromises).then(data=>{
					resolve(data);
				}).catch(err=>{
					reject(err);
				})
			});
		});
	},
	upload : options=>{
		return new Promise((resolve,reject)=>{
			if(options){
				for(field of "bucket,file,AWS,table,rekogCollection".split(",")) if(options[field] === undefined) reject(`Field ${field} required for upload options.`);
				const s3 = new options.AWS.S3({
					apiVersion: '2006-03-01'
				});
				if(!options.bucketKey) options.bucketKey = options.file;
				new Promise((resolve,reject)=>{
					fs.readFile(options.file, (err,data)=>{
						err ? reject(err) : resolve(data)
					})
				})
				.then(fileContents=>{
					new Promise((resolve,reject)=>{
						// Reject is actually a good thing in this scenario...
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
										resolve(options.file + " upload complete.\n" + data);
									}).catch(err=>{
										reject(err);
									});
								}else{
									resolve("Upload complete");
								}
							},
							(err)=>{
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