# face-test [![npm version](https://badge.fury.io/js/entmike-facetest.svg)](https://badge.fury.io/js/entmike-facetest)

# Usage
```javascript
const FaceServer = require("entmike-facetest");
const AWS = require("aws-sdk");

AWS.config.update({
  region: "us-west-2",
  credentials : new AWS.SharedIniFileCredentials({profile: 'personal-account'})
});

FaceServer.listen({
	AWS: AWS,
	servers : {
	4321 : {
		AWS : AWS,
		bucket : "com.entmike.miketest1"
	},
	4322 : {
		AWS : AWS,
		bucket : "com.entmike.miketest2"
	},
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
