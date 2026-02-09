import React, { useEffect, useMemo, useState } from "react";

type Outcome = "HIGH" | "LOW";

type Turn = {
  id: number; // 1..10
  alienLine: string;
  nextHigh?: number;
  nextLow?: number;
};

type ChoiceInternal = {
  outcome: Outcome;
  delta: number;
};

type AnswerRecord = {
  turnId: number;
  chosenOptionNumber: number; // 1..4 (as shown on screen)
  outcome: Outcome;
  delta: number;
  scoreBefore: number;
  scoreAfter: number;
};

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SCORE_MIN = -10;
const SCORE_MAX = 10;
const TOTAL_TURNS = 10;
const EARTH_SAVED_THRESHOLD = 2;

/**
 * You will add your images to:
 * public/images/...
 *
 * Background:
 *   public/images/bg.png
 *
 * Alien images (example naming):
 *   public/images/alien_q1_super_mad.png
 *   public/images/alien_q1_mad.png
 *   public/images/alien_q1_neutral.png
 *   public/images/alien_q1_happy.png
 *   public/images/alien_q1_super_happy.png
 *   ...
 *   public/images/alien_q10_super_mad.png
 *   public/images/alien_q10_mad.png
 *   public/images/alien_q10_neutral.png
 *   public/images/alien_q10_happy.png
 *   public/images/alien_q10_super_happy.png
 *
 * Endings:
 *   public/images/ending_safe.png
 *   public/images/ending_explode.png
 */

// 5-tier mood based on score
type Mood = "super_mad" | "mad" | "neutral" | "happy" | "super_happy";

function scoreToMood(score: number): Mood {
  if (score <= -4) return "super_mad";
  if (score <= -2) return "mad";
  if (score >= 4) return "super_happy";
  if (score >= 2) return "happy";
  return "neutral";
}

// Build the alien image path based on question + mood
function getAlienImageSrc(questionNumber: number, score: number) {
  const mood = scoreToMood(score);
  return `/images/alien_q${questionNumber}_${mood}.png`;
}

