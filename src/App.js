import React, { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl"; // 👈 Ensure backend is registered
import * as facemesh from "@tensorflow-models/facemesh";
import Webcam from "react-webcam";
import "./App.css";

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [emotion, setEmotion] = useState("Detecting...");

  useEffect(() => {
    async function loadModel() {
      await tf.setBackend("webgl"); // 👈 Set backend before using tfjs
      await tf.ready(); // Wait for backend to initialize
      const model = await facemesh.load();

      const detectInterval = setInterval(() => {
        detectEmotions(model);
      }, 1000);

      return () => clearInterval(detectInterval); // Cleanup on unmount
    }

    loadModel();
  }, []);

  async function detectEmotions(model) {
    if (
      webcamRef.current &&
      webcamRef.current.video.readyState === 4
    ) {
      const video = webcamRef.current.video;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      const canvas = canvasRef.current;
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      const ctx = canvas.getContext("2d");

      const predictions = await model.estimateFaces(video);

      if (predictions.length > 0) {
        const keypoints = predictions[0].scaledMesh;

        const emotions = {
          angry: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 21, 22, 26],
          disgusted: [33, 34, 35, 36, 37, 38, 39, 40, 41, 42],
          fearful: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26],
          happy: [48, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64],
          neutral: [27, 28, 29, 30, 33, 34, 35, 36, 37, 38, 39, 42, 43, 44, 45],
          sad: [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64],
          surprised: [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 39, 40, 41],
        };

        const landmarks = Object.values(emotions).flat();
        const distances = [];

        for (let i = 0; i < landmarks.length; i++) {
          for (let j = i + 1; j < landmarks.length; j++) {
            const a = keypoints[landmarks[i]];
            const b = keypoints[landmarks[j]];
            distances.push(
              Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2))
            );
          }
        }

        const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;

        let currentEmotion = "Neutral";

        if (avgDistance < 35) currentEmotion = "Neutral 😐";
        else if (avgDistance < 50) currentEmotion = "Happy 😊";
        else if (avgDistance < 70) currentEmotion = "Surprised 😲";
        else if (avgDistance < 90) currentEmotion = "Sad 😢";
        else if (avgDistance < 110) currentEmotion = "Disgusted 🤢";
        else currentEmotion = "Angry 😠";

        setEmotion(currentEmotion);

        // Draw keypoints
        ctx.clearRect(0, 0, videoWidth, videoHeight);
        ctx.fillStyle = "cyan";
        for (let i = 0; i < keypoints.length; i++) {
          const [x, y] = keypoints[i];
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    }
  }

  return (
    <div className="App">
      <Webcam
        ref={webcamRef}
        mirrored
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          color: "#fff",
          padding: "16px 24px",
          borderRadius: "12px",
          fontSize: "22px",
          fontWeight: "600",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          zIndex: 9999,
          backdropFilter: "blur(6px)",
        }}
      >
        Detected Emotion:{" "}
        <span style={{ color: "#00FFFF" }}>{emotion}</span>
      </div>
    </div>
  );
}

export default App;
