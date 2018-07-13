# face-test [![npm version](https://badge.fury.io/js/entmike-facetest.svg)](https://badge.fury.io/js/entmike-facetest)

# Docker Install (Recommended, contains opencv4nodejs)

```bash
git clone https://github.com/entmike/face-test.git
cd face-test
./buildDockerImage.sh
```
For data persistence, scripting, and certs, /app folder should be mapped to logical host folder.

Example execution where:

* `/app` is mapped to the cloned GitHub repository that contains a few sample scripts (which includes `startServe.js` which is used in this example):
* `.aws` is mapped to host .aws folder which contains AWS keys.  (You can map to a different, separate folder in productive deployments)
```bash
sudo docker run --rm \
-v ~/Desktop/Projects/face/face-test/app:/app \
-v ~/.aws:/root/.aws \
-p 4321:4322 -ti faceserver node startServe
```
Docker container is based off of Docker Image published in https://github.com/justadudewhohacks/opencv4nodejs.  This container also contains a global npm install of:

* `aws-sdk` (So it can call out to AWS S3, DynamoDB, etc)
* `entmike-facetest` (This repo)

# Install (NPM)

* MacOS: `sudo npm install entmike-facetest --unsafe-perm=true`
* Windows : `npm install entmike-facetest`

# Usage
```javascript
const FaceServer = require("entmike-facetest"),
AWS = require("aws-sdk"),
AWS2 = require("aws-sdk");

AWS.config.update({
	region: "us-west-2"
});

AWS2.config.update({
	region: "us-west-2",
	credentials : new AWS.SharedIniFileCredentials({profile: 'personal-account'})
});

FaceServer.listen({
	servers : {
		// Example HTTP server.  AWS account and S3 bucket name needed.
		4321 : {
			AWS : AWS,
			bucket : "com.entmike.miketest1"
		},
		// Example running a second AWS account
		4322 : {
			AWS : AWS2,
			bucket : "com.entmike.miketest2"
		},
		// Example running in https.  Certs required to work.
		4421 : {
			AWS : AWS,
			bucket : "com.entmike.miketest2",
			ssl : {
				certs : {
					key : "certs/private.pem",
					ca :"certs/ca.pem",
					cert : "certs/cert.pem"
				}
			}
		}
	}
});
```
