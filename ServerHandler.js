module.exports = {
	handler : (options)=>{
		const bucketName = options.bucketName;
		const ContentUtils = require("./ContentUtils").init({
			AWS : options.AWS
		});
		const PhotoUtils = require("./PhotoUtils").init({
			AWS : options.AWS
		});
		const zlib = require("zlib");
		
		var serveContent = options=>{
			var request = options.request,
			response = options.response,
			cache = options.object,
			type = options.type || "showface";
			
			var acceptEncoding = request.headers['accept-encoding'] || "";
			console.log(cache);
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
				if(!cache.data.gzip) cache.data.gzip = {};
				if(!cache.data.gzip[type]){
					var image = cache.data.formats[type];
					zlib.gzip(image, function(err,data){
						console.log("Adding gzip data to cache for URL '" + request.url + "'.");
						cache.data.gzip[type] = data;
						response.end(data);
					});	
				}else{
					console.log("Using gzip cache for URL '" + request.url + "'.");
					response.end(cache.data.gzip[type]);
				}
			} else {
				response.writeHead(200, {});
				response.end(cache.data[type]);
			}
		};
		
		return(request,response)=>{
			if(request.url == "/"){
				ContentUtils.createList(bucketName).then(list=>{
					var html = "<html><body>" + list + "</body></html>";
					response.end(html);
				}).catch(err=>{
					response.end(err.message);
				});
				return;
			}
			else if(request.url == "/files"){
				ContentUtils.createList2(bucketName).then(files=>{
					response.end(JSON.stringify(files));
				}).catch(err=>{
					response.end(err.message);
				});
				return;
			}
			else if(request.url == "/process"){
				ContentUtils.processFiles(bucketName).then(files=>{
					response.end(JSON.stringify(files, null, 2));
				}).catch(err=>{
					response.end(err.message);
				});
				return;
			}
			else if(request.url.indexOf("/showfaces/") == 0) {
				var bucketKey = request.url.replace(/^\/showfaces\/+/g, '');
				PhotoUtils.showFaces({
					bucket : bucketName,
					bucketKey : bucketKey
				}).then(image=>{
					serveContent({
						request : request,
						response : response,
						object : image,
						type : "showfaces"
					});
				}).catch(err=>{
					response.end(err.message);
				});
			}
			else if(request.url.indexOf("/original/") == 0) {
				var bucketKey = request.url.replace(/^\/original\/+/g, '');
				PhotoUtils.showFaces({
					bucket : bucketName,
					bucketKey : bucketKey
				}).then(image=>{
					serveContent({
						request : request,
						response : response,
						object : image,
						type : "original"
					});
				}).catch(err=>{
					response.end(err.message);
				});
			}else{
				response.end("Unknown command.");
			}
		};
	}
}