module.exports = {
	init : options=>{
		const AWS = options.AWS;
		function formatDate(date) {
			var d = new Date(date),
				month = '' + (d.getMonth() + 1),
				day = '' + d.getDate(),
				year = d.getFullYear();

			if (month.length < 2) month = '0' + month;
			if (day.length < 2) day = '0' + day;

			return [year, month, day].join('-');
		}
		const sharp = require('sharp');
		const dynamodb = new AWS.DynamoDB({
			apiVersion: '2012-08-10'
		});
		const s3 = new AWS.S3({
			apiVersion: '2006-03-01'
		});
		const docClient = new AWS.DynamoDB.DocumentClient();
		var requestCache = {};
		var faceCache = {};
		var computeCoords = (face, metadata)=>{
			var box = face.Face.BoundingBox;
			var coords = {
				left : parseInt(box.Left * metadata.width),
				top : parseInt(box.Top * metadata.height),
				width : parseInt(box.Width * metadata.width),
				height : parseInt(box.Height * metadata.height),
			};
			// Bounding box width/height can go beyond image dimensions in cases where face is on edge.
			if(coords.left<0){
				coords.width = coords.width - coords.left;
				coords.left = 0;
			}
			if(coords.top<0){
				coords.height = coords.height - coords.top;
				coords.top = 0;
			}
			if(coords.left + coords.width > metadata.width) coords.width = metadata.width - coords.left;
			if(coords.top + coords.height > metadata.height) coords.height = metadata.height - coords.top;
			return coords;
		}
		return{
			showFace : (options)=>{
				return new Promise((resolve, reject)=>{
					var bucketKey = options.bucketKey;
					var bucket = options.bucket;
					var cacheKey = options.bucketKey+"-"+options.face;
					faceCache[cacheKey] = faceCache[cacheKey] || {};
					var cache = faceCache[cacheKey];
					if(cache.data){
						resolve(cache);
					}else{
						Promise.all([
							s3.getObject({ Bucket : bucket, Key : bucketKey }).promise(),
							docClient.query({
								TableName: "imageInfo",
								ProjectionExpression:"faceIndex",
								KeyConditionExpression: "#bucket = :bucket and image = :image",
								ExpressionAttributeNames:{
									"#bucket": "bucket"
								},
								ExpressionAttributeValues: {
									":bucket" : bucket,
									":image" : bucketKey
								}
							}).promise()
						]).then(promiseData=>{
							if(promiseData[0].Body && promiseData[1].Items && promiseData[1].Items[0].faceIndex){
								var file = new Buffer(promiseData[0].Body);
								var item = promiseData[1].Items[0];
								var originalImage = sharp(file);
								var foundFace = null;
								for(record of item.faceIndex.FaceRecords){
									var id = record.Face.FaceId;
									if(id==options.face){
										foundFace = record;
									}
								}
								if(!foundFace) {
									reject("Invalid face ID");
								}else{
									var originalImage = sharp(file);
									originalImage.metadata().then((metadata)=>{
										var coords = computeCoords(foundFace,metadata);
										originalImage.clone().extract(coords).toBuffer().then(faceFile=>{
											cache.data = {
												s3Object : promiseData[0],
												dynamoObject : promiseData[1].Items[0],
												formats : {
													original : file,
													face : faceFile
												},
												gzip : {}
											};
											resolve(cache);
										})
									});
								}
							}else{
								reject("Sad face");
							}
						});
					}
				});
			},
			showFaces : (options)=>{
				return new Promise((resolve, reject)=>{
					var bucketKey = options.bucketKey;
					var bucket = options.bucket;
					requestCache[bucketKey] = requestCache[bucketKey] || {};
					var cache = requestCache[bucketKey];
					if(!cache.data){
						Promise.all([
							s3.getObject({ Bucket : bucket, Key : bucketKey }).promise()/*.catch(err=>{reject(err)})*/,
							docClient.query({
								TableName: "imageInfo",
								ProjectionExpression:"faceIndex",
								KeyConditionExpression: "#bucket = :bucket and image = :image",
								ExpressionAttributeNames:{
									"#bucket": "bucket"
								},
								ExpressionAttributeValues: {
									":bucket" : bucket,
									":image" : bucketKey
								}
							}).promise()/*.catch(err=>{reject(err)})*/
								
						])
						.then((promiseData)=>{
							if(promiseData[0].Body && promiseData[1].Items && promiseData[1].Items[0].faceIndex){
								var file = new Buffer(promiseData[0].Body);
								cache.data = {
									s3Object : promiseData[0],
									dynamoObject : promiseData[1].Items[0],
									formats : {
										original : file
									},
									gzip : {}
								}
								var faces = [];
								var originalImage = sharp(file);
								originalImage.metadata().then((metadata)=>{
									for(face of cache.data.dynamoObject.faceIndex.FaceRecords){
										faces.push({coords : computeCoords(face,metadata) });
									}
									return(faces)
								}).then(data=>{
									for(face of data){
										face.img = originalImage.clone().extract(face.coords);
									}
								}).then(()=>{
									originalImage
										.grayscale()
										.blur(5);
									var promises = [];
									for(var face of faces){
										promises.push(face.img.toBuffer());
									}
									Promise.all(promises)
										.catch(err=>{
											throw(err);
										})
										.then(buffers=>{
										for(var i=0;i<buffers.length;i++){
											faces[i].buffer = buffers[i];
										}
										var workaround = faces.reduce(function(input,overlay){
											return input.then( function(data) {
												return sharp(data).overlayWith(overlay.buffer, { 
													left : overlay.coords.left, 
													top : overlay.coords.top
												}).toBuffer().catch(err=>{throw(err);});
											});
										}, originalImage.toBuffer().catch(err=>{throw(err);}));
										workaround
											.catch(err=>{
												throw(err);
											})
											.then(data=>{
												cache.data.formats.showfaces = data;
												resolve(cache);
											});
									});
								});
							}else{
								reject("404");
							}
						})
						.catch(err=>{
							reject(err);
						});
					}else{
						resolve(cache)
					}
				});
			}
		};
	}
}