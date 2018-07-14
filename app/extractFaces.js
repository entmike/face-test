const fs = require('fs');
const path = require('path');
const cv = require('opencv4nodejs');

if (!cv.xmodules.face) {
  throw new Error('exiting: opencv4nodejs compiled without face module');
}

var minSize = 100;
const classifier = new cv.CascadeClassifier('/app/cascades/haarcascade_frontalface_alt2.xml', 1.1, 5);

const imgsPath = '/app/images/';
const imgFiles = fs.readdirSync(imgsPath);

imgFiles
  .filter(file=>{ return (file.indexOf(".jpg")> -1)?true:false;})
  // get absolute file path
  .map(file => {
    var filePath = path.resolve(imgsPath, file);
    // read image
    cv.imreadAsync(filePath, function(err, img){
      // face recognizer works with gray scale images
      var grayImg = img.bgrToGray();
      // detect and extract face
      const faceRects = classifier.detectMultiScale(grayImg).objects;
      var rects = [];
      if(faceRects){
        rects = faceRects.filter(rect=>{
          return (rect.height>=minSize)?true:false;
        })
        .map(faceRect=>grayImg.getRegion(faceRect));
      }
      // detect and extract face
      console.log(file + " - " + rects.length + " faces detected.");
      rects.map((rect,index)=>{
        cv.imwriteAsync(imgsPath + 'face_' + index + '_' + file, rect, function(err,data){
            
        });
      })
    });
  });