export default function App() {
  // Placeholder story nodes
  const turns: Turn[] = useMemo(() => {
    return Array.from({ length: TOTAL_TURNS }, (_, i) => {
      const id = i + 1;
      const next = id < TOTAL_TURNS ? id + 1 : undefined;
      return {
        id,
        alienLine: `Alien says something for Question ${id}…`,
        nextHigh: next,
        nextLow: next,
      };
    });
  }, []);

  const turnById = useMemo(() => {
    const m = new Map<number, Turn>();
    for (const t of turns) m.set(t.id, t);
    return m;
  }, [turns]);

  const [turnId, setTurnId] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [displayChoices, setDisplayChoices] = useState<ChoiceInternal[]>([]);
  const [history, setHistory] = useState<AnswerRecord[]>([]);

  const currentTurn = turnById.get(turnId);
  const isGameOver = !currentTurn;

  useEffect(() => {
    const internal: ChoiceInternal[] = [
      { outcome: "HIGH", delta: +1 },
      { outcome: "HIGH", delta: +1 },
      { outcome: "LOW", delta: -1 },
      { outcome: "LOW", delta: -1 },
    ];
    setDisplayChoices(shuffle(internal));
  }, [turnId]);

  const handlePick = (choice: ChoiceInternal, optionNumber: number) => {
    if (!currentTurn) return;

    const scoreBefore = score;
    const scoreAfter = Math.max(
      SCORE_MIN,
      Math.min(SCORE_MAX, scoreBefore + choice.delta)
    );

    setScore(scoreAfter);

    setHistory((prev) => [
      ...prev,
      {
        turnId: currentTurn.id,
        chosenOptionNumber: optionNumber,
        outcome: choice.outcome,
        delta: choice.delta,
        scoreBefore,
        scoreAfter,
      },
    ]);

    const nextId =
      choice.outcome === "HIGH" ? currentTurn.nextHigh : currentTurn.nextLow;

    if (nextId) setTurnId(nextId);
    else setTurnId(999999);
  };

  const reset = () => {
    setScore(0);
    setTurnId(1);
    setHistory([]);
  };

  // Shared background for the stage
  const backgroundSrc = "/images/bg.png";

  // Fixed stage sizing that scales cleanly with screen
  const stageHeight = "h-[clamp(520px,78vh,920px)]";

  if (isGameOver) {
    const saved = score >= EARTH_SAVED_THRESHOLD;
    const endingImage = saved
      ? "/images/ending_safe.png"
      : "/images/ending_explode.png";

    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-5xl">
          <div className="relative w-full overflow-hidden border border-white/10 bg-white/5 shadow-2xl">
            <div className={`relative w-full ${stageHeight}`}>
              {/* Background */}
              <img
                src={backgroundSrc}
                alt="Background"
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />
              {/* Ending image over background */}
              <img
                src={endingImage}
                alt={saved ? "Earth is safe" : "Earth explodes"}
                className="absolute inset-0 w-full h-full object-contain"
                draggable={false}
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/35" />

              {/* Layout grid (stable) */}
              <div className="absolute inset-0 grid grid-rows-[1fr_auto_auto] gap-4 p-4 sm:p-6">
                {/* Spacer row (image already visible) */}
                <div />

                {/* Summary row */}
                <div className="bg-black/55 backdrop-blur-sm border border-white/15 p-4 sm:p-5">
                  <h1 className="text-3xl font-bold mb-2">Game Over</h1>
                  <p className="opacity-90">
                    Final like score: <span className="font-semibold">{score}</span>
                  </p>
                </div>

                {/* Bottom row: scrollable content + fixed reset */}
                <div className="bg-black/55 backdrop-blur-sm border border-white/15 p-4 sm:p-5 flex flex-col min-h-0">
                  {/* Scroll area */}
                  <div className="flex-1 min-h-0 overflow-y-auto pr-2">
                    <div className="mb-4">
                      {saved ? (
                        <>
                          <p className="text-xl font-semibold">✅ Earth is spared.</p>
                          <p className="opacity-90 mt-1">
                            (Placeholder) You’ll add the full explanation text for this ending.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-xl font-semibold">💥 Earth explodes.</p>
                          <p className="opacity-90 mt-1">
                            (Placeholder) You’ll add the full explanation text for this ending.
                          </p>
                        </>
                      )}
                    </div>

                    {/* Recap */}
                    <div className="mb-5 border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-semibold mb-3">Your answers</div>
                      <div className="space-y-2 text-sm">
                        {history.length === 0 ? (
                          <div className="opacity-70">(No answers recorded)</div>
                        ) : (
                          history.map((h) => (
                            <div
                              key={h.turnId}
                              className="flex items-center justify-between gap-4"
                            >
                              <div className="opacity-90">
                                Q{h.turnId}: picked OPTION {h.chosenOptionNumber}
                              </div>
                              <div className="opacity-70">
                                {h.outcome} ({h.delta > 0 ? "+" : ""}
                                {h.delta}) — score {h.scoreBefore} → {h.scoreAfter}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Extra space so last line doesn't hide behind button on small screens */}
                    <div className="h-2" />
                  </div>

                  {/* Fixed button */}
                  <div className="pt-3 border-t border-white/10">
                    <button
                      onClick={reset}
                      className="w-full bg-white text-black font-semibold py-3 hover:opacity-90 transition"
                    >
                      Play Again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs opacity-60 px-1">
            Put ending images at:{" "}
            <span className="font-semibold">public/images/ending_safe.png</span>{" "}
            and <span className="font-semibold">public/images/ending_explode.png</span>
          </div>
        </div>
      </div>
    );
  }

  const alienSrc = getAlienImageSrc(currentTurn.id, score);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-5xl">
        {/* Top HUD (outside canvas) */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="text-sm opacity-90">
            Question <span className="font-semibold">{currentTurn.id}</span> /{" "}
            {TOTAL_TURNS}
          </div>
          <div className="text-sm opacity-90">
            Like Score: <span className="font-semibold">{score}</span>
          </div>
        </div>

        {/* Stage (square corners) */}
        <div className="relative w-full overflow-hidden border border-white/10 bg-white/5 shadow-2xl">
          <div className={`relative w-full ${stageHeight}`}>
            {/* Background */}
            <img
              src={backgroundSrc}
              alt="Background"
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />

            {/* Alien layer (can extend behind UI / down to options) */}
            <img
              src={alienSrc}
              alt="Alien"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              draggable={false}
            />

            {/* Slight dark overlay so UI pops */}
            <div className="absolute inset-0 pointer-events-none bg-black/20" />

            {/* UI grid (stable scaling) */}
            <div className="absolute inset-0 grid grid-rows-[1fr_auto_auto] gap-4 p-4 sm:p-6">
              {/* Spacer row */}
              <div />

              {/* Dialogue box */}
              <div className="bg-black/55 backdrop-blur-sm border border-white/15 p-4 sm:p-5">
                <div className="text-[11px] uppercase tracking-widest opacity-70 mb-2">
                  Alien
                </div>
                <div className="text-sm sm:text-lg leading-relaxed">
                  {currentTurn.alienLine}
                </div>
              </div>

              {/* Options */}
              <div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {displayChoices.map((choice, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePick(choice, idx + 1)}
                      className="relative h-14 sm:h-16 border border-white/20 bg-white/10 hover:bg-white/15 transition overflow-hidden"
                      aria-label={`OPTION ${idx + 1}`}
                    >
                      <div className="absolute inset-0 border-2 border-dashed border-white/20 pointer-events-none" />
                      <div className="h-full w-full flex items-center justify-center font-semibold tracking-wide">
                        {`OPTION ${idx + 1}`}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-3 text-xs opacity-50">
                  (Dev) Alien image path right now:{" "}
                  <span className="font-mono">{alienSrc}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="flex items-center justify-between mt-3 px-1">
          <button onClick={reset} className="text-sm underline opacity-80 hover:opacity-100">
            Reset
          </button>
          <div className="text-xs opacity-60">
            Ending if score ≥ {EARTH_SAVED_THRESHOLD}: Earth spared
          </div>
        </div>

        <div className="mt-3 text-xs opacity-60 px-1">
          Put background at: <span className="font-semibold">public/images/bg.png</span>
          <br />
          Put alien images like:{" "}
          <span className="font-semibold">public/images/alien_q1_super_mad.png</span>,{" "}
          <span className="font-semibold">alien_q1_neutral.png</span>,{" "}
          <span className="font-semibold">alien_q1_super_happy.png</span> … up to q10.
        </div>
      </div>
    </div>
  );
}
