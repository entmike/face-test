FROM justadudewhohacks/opencv-nodejs
ENV NODE_PATH=/usr/lib/node_modules
RUN ["apt-get", "update"]
RUN ["apt-get", "install", "-y", "vim"]
RUN mkdir -p /faceServer
WORKDIR /app
RUN npm install -g aws-sdk
RUN npm install -g entmike-facetest --unsafe-perm
COPY opencv_examples opencv_examples
