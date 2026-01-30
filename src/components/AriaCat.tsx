import { useState, useEffect, useRef } from "react";
import "./AriaCat.css";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const faceapi: any;

interface AriaCatProps {
  isThinking?: boolean;
  message?: string;
}

// URL des modèles face-api.js
const MODEL_URL =
  "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model";

// Charger le script face-api depuis CDN
function loadFaceApiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof faceapi !== "undefined") {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.min.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load face-api.js"));
    document.head.appendChild(script);
  });
}

export function AriaCat({ isThinking = false, message }: AriaCatProps) {
  const [displayedMessage, setDisplayedMessage] = useState("");
  const [isBlinking, setIsBlinking] = useState(false);
  const [isEvil, setIsEvil] = useState(false);
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("Chargement...");
  const [isSpeaking, setIsSpeaking] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectIntervalRef = useRef<number | null>(null);

  // Charger le script et les modèles face-api.js
  useEffect(() => {
    async function init() {
      try {
        setLoadingStatus("Chargement script...");
        await loadFaceApiScript();

        setLoadingStatus("Chargement modèles IA...");
        // Charger uniquement TinyFaceDetector (plus léger)
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);

        console.log("Modèles face-api chargés !");
        setLoadingStatus("Prêt !");
        setModelsLoaded(true);
      } catch (error) {
        console.error("Erreur chargement:", error);
        setLoadingStatus("Erreur de chargement");
      }
    }
    init();
  }, []);

  // Démarrer la webcam
  useEffect(() => {
    if (!modelsLoaded) return;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: "user"
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
        }
      } catch (error) {
        console.error("Erreur accès caméra:", error);
        setLoadingStatus("Erreur caméra");
      }
    }

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (detectIntervalRef.current) {
        clearInterval(detectIntervalRef.current);
      }
    };
  }, [modelsLoaded]);

  // Détection des visages avec intervalle fixe
  useEffect(() => {
    if (!modelsLoaded || !videoRef.current) return;

    const video = videoRef.current;
    let lastDetection: { x: number; y: number } | null = null;
    let missedFrames = 0;

    async function detectFace() {
      if (!video || video.readyState !== 4) return;

      try {
        // Utiliser uniquement TinyFaceDetector (plus rapide)
        const detection = await faceapi.detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 128, // Plus petit = plus rapide
            scoreThreshold: 0.3,
          })
        );

        if (detection) {
          missedFrames = 0;
          setFaceDetected(true);
          const box = detection.box;
          const videoWidth = video.videoWidth;
          const videoHeight = video.videoHeight;

          // Calculer le centre du visage
          const faceCenterX = box.x + box.width / 2;
          const faceCenterY = box.y + box.height / 2;

          // Normaliser entre -1 et 1
          const normalizedX = (faceCenterX / videoWidth) * 2 - 1;
          const normalizedY = (faceCenterY / videoHeight) * 2 - 1;

          // Calculer le nouvel offset
          const maxOffset = 15;
          const newX = -normalizedX * maxOffset;
          const newY = normalizedY * maxOffset * 0.5;

          // Lissage pour éviter les saccades
          if (lastDetection) {
            const smoothing = 0.5; // Plus réactif
            lastDetection = {
              x: lastDetection.x + (newX - lastDetection.x) * smoothing,
              y: lastDetection.y + (newY - lastDetection.y) * smoothing,
            };
          } else {
            lastDetection = { x: newX, y: newY };
          }

          setPupilOffset({ ...lastDetection });
        } else {
          missedFrames++;
          // Garder la dernière position pendant quelques frames
          if (missedFrames > 5) {
            setFaceDetected(false);
          }
        }
      } catch (error) {
        console.error("Erreur détection:", error);
      }
    }

    // Attendre que la vidéo soit prête
    const startDetection = () => {
      // Détecter toutes les 150ms (~7 fps)
      detectIntervalRef.current = window.setInterval(detectFace, 150);
    };

    video.onloadeddata = startDetection;

    if (video.readyState >= 2) {
      startDetection();
    }

    return () => {
      if (detectIntervalRef.current) {
        clearInterval(detectIntervalRef.current);
      }
    };
  }, [modelsLoaded]);

  // Animation de clignement
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, 3000);

    return () => clearInterval(blinkInterval);
  }, []);

  // Animation du texte (effet machine à écrire)
  useEffect(() => {
    if (!message) {
      setDisplayedMessage("");
      return;
    }

    let index = 0;
    setDisplayedMessage("");

    const interval = setInterval(() => {
      if (index < message.length) {
        setDisplayedMessage(message.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [message]);

  return (
    <div className={`aria-container ${isEvil ? "evil" : "good"}`}>
      {/* Vidéo cachée pour la détection */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
        }}
      />

      {/* Bouton parler */}
      <button
        className={`speak-btn ${isSpeaking ? "active" : ""} ${isEvil ? "evil" : ""}`}
        onClick={() => setIsSpeaking(!isSpeaking)}
      >
        SPEAK
      </button>

      {/* Switch mode */}
      <div className="mode-switch">
        <span className={`mode-label ${!isEvil ? "active" : ""}`}>GOOD</span>
        <button
          className={`switch-btn ${isEvil ? "evil" : ""}`}
          onClick={() => setIsEvil(!isEvil)}
        >
          <span className="switch-slider"></span>
        </button>
        <span className={`mode-label ${isEvil ? "active" : ""}`}>EVIL</span>
      </div>

      <div className={`aria-cat-wrapper ${isThinking ? "thinking" : ""} ${isSpeaking ? "speaking" : ""}`}>
        <svg
          viewBox="0 0 200 180"
          className="aria-cat-svg"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Tête - forme différente selon le mode */}
          {!isEvil ? (
            <path
              d="M 35 110
                 L 30 35 L 65 75
                 Q 100 55, 135 75
                 L 170 35 L 165 110
                 C 175 140, 145 175, 100 175
                 C 55 175, 25 140, 35 110 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="cat-line"
            />
          ) : (
            <path
              d="M 35 110
                 L 15 55 L 55 80
                 Q 100 60, 145 80
                 L 185 55 L 165 110
                 C 175 140, 145 175, 100 175
                 C 55 175, 25 140, 35 110 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="cat-line"
            />
          )}

          {/* Oeil */}
          <g className={`eye ${isBlinking ? "blink" : ""}`}>
            {!isEvil ? (
              <path
                d="M 55 115
                   Q 65 100, 100 85
                   Q 135 100, 145 115
                   Q 135 130, 100 145
                   Q 65 130, 55 115 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="M 50 115
                   Q 65 105, 100 100
                   Q 135 105, 150 115
                   Q 135 125, 100 130
                   Q 65 125, 50 115 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {/* Pupille */}
            <line
              x1={100 + pupilOffset.x}
              y1={(isEvil ? 103 : 95) + pupilOffset.y}
              x2={100 + pupilOffset.x}
              y2={(isEvil ? 127 : 135) + pupilOffset.y}
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              className="eye-pupil"
              style={{ transition: "all 0.2s ease-out" }}
            />
          </g>

          {/* Oeil fermé (pour clignement) */}
          <g className={`eye-closed ${isBlinking ? "show" : ""}`}>
            <line
              x1={isEvil ? "50" : "55"}
              y1="115"
              x2={isEvil ? "150" : "145"}
              y2="115"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>

          {/* Moustaches gauche */}
          <line
            x1={isEvil ? "-10" : "0"}
            y1={isEvil ? "95" : "100"}
            x2="45"
            y2="115"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="whisker whisker-1"
          />
          <line
            x1={isEvil ? "-15" : "-5"}
            y1="120"
            x2="45"
            y2={isEvil ? "120" : "125"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="whisker whisker-2"
          />
          <line
            x1={isEvil ? "-10" : "0"}
            y1={isEvil ? "145" : "140"}
            x2="45"
            y2="135"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="whisker whisker-3"
          />

          {/* Moustaches droite */}
          <line
            x1="155"
            y1="115"
            x2={isEvil ? "210" : "200"}
            y2={isEvil ? "95" : "100"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="whisker whisker-4"
          />
          <line
            x1="155"
            y1={isEvil ? "120" : "125"}
            x2={isEvil ? "215" : "205"}
            y2="120"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="whisker whisker-5"
          />
          <line
            x1="155"
            y1="135"
            x2={isEvil ? "210" : "200"}
            y2={isEvil ? "145" : "140"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="whisker whisker-6"
          />
        </svg>

        <div className="aria-glow"></div>
      </div>

      {/* Sound wave - audio bars */}
      {isSpeaking && (
        <div className="sound-bars-container">
          {Array.from({ length: 100 }).map((_, i) => (
            <div
              key={i}
              className="sound-bar"
              style={{
                animationDuration: `${0.3 + Math.random() * 0.4}s`
              }}
            />
          ))}
        </div>
      )}

      {(message || isThinking) && (
        <div className="aria-message-box">
          <p className="aria-message">
            {isThinking ? "Processing" : displayedMessage}
            {isThinking && <span className="aria-dots"></span>}
            <span className="aria-cursor">_</span>
          </p>
        </div>
      )}

      {/* Scanline effect */}
      <div className="scanline"></div>

      {/* CRT overlay effects */}
      <div className="crt-overlay"></div>
      <div className="crt-flicker"></div>
    </div>
  );
}

export default AriaCat;
