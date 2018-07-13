var argv = require('minimist')(process.argv.slice(2));
var pass = true;
for(argument of "bucket,file,rekogCollection,table".split(",")){
	if(argv[argument] === undefined) pass = false;
}
if(!pass){
	console.log(["USAGE:",
		"--file [local file]",
		"--bucket [s3 bucket name]",
		"--rekogCollection [rekognition collection name]",
		"--table [dynamodb table]",
		"",
		"OPTIONAL",
		"--bucketKey [s3 bucket key, if not specified, file name is used]",
		"--region [aws region, default = us-west-2]",
		"--skipRekognition to skip rekognition",
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
		skipRekognition : argv.skipRekognition?true:false,
		table : argv.table,
		overwrite : argv.o || false
	}).then(data=>{
		console.log(data);
	}).catch(err=>{
		console.error(err);
	});
}