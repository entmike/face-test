const fs = require("fs"),
	http = require("http"),
	https = require("https");
	
module.exports = {
	upload : options=>{
		return new Promise((resolve,reject)=>{
			require("./Upload").upload(options)
				.then(data=>{resolve(data)})
				.catch(err=>{reject(err)});
		});
	},
	uploadFolder : options=>{
		return new Promise((resolve,reject)=>{
			require("./Upload").uploadFolder(options)
				.then(data=>{resolve(data)})
				.catch(err=>{reject(err)});
		});
	},
	listen : options=>{
		var servers = options.servers;
		for(port in servers){
			if(port == parseInt(port) && port > 0 && port <=65535) {
				((port)=>{
					var server = servers[port];
					const ServerHandler = require("./ServerHandler").handler({
						AWS : server.AWS,
						bucketName : server.bucket
					});
					if(server.ssl){
						Promise.all([
							new Promise((resolve,reject)=>{ fs.readFile(server.ssl.certs.key, "utf8", (err,data)=>{ err?reject(err):resolve(data);})}),
							new Promise((resolve,reject)=>{ fs.readFile(server.ssl.certs.ca, "utf8", (err,data)=>{ err?reject(err):resolve(data);})}),
							new Promise((resolve,reject)=>{ fs.readFile(server.ssl.certs.cert, "utf8", (err,data)=>{ err?reject(err):resolve(data);})}),
						]).then(data=>{
							require("https").createServer({
								key : data[0],
								ca : data[1],
								cert : data[2]
							},ServerHandler).listen(port,err=>{
								if(err){
									return console.log(`Error occurred.\n\n ${err}`);
								}
								console.log(`SSL Server is listening on ${port} for bucket ${server.bucket} for https requests.`);			
							})
						}).catch(err=>{
							console.warn(`Could not start SSL.  Check your ports and certificates.\n\n${err}`);
						});
					}else{
						require("http").createServer(ServerHandler).listen(port,err=>{
							if(err){
								return console.log(`Error occurred.\n\n ${err}`);
							}
							console.log(`Servers is listening on ${port} for bucket ${server.bucket} for http requests.`);
						});
					}
				})(port);
			}else{
				console.warn("Bad port defined: " + port);
			}
		}
	}
}
