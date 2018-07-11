const AWS = require("aws-sdk");
const fs = require("fs");
const http = require("http");
const https = require("https");
const zlib = require("zlib");
const sharp = require('sharp');
const BufferStream = require("stream");
const contentList = require("./contentList");

const port = 4321;
const port_ssl = 4421;
const certs = {
	key : "certs/private.pem",
	ca :"certs/ca.pem",
	cert : "certs/cert.pem"
};
var requestCache = {};
var bucketName = "com.entmike.miketest2";
AWS.config.update({
  region: "us-west-2",
  credentials : new AWS.SharedIniFileCredentials({profile: 'personal-account'})
});
const s3 = new AWS.S3({
	apiVersion: '2006-03-01'
});
const dynamodb = new AWS.DynamoDB({
	apiVersion: '2012-08-10'
});
const docClient = new AWS.DynamoDB.DocumentClient();
var zipContent = function(request, response, cache){
	
}
var serveContent = function(request, response, cache){
	var acceptEncoding = request.headers['accept-encoding'] || "";
	if (!cache.data.s3Object) {
		response.end("File '" + request.url + "' not found.");
		return;
	}
	var data = cache.data.s3Object;
	if (acceptEncoding.match(/\bgzip\b/)) {
		response.writeHead(200, { 
			'Content-encoding': 'gzip',
			'Content-type' : 'image/jpeg'
		});
		if(!cache.data.gzip){
			var image = cache.data.processed;
			zlib.gzip(image, function(err,data){
				console.log("Adding gzip data to cache for URL '" + request.url + "'.");
				cache.data.gzip = data;
				response.end(data);
			});	
		}else{
			console.log("Using gzip cache for URL '" + request.url + "'.");
			response.end(cache.data.gzip);
		}
	} else {
		response.writeHead(200, {});
		response.end(data.Body);
	}
}
const serverHandler = (request,response)=>{
	if(request.url == "/"){
		contentList.createList(bucketName).then(list=>{
			var html = "<html><body>" + list + "</body></html>";
			response.end(html);
		});
		return;
	}
	if(request.url == "/files"){
		contentList.createList2(bucketName).then(files=>{
			response.end(JSON.stringify(files));
		});
		return;
	}
	if(request.url == "/process"){
		contentList.processFiles(bucketName).then(files=>{
			response.end(JSON.stringify(files, null, 2));
		});
		return;
	}
	var bucketKey = request.url.replace(/^\/+/g, '');
	requestCache[bucketKey] = requestCache[bucketKey] || {};
	var cache = requestCache[bucketKey];
	if(!cache.data){
		console.log("Processing uncached request: '" + request.url + "'...");
		Promise.all([
			s3.getObject({ Bucket : bucketName, Key : bucketKey })
				.promise()
				.catch((err)=>{
					return {};
				}),
			docClient.query({
				TableName: "imageInfo",
				ProjectionExpression:"faceIndex",
				KeyConditionExpression: "#bucket = :bucket and image = :image",
				ExpressionAttributeNames:{
					"#bucket": "bucket"
				},
				ExpressionAttributeValues: {
					":bucket" : bucketName,
					":image" : bucketKey
				}
			}).promise()
		]).then((promiseData)=>{
			if(promiseData[0].Body && promiseData[1].Items && promiseData[1].Items[0].faceIndex){
				cache.data = {
					s3Object : promiseData[0],
					dynamoObject : promiseData[1].Items[0]
				}
				var file = new Buffer(promiseData[0].Body);
				var originalImage = sharp(file);
				var faces = [];
				originalImage.metadata().then((metadata)=>{
					for(face of cache.data.dynamoObject.faceIndex.FaceRecords){
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
						faces.push({coords : coords });
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
					Promise.all(promises).then(buffers=>{
						for(var i=0;i<buffers.length;i++){
							faces[i].buffer = buffers[i];
						}
						var workaround = faces.reduce(function(input,overlay){
							return input.then( function(data) {
								return sharp(data).overlayWith(overlay.buffer, { 
									left : overlay.coords.left, 
									top : overlay.coords.top
								}).toBuffer();
							});
						}, originalImage.toBuffer());
						workaround.then(data=>{
							// sharp(data).toFile("final.jpg");
							cache.data.processed = data;
							serveContent(request, response, cache);
						});
					});
				})/*
				sharp(file)
					.blur(20)
					.toBuffer()
					.then(data=>{
						cache.data.manip = data
					}).then(()=>{
						serveContent(request, response, cache);
					});*/
			}else{
				response.writeHead(404, { });
				response.end("404");
			}
		});
	}else{
		serveContent(request, response, cache);
	}
};
if(port_ssl !== undefined && port > 0 && port <=65535) {
	const server = http.createServer(serverHandler)
	server.listen(port,err=>{
		if(err){
			return console.log("Error occured.\n\n", err);
		}
		console.log(`Server is listening on ${port} for http requests.`);
	});
}
if(port_ssl !== undefined && port_ssl > 0 && port_ssl <=65535) {
	Promise.all([
		new Promise((resolve,reject)=>{ fs.readFile(certs.key, "utf8", (err,data)=>{ err?reject(err):resolve(data);})}),
		new Promise((resolve,reject)=>{ fs.readFile(certs.ca, "utf8", (err,data)=>{ err?reject(err):resolve(data);})}),
		new Promise((resolve,reject)=>{ fs.readFile(certs.cert, "utf8", (err,data)=>{ err?reject(err):resolve(data);})}),
	]).then(data=>{
		const ssl_server = https.createServer({
			key : data[0],
			ca : data[1],
			cert : data[2]
		},serverHandler);
		ssl_server.listen(port_ssl,err=>{
			if(err){
				return console.log("Error occured.\n\n", err);
			}
			console.log(`SSL Server is listening on ${port_ssl} for https requests.`);			
		})
	}).catch(err=>{
		console.warn(`Could not start SSL.  Check your ports and certificates.\n\n${err}`);
	});
}