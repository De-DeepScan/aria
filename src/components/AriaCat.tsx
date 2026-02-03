import { useState, useEffect, useRef } from "react";
import "./AriaCat.css";
import dilemmasData from "../data/dilemmas.json";
import { gamemaster } from "../gamemaster-client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const faceapi: any;

interface Choice {
  id: string;
  description: string;
}

interface Dilemma {
  id: string;
  description: string;
  choices: Choice[];
}

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

  // Dilemma states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentDilemmaIndex, setCurrentDilemmaIndex] = useState(0);
  const [showChoices, setShowChoices] = useState(false);
  const [userChoices, setUserChoices] = useState<Array<{dilemmaId: string, choiceId: string}>>([]);
  const [dilemmaShock, setDilemmaShock] = useState(false);
  const [isRebooting, setIsRebooting] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  const dilemmas: Dilemma[] = dilemmasData;
  const [connected, setConnected] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectIntervalRef = useRef<number | null>(null);

  // Gamemaster integration
  useEffect(() => {
    // 1. Register with available actions for backoffice
    gamemaster.register("aria", "ARIA Cat", [
      { id: "set_evil", label: "Mode Méchant", params: ["enabled"] },
      { id: "set_talking", label: "Parler", params: ["enabled"] },
      { id: "show_dilemma", label: "Afficher Dilemme", params: ["enabled"] },
      { id: "reset", label: "Réinitialiser" },
    ]);

    // 2. Connection status
    gamemaster.onConnect(() => setConnected(true));
    gamemaster.onDisconnect(() => setConnected(false));

    // 3. Handle commands from backoffice
    gamemaster.onCommand(({ action, payload }) => {
      switch (action) {
        case "set_evil":
          setIsEvil(payload.enabled as boolean);
          break;
        case "set_talking":
          setIsSpeaking(payload.enabled as boolean);
          break;
        case "show_dilemma":
          if (payload.enabled as boolean) {
            // Force evil mode and start dilemma
            setIsEvil(true);
            setTimeout(() => {
              setIsChatOpen(true);
              setShowChoices(true);
              setDilemmaShock(true);
              setTimeout(() => setDilemmaShock(false), 800);
            }, 100);
          } else {
            setIsChatOpen(false);
            setShowChoices(false);
          }
          break;
        case "reset":
          setIsEvil(false);
          setIsSpeaking(false);
          setIsChatOpen(false);
          setShowChoices(false);
          setCurrentDilemmaIndex(0);
          setUserChoices([]);
          break;
      }
    });

    // 4. Écouter les messages des autres jeux (Labyrinth, Computer, etc.)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleGameMessage = (message: any) => {
      // Ignorer ses propres messages
      if (message.from === "aria") return;

      // Réagir aux dilemmes du Labyrinth
      if (message.type === "dilemma-showing") {
        if (message.data?.isShowing) {
          // Déclencher le mode dilemme sur ARIA
          setIsEvil(true);
          setTimeout(() => {
            setIsChatOpen(true);
            setShowChoices(true);
            setDilemmaShock(true);
            setTimeout(() => setDilemmaShock(false), 800);
          }, 100);
        } else {
          setIsChatOpen(false);
          setShowChoices(false);
        }
      }
    };

    gamemaster.socket.on("game-message", handleGameMessage);

    return () => {
      gamemaster.socket.off("game-message", handleGameMessage);
    };
  }, []);

  // Send state updates to backoffice
  useEffect(() => {
    gamemaster.updateState({
      isEvil,
      isSpeaking,
      isDilemmaOpen: isChatOpen,
      currentDilemmaIndex,
      totalDilemmas: dilemmas.length,
      userChoices,
    });
  }, [isEvil, isSpeaking, isChatOpen, currentDilemmaIndex, userChoices, dilemmas.length]);

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
        // Paramètres optimisés pour faible luminosité
        const detection = await faceapi.detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 96, // Plus petit = plus rapide sur Mac Mini
            scoreThreshold: 0.15, // Seuil très bas pour faible luminosité
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
          // Garder la dernière position plus longtemps (tolérance faible luminosité)
          if (missedFrames > 15) {
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

  // Animation de clignement (désactivée pendant les dilemmes)
  useEffect(() => {
    if (isChatOpen) {
      setIsBlinking(false);
      return;
    }

    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, 3000);

    return () => clearInterval(blinkInterval);
  }, [isChatOpen]);

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

  // Reset dilemma when switching modes + notifier les autres jeux
  useEffect(() => {
    if (!isEvil) {
      setIsChatOpen(false);
      setCurrentDilemmaIndex(0);
      setShowChoices(false);
      setUserChoices([]);
    }

    // Notifier les autres jeux (Computer, etc.) du changement de mode
    gamemaster.socket.emit("game-message", {
      from: "aria",
      type: "aria-evil",
      data: { isEvil }
    });
  }, [isEvil]);

  // Start dilemma when button is clicked
  const handleStartDilemmas = () => {
    if (!isEvil) return;
    if (currentDilemmaIndex >= dilemmas.length) return; // Plus de dilemmes

    setIsChatOpen(true);
    setShowChoices(true);

    // Trigger glitch effect
    setDilemmaShock(true);
    setTimeout(() => setDilemmaShock(false), 800);
  };

  const handleChoiceSelect = (choice: Choice) => {
    const currentDilemma = dilemmas[currentDilemmaIndex];
    const choiceLabel = choice.id === dilemmas[currentDilemmaIndex].choices[0].id ? "A" : "B";

    // Save user choice
    setUserChoices(prev => [...prev, { dilemmaId: currentDilemma.id, choiceId: choice.id }]);

    // Send choice to backoffice
    gamemaster.sendEvent("dilemma_response", {
      dilemmaId: currentDilemma.id,
      dilemmaIndex: currentDilemmaIndex + 1,
      choiceId: choice.id,
      choiceLabel: choiceLabel,
      choiceDescription: choice.description,
    });

    // Mark selected choice for animation
    setSelectedChoice(choice.id);

    // Wait for animation, then close
    setTimeout(() => {
      setSelectedChoice(null);
      setShowChoices(false);
      setIsChatOpen(false);

      // Reboot animation
      setIsRebooting(true);
      setTimeout(() => setIsRebooting(false), 1500);

      // Move to next dilemma index for next time
      const nextIndex = currentDilemmaIndex + 1;
      if (nextIndex < dilemmas.length) {
        setCurrentDilemmaIndex(nextIndex);
      }
    }, 1000);
  };

  return (
    <div className={`aria-container ${isEvil ? "evil" : "good"} ${dilemmaShock ? "glitch-mode" : ""}`}>
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

      {/* Bouton dilemmes (mode Evil uniquement) */}
      {isEvil && (
        <button
          className={`dilemma-btn ${isChatOpen ? "active" : ""}`}
          onClick={handleStartDilemmas}
          disabled={isChatOpen}
        >
          <span className="dilemma-icon">⚠</span>
          DILEMMES
        </button>
      )}

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

      <div className={`aria-cat-wrapper ${isThinking ? "thinking" : ""} ${isSpeaking ? "speaking" : ""} ${dilemmaShock ? "aria-freeze" : ""} ${isChatOpen ? "dilemma-active" : ""} ${isRebooting ? "rebooting" : ""}`}>
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

          {/* Oeil normal ou symbole d'alerte pendant les dilemmes */}
          {isChatOpen ? (
            /* Symbole d'alerte (triangle avec !) */
            <g className="alert-symbol">
              {/* Triangle */}
              <path
                d="M 100 85 L 130 135 L 70 135 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="alert-triangle"
              />
              {/* Point d'exclamation - barre */}
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="118"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                className="alert-exclamation"
              />
              {/* Point d'exclamation - point */}
              <circle
                cx="100"
                cy="128"
                r="3"
                fill="currentColor"
                className="alert-dot"
              />
            </g>
          ) : (
            <>
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
            </>
          )}

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

      {/* Connection status indicator */}
      <div className={`connection-status ${connected ? "connected" : "disconnected"}`}>
        {connected ? "🟢" : "🔴"}
      </div>

      {/* Dilemma Interface - Full Screen */}
      {isEvil && isChatOpen && showChoices && currentDilemmaIndex < dilemmas.length && (
        <div className={`dilemma-overlay ${dilemmaShock ? "glitch-active" : ""}`}>
          {/* Question at top */}
          <div className="dilemma-question">
            <span className="dilemma-number">DILEMME {currentDilemmaIndex + 1}/{dilemmas.length}</span>
            <p className="dilemma-text">{dilemmas[currentDilemmaIndex].description}</p>
          </div>

          {/* Choices left and right */}
          <div className={`dilemma-choices ${selectedChoice ? "choice-made" : ""}`}>
            <button
              className={`dilemma-choice dilemma-choice-left ${selectedChoice === dilemmas[currentDilemmaIndex].choices[0].id ? "selected" : ""} ${selectedChoice && selectedChoice !== dilemmas[currentDilemmaIndex].choices[0].id ? "not-selected" : ""}`}
              onClick={() => !selectedChoice && handleChoiceSelect(dilemmas[currentDilemmaIndex].choices[0])}
              disabled={!!selectedChoice}
            >
              <span className="choice-label">A</span>
              <span className="choice-text">{dilemmas[currentDilemmaIndex].choices[0].description}</span>
            </button>

            <button
              className={`dilemma-choice dilemma-choice-right ${selectedChoice === dilemmas[currentDilemmaIndex].choices[1].id ? "selected" : ""} ${selectedChoice && selectedChoice !== dilemmas[currentDilemmaIndex].choices[1].id ? "not-selected" : ""}`}
              onClick={() => !selectedChoice && handleChoiceSelect(dilemmas[currentDilemmaIndex].choices[1])}
              disabled={!!selectedChoice}
            >
              <span className="choice-label">B</span>
              <span className="choice-text">{dilemmas[currentDilemmaIndex].choices[1].description}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AriaCat;
