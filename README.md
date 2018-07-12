# face-test [![npm version](https://badge.fury.io/js/entmike-facetest.svg)](https://badge.fury.io/js/entmike-facetest)

# Install

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
