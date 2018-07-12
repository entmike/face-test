var argv = require('minimist')(process.argv.slice(2));
var pass = true;
for(argument of "bucket,file,bucketKey,rekogCollection,table".split(",")){
	if(argv[argument] === undefined) pass = false;
}
if(!pass){
	console.log(["USAGE:",
		"--file [local file]",
		"--bucket [s3 bucket name]",
		"--bucketKey [s3 bucket key]",
		"--rekogCollection [rekognition collection name]",
		"--table [dynamodb table]",
		"",
		"OPTIONAL",
		"--region [aws region, default = us-west-2]",
		"--profilename [aws account name, default = default profile as specified in ~/.aws/credentials]",
		"-o to overwrite",
		"",
		"Example: node upload.js --bucket com.entmike.miketest2 --bucketKey abc.jpg --file images/DSC_0900.jpg --rekogCollection mike --table imageInfo"
	].join("\n"));
}else{
	const FaceServer = require("entmike-facetest");
	const AWS = require("aws-sdk");
	AWS.config.update({
		region: argv.region || "us-west-2"
	});
	if(argv.profilename) AWS.config.update({
		credentials : new AWS.SharedIniFileCredentials({profile: argv.profilename})
	});
	FaceServer.upload({
		AWS : AWS,
		bucket : argv.bucket,
		file : argv.file,
		bucketKey : argv.bucketKey,
		rekogCollection : argv.rekogCollection,
		table : argv.table,
		overwrite : argv.o || false
	}).then(data=>{
		console.log("Success:" + data);
	}).catch(err=>{
		console.error("Error:\n" + err);
	});
}
