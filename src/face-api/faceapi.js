const faceapi = require("face-api.js"); 
const canvas = require("canvas");  
const path = require("path");
//require("@tensorflow/tfjs-node");

// mokey pathing the faceapi canvas
const { Canvas, Image, ImageData } = canvas  
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const faceDetectionNet = faceapi.nets.ssdMobilenetv1;
// SsdMobilenetv1Options
const minConfidence = 0.5;
// TinyFaceDetectorOptions
const inputSize = 408;  
const scoreThreshold = 0.5
// MtcnnOptions
const minFaceSize = 50;
const scaleFactor = 0.8;

function getFaceDetectorOptions(net) {  
    return net === faceapi.nets.ssdMobilenetv1
        ? new faceapi.SsdMobilenetv1Options({ minConfidence })
        : (net === faceapi.nets.tinyFaceDetector
            ? new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold })
            : new faceapi.MtcnnOptions({ minFaceSize, scaleFactor })
        )
};

const faceDetectionOptions = getFaceDetectorOptions(faceDetectionNet);

async function run() {
    await faceDetectionNet.loadFromDisk(__dirname + '/pesos');
    await faceapi.nets.faceLandmark68Net.loadFromDisk(__dirname + '/pesos');
    await faceapi.nets.faceRecognitionNet.loadFromDisk(__dirname + '/pesos');
    console.log('Hemos conseguido cargar los modelos exitosamente!!!!!!!');
};

async function start(imagedata, lista) {
    console.log('Hemos entrado al modulo de reconomiento!!!');
    let imagePersona = new canvas.Image();
    imagePersona.src = imagedata;

    const labeledFaceDescriptors = await Promise.all(
        lista.map(async label => {

            const imgUrl = label.image;
            const img = new canvas.Image();
            img.src = imgUrl;

            const fullFaceDescription = await faceapi.detectSingleFace(img, faceDetectionOptions).withFaceLandmarks().withFaceDescriptor();
            if (!fullFaceDescription) {
                throw new Error("No se encontro rostro para " + label.name);
            };  
            const faceDescriptors = [fullFaceDescription.descriptor];

            return new faceapi.LabeledFaceDescriptors(label.id.toString(), faceDescriptors);
        })
    );

    const resultImage = await faceapi.detectSingleFace(imagePersona, faceDetectionOptions)
    .withFaceLandmarks().withFaceDescriptor();

    const maxDescriptorDistance = 0.55;

    const faceMatcher = await new faceapi.FaceMatcher(labeledFaceDescriptors, maxDescriptorDistance);

    const finalresult =  await faceMatcher.findBestMatch(resultImage.descriptor);

    return finalresult;
};



const face_api = {};
face_api.faceapi = faceapi;
face_api.canvas = canvas;
face_api.path = path;
face_api.faceDetectionOptions = faceDetectionOptions;
face_api.load = run;
face_api.start = start;

run();

module.exports = face_api;

