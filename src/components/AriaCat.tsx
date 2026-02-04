import { useState, useEffect, useCallback } from "react";
import "./AriaCat.css";
import dilemmasData from "../data/dilemmas.json";
import { gamemaster } from "../gamemaster-client";
import { KeywordPopups } from "./KeywordPopups";

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

export function AriaCat({ isThinking = false, message }: AriaCatProps) {
  const [displayedMessage, setDisplayedMessage] = useState("");
  const [isBlinking, setIsBlinking] = useState(false);
  const [isEvil, setIsEvil] = useState(false);
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Dilemma states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentDilemmaIndex, setCurrentDilemmaIndex] = useState(0);
  const [showChoices, setShowChoices] = useState(false);
  const [userChoices, setUserChoices] = useState<Array<{dilemmaId: string, choiceId: string}>>([]);
  const [dilemmaShock, setDilemmaShock] = useState(false);
  const [isRebooting, setIsRebooting] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  // Intro speech state
  const [isIntroPlaying, setIsIntroPlaying] = useState(false);

  const dilemmas: Dilemma[] = dilemmasData;
  const [connected, setConnected] = useState(false);

  // Gamemaster integration
  useEffect(() => {
    // 1. Register with available actions for backoffice (actions sans params = boutons toggle)
    gamemaster.register("aria", "ARIA Cat", [
      { id: "enable_evil", label: "Activer mode méchant" },
      { id: "disable_evil", label: "Désactiver mode méchant" },
      { id: "enable_speaking", label: "Activer parole" },
      { id: "disable_speaking", label: "Désactiver parole" },
      { id: "dilemma_1", label: "Dilemme 1 - Voiture" },
      { id: "dilemma_2", label: "Dilemme 2 - Organes" },
      { id: "dilemma_3", label: "Dilemme 3 - Surveillance" },
      { id: "dilemma_4", label: "Dilemme 4 - Conscience" },
      { id: "dilemma_5", label: "Dilemme 5 - Incendie" },
      { id: "dilemma_6", label: "Dilemme 6 - Remède" },
      { id: "disable_dilemma", label: "Masquer dilemme" },
      { id: "start_intro", label: "▶ Lancer intro ARIA" },
      { id: "stop_intro", label: "⏹ Stopper intro" },
      { id: "reset", label: "Réinitialiser" },
    ]);

    // 2. Connection status
    gamemaster.onConnect(() => setConnected(true));
    gamemaster.onDisconnect(() => setConnected(false));

    // Helper function to start a specific dilemma
    const startDilemma = (dilemmaIndex: number) => {
      setCurrentDilemmaIndex(dilemmaIndex);
      setIsEvil(true);
      setTimeout(() => {
        setIsChatOpen(true);
        setShowChoices(true);
        setDilemmaShock(true);
        setTimeout(() => setDilemmaShock(false), 800);
        // Notifier les autres jeux que l'IA ne doit pas parler
        gamemaster.socket.emit("game-message", {
          from: "aria",
          type: "aria-dilemma",
          data: { isSpeakingAllowed: false }
        });
      }, 100);
    };

    // 3. Handle commands from backoffice
    gamemaster.onCommand(({ action }) => {
      switch (action) {
        case "enable_evil":
          setIsEvil(true);
          break;
        case "disable_evil":
          setIsEvil(false);
          break;
        case "enable_speaking":
          setIsSpeaking(true);
          break;
        case "disable_speaking":
          setIsSpeaking(false);
          break;
        case "dilemma_1":
          startDilemma(0);
          break;
        case "dilemma_2":
          startDilemma(1);
          break;
        case "dilemma_3":
          startDilemma(2);
          break;
        case "dilemma_4":
          startDilemma(3);
          break;
        case "dilemma_5":
          startDilemma(4);
          break;
        case "dilemma_6":
          startDilemma(5);
          break;
        case "disable_dilemma":
          setIsChatOpen(false);
          setShowChoices(false);
          // Notifier que l'IA peut parler à nouveau
          gamemaster.socket.emit("game-message", {
            from: "aria",
            type: "aria-dilemma",
            data: { isSpeakingAllowed: true }
          });
          break;
        case "start_intro":
          setIsIntroPlaying(true);
          setIsEvil(false);
          setIsSpeaking(true);
          gamemaster.sendEvent("intro_started", {});
          // Notifier les autres jeux
          gamemaster.socket.emit("game-message", {
            from: "aria",
            type: "aria-intro",
            data: { isPlaying: true }
          });
          break;
        case "stop_intro":
          setIsIntroPlaying(false);
          setIsSpeaking(false);
          gamemaster.sendEvent("intro_stopped", {});
          gamemaster.socket.emit("game-message", {
            from: "aria",
            type: "aria-intro",
            data: { isPlaying: false }
          });
          break;
        case "reset":
          setIsEvil(false);
          setIsSpeaking(false);
          setIsChatOpen(false);
          setShowChoices(false);
          setCurrentDilemmaIndex(0);
          setUserChoices([]);
          setIsIntroPlaying(false);
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
            // Notifier les autres jeux que l'IA ne doit pas parler
            gamemaster.socket.emit("game-message", {
              from: "aria",
              type: "aria-dilemma",
              data: { isSpeakingAllowed: false }
            });
          }, 100);
        } else {
          setIsChatOpen(false);
          setShowChoices(false);
          // Notifier que l'IA peut parler à nouveau
          gamemaster.socket.emit("game-message", {
            from: "aria",
            type: "aria-dilemma",
            data: { isSpeakingAllowed: true }
          });
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
      isIntroPlaying,
    });
  }, [isEvil, isSpeaking, isChatOpen, currentDilemmaIndex, userChoices, dilemmas.length, isIntroPlaying]);

  // Animation de l'oeil gauche-droite uniquement (lente et fluide)
  useEffect(() => {
    // Pas d'animation pendant les dilemmes ou quand elle parle
    if (isChatOpen || isSpeaking) {
      setPupilOffset({ x: 0, y: 0 });
      return;
    }

    const maxOffset = 12; // Amplitude du mouvement
    const duration = 3000; // 3 secondes pour un cycle complet
    let startTime: number | null = null;
    let animationId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      // Mouvement sinusoïdal gauche-droite uniquement
      const progress = (elapsed % duration) / duration;
      const x = Math.sin(progress * Math.PI * 2) * maxOffset;

      setPupilOffset({ x, y: 0 });
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isChatOpen, isSpeaking]);

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

  // Intro complete callback
  const handleIntroComplete = useCallback(() => {
    setIsIntroPlaying(false);
    setIsSpeaking(false);
    gamemaster.sendEvent("intro_completed", {});
    gamemaster.socket.emit("game-message", {
      from: "aria",
      type: "aria-intro",
      data: { isPlaying: false, completed: true }
    });
  }, []);

  // Keyboard listener for dilemma choices (A/B keys)
  useEffect(() => {
    if (!isEvil || !isChatOpen || !showChoices || selectedChoice) return;
    if (currentDilemmaIndex >= dilemmas.length) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "a") {
        handleChoiceSelect(dilemmas[currentDilemmaIndex].choices[0]);
      } else if (key === "b") {
        handleChoiceSelect(dilemmas[currentDilemmaIndex].choices[1]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEvil, isChatOpen, showChoices, selectedChoice, currentDilemmaIndex]);

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

      // Notifier que l'IA peut parler à nouveau
      gamemaster.socket.emit("game-message", {
        from: "aria",
        type: "aria-dilemma",
        data: { isSpeakingAllowed: true }
      });

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
                  style={{ transition: "all 0.1s linear" }}
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

      {/* Intro keyword popups */}
      <KeywordPopups isPlaying={isIntroPlaying} onComplete={handleIntroComplete} />

      {/* Scanline effect */}
      <div className="scanline"></div>

      {/* CRT overlay effects */}
      <div className="crt-overlay"></div>
      <div className="crt-flicker"></div>


      {/* Dilemma Interface - Full Screen */}
      {isEvil && isChatOpen && showChoices && currentDilemmaIndex < dilemmas.length && (
        <div className={`dilemma-overlay ${dilemmaShock ? "glitch-active" : ""}`}>
          {/* Question at top */}
          <div className="dilemma-question">
            <span className="dilemma-number">DILEMME</span>
            <p className="dilemma-text">{dilemmas[currentDilemmaIndex].description}</p>
          </div>

          {/* Choices left and right */}
          <div className={`dilemma-choices ${selectedChoice ? "choice-made" : ""}`}>
            <div
              className={`dilemma-choice dilemma-choice-left ${selectedChoice === dilemmas[currentDilemmaIndex].choices[0].id ? "selected" : ""} ${selectedChoice && selectedChoice !== dilemmas[currentDilemmaIndex].choices[0].id ? "not-selected" : ""}`}
            >
              <span className="choice-label">A</span>
              <span className="choice-text">{dilemmas[currentDilemmaIndex].choices[0].description}</span>
              <span className="choice-key">Appuyez sur A</span>
            </div>

            <div
              className={`dilemma-choice dilemma-choice-right ${selectedChoice === dilemmas[currentDilemmaIndex].choices[1].id ? "selected" : ""} ${selectedChoice && selectedChoice !== dilemmas[currentDilemmaIndex].choices[1].id ? "not-selected" : ""}`}
            >
              <span className="choice-label">B</span>
              <span className="choice-text">{dilemmas[currentDilemmaIndex].choices[1].description}</span>
              <span className="choice-key">Appuyez sur B</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AriaCat;
