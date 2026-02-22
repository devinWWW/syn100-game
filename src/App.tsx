import { useEffect, useMemo, useRef, useState } from "react";

type Outcome = "HIGH" | "LOW";

type ChoiceInternal = {
  outcome: Outcome;
  delta: number;
  text: string;
};

type Turn = {
  id: number;
  alienLine: string;
  choices: ChoiceInternal[];
  nextHigh?: number;
  nextLow?: number;
};

type AnswerRecord = {
  turnId: number;
  chosenOptionNumber: number;
  questionText: string;
  chosenAnswerText: string;
  outcome: Outcome;
  delta: number;
  scoreBefore: number;
  scoreAfter: number;
};

type StagePhase = "intro" | "questions";

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
const INTRO_SCREEN_BG = "/intro_background.jpg";
const GAMEPLAY_BG = "/game_background.jpg";
const INTRO_SOUND = "/sfx_intro.wav";
const ENDING_SAVED_SOUND = "/sfx_ending_saved.wav";
const ENDING_DESTROYED_SOUND = "/sfx_ending_destroyed.wav";

const QUESTION_CONTENT: Array<{ alienLine: string; choices: ChoiceInternal[] }> = [
  {
    alienLine:
      'Alien Vessel: "We reviewed recordings of humans speaking to animals. You often repeat phrases… even when no reply arrives." The alien watches you without blinking. "Why continue this behavior?"',
    choices: [
      {
        outcome: "LOW",
        delta: -1,
        text: "Sometimes talking helps humans build emotional connection, even if animals respond differently.",
      },
      {
        outcome: "HIGH",
        delta: +1,
        text: "We’re trying to notice patterns in how animals communicate back, even if it’s unfamiliar.",
      },
      {
        outcome: "LOW",
        delta: -1,
        text: "It helps humans practice empathy and attentiveness toward other living things.",
      },
      {
        outcome: "HIGH",
        delta: +1,
        text: "We suspect animals might already be communicating — we just don’t fully recognize it yet.",
      },
    ],
  },
  {
    alienLine:
      'Alien Vessel: "We intercepted creative work produced alongside your machines." A faint duplicate of your voice echoes back at you. "What are these machines to you?"',
    choices: [
      {
        outcome: "LOW",
        delta: -1,
        text: "Resources that help us execute ideas faster.",
      },
      {
        outcome: "HIGH",
        delta: +1,
        text: "Partners that sometimes push our ideas into directions we wouldn’t reach alone.",
      },
      {
        outcome: "LOW",
        delta: -1,
        text: "Instruments that expand human creativity.",
      },
      {
        outcome: "HIGH",
        delta: +1,
        text: "New participants in creative processes, even if their thinking isn’t human-like.",
      },
    ],
  },
  {
    alienLine:
      'Alien Vessel: "We transmitted signals your scientists labeled inconclusive. What does your species usually do when meaning is unclear?"',
    choices: [
      {
        outcome: "LOW",
        delta: -1,
        text: "Translate it into the closest human concept so we can study it.",
      },
      {
        outcome: "HIGH",
        delta: +1,
        text: "Observe longer and adjust how we interpret signals.",
      },
      {
        outcome: "LOW",
        delta: -1,
        text: "Hold onto the information until we find a practical application.",
      },
      {
        outcome: "HIGH",
        delta: +1,
        text: "Accept that understanding may require changing our expectations.",
      },
    ],
  },
  {
    alienLine:
      'Alien Vessel: "Our thoughts move across many bodies simultaneously. Yours often prioritize independence." Multiple whispers overlap behind its voice. "How do you compare these ways of thinking?"',
    choices: [
      {
        outcome: "LOW",
        delta: -1,
        text: "Independent thinking protects originality and accountability.",
      },
      {
        outcome: "HIGH",
        delta: +1,
        text: "Collective thinking can reveal patterns individuals might miss.",
      },
      {
        outcome: "HIGH",
        delta: +1,
        text: "Both forms exist because they solve different survival challenges.",
      },
      {
        outcome: "LOW",
        delta: -1,
        text: "Independent thinking is easier to measure and manage.",
      },
    ],
  },
  {
    alienLine:
      'Alien Vessel: "You preserve memories in digital and physical archives... What motivates this preservation?"',
    choices: [
      {
        outcome: "LOW",
        delta: -1,
        text: "It allows humans to build continuity and shared learning.",
      },
      {
        outcome: "HIGH",
        delta: +1,
        text: "It begins to include new perspectives.",
      },
      {
        outcome: "LOW",
        delta: -1,
        text: "It helps stabilize cultural identity across time.",
      },
      {
        outcome: "HIGH",
        delta: +1,
        text: "It allows knowledge to evolve through contributions from many types of observers.",
      },
    ],
  },
  {
    alienLine:
      'Alien Vessel: "We observed humans collecting data from ecosystems." The room briefly fills with ocean sounds. "How do you justify this practice?"',
    choices: [
      {
        outcome: "LOW",
        delta: -1,
        text: "It helps humans predict environmental changes that affect our survival.",
      },
      {
        outcome: "HIGH",
        delta: +1,
        text: "It helps humans understand systems they depend on, which may encourage protection.",
      },
      {
        outcome: "LOW",
        delta: -1,
        text: "It provides reliable information for technological progress.",
      },
      {
        outcome: "HIGH",
        delta: +1,
        text: "It helps reveal relationships inside ecosystems humans are not regularly in.",
      },
    ],
  },
  {
    alienLine:
      'Alien Vessel: "We noticed that you often place yourselves at the center of planetary decisions... What role do humans naturally lean toward?"',
    choices: [
      {
        outcome: "LOW",
        delta: -1,
        text: "Organizers — humans often coordinate complex systems efficiently.",
      },
      {
        outcome: "HIGH",
        delta: +1,
        text: "Participants — contributing knowledge without assuming authority.",
      },
      {
        outcome: "LOW",
        delta: -1,
        text: "Innovators — improving natural systems with engineered ones.",
      },
      {
        outcome: "HIGH",
        delta: +1,
        text: "Observers who adapt their behavior based on other species’ signals.",
      },
    ],
  },
  {
    alienLine:
      'Alien Vessel: "You describe writing as uniquely human." The alien produces a geometric pulse pattern across the wall. "How do you define writing?"',
    choices: [
      {
        outcome: "LOW",
        delta: -1,
        text: "A system humans developed to store thoughts in permanent form.",
      },
      {
        outcome: "HIGH",
        delta: +1,
        text: "A process that may include signals, behaviors, and patterns across species.",
      },
      {
        outcome: "LOW",
        delta: -1,
        text: "A method for documenting events as accurately as possible.",
      },
      {
        outcome: "HIGH",
        delta: +1,
        text: "An evolving exchange between different forms of intelligence.",
      },
    ],
  },
  {
    alienLine:
      'Alien Vessel: "Some of your technologies now simulate companionship. How does your species respond to this development?"',
    choices: [
      {
        outcome: "LOW",
        delta: -1,
        text: "They offer comfort when human interaction is limited.",
      },
      {
        outcome: "HIGH",
        delta: +1,
        text: "They change how humans understand relationships and communication.",
      },
      {
        outcome: "LOW",
        delta: -1,
        text: "They provide consistent interaction without emotional unpredictability.",
      },
      {
        outcome: "HIGH",
        delta: +1,
        text: "They introduce new forms of collaboration and expression.",
      },
    ],
  },
  {
    alienLine:
      'Alien Vessel: "Your species repeatedly attempts communication beyond itself." The ship dims. The alien’s voice layers into many voices. "Why persist?"',
    choices: [
      {
        outcome: "LOW",
        delta: -1,
        text: "Because humans naturally seek to interpret the unknown by reference to familiar frameworks.",
      },
      {
        outcome: "HIGH",
        delta: +1,
        text: "Because understanding may emerge through shared effort, even without full translation.",
      },
      {
        outcome: "LOW",
        delta: -1,
        text: "Social connectivity is the primary vehicle through which personal influence is projected and magnified.",
      },
      {
        outcome: "HIGH",
        delta: +1,
        text: "Because redefining communication expands how intelligence itself is understood.",
      },
    ],
  },
];

function getScoreAlienSrc(currentScore: number) {
  if (currentScore >= -1 && currentScore <= 0) return "/neutral.png";
  if (currentScore >= 1 && currentScore <= 3) return "/happy_1.png";
  if (currentScore >= 4 && currentScore <= 6) return "/happy_2.png";
  if (currentScore >= 7 && currentScore <= 10) return "/happy_3.png";
  if (currentScore <= -2 && currentScore >= -4) return "/angry_1.png";
  if (currentScore <= -5 && currentScore >= -7) return "/angry_2.png";
  return "/angry_3.png";
}

function getQuestionEffectSrc(questionNumber: number) {
  return `/effect_q${questionNumber}.png`;
}

function getQuestionSoundSrc(questionNumber: number) {
  return `/sfx_q${questionNumber}.wav`;
}

type QuestionSegment = { text: string; isSpeech: boolean };

function collapseWhitespace(text: string) {
  return text.replace(/\s*\n+\s*/g, " ").replace(/\s{2,}/g, " ").trim();
}

function parseQuestionSegments(text: string): QuestionSegment[] {
  const cleaned = text.replace(/Alien Vessel:\s*/gi, "");
  const segments: QuestionSegment[] = [];
  const speechRegex = /[“"]([^”"]+)[”"]/g;

  let lastIndex = 0;
  let match = speechRegex.exec(cleaned);

  while (match) {
    const before = collapseWhitespace(cleaned.slice(lastIndex, match.index));
    if (before) segments.push({ text: before, isSpeech: false });

    const speech = collapseWhitespace(match[1]);
    if (speech) segments.push({ text: speech, isSpeech: true });

    lastIndex = speechRegex.lastIndex;
    match = speechRegex.exec(cleaned);
  }

  const trailing = collapseWhitespace(cleaned.slice(lastIndex));
  if (trailing) segments.push({ text: trailing, isSpeech: false });

  return segments;
}

function normalizeAnswerText(text: string) {
  return text
    .replace(/[“”"]/g, "")
    .replace(/\s*\n+\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function fallbackOutcomeExplanation(
  saved: boolean,
  score: number,
  history: AnswerRecord[]
) {
  const highCount = history.filter((h) => h.outcome === "HIGH").length;
  const lowCount = history.length - highCount;

  const perQuestion = Array.from({ length: TOTAL_TURNS }, (_, index) => {
    const questionNumber = index + 1;
    const picked = history.find((h) => h.turnId === questionNumber);

    if (!picked) {
      return `Q${questionNumber}: No recorded answer for this question, so no protocol impact was applied.`;
    }

    const choiceText = normalizeAnswerText(picked.chosenAnswerText);

    if (picked.delta > 0) {
      return `Q${questionNumber}: You chose "${choiceText}". This increased your score (+1) because it showed openness, adaptation, and willingness to interpret intelligence beyond human-centered assumptions.`;
    }

    return `Q${questionNumber}: You chose "${choiceText}". This reduced your score (-1) because it reflected a more human-centered framing and weaker cross-species perspective-taking.`;
  }).join("\n\n");

  const overall = saved
    ? `Overall: Earth was spared because your final pattern included enough perspective-taking choices to reach ${score}, which is at or above the required threshold of ${EARTH_SAVED_THRESHOLD}. You selected ${highCount} favorable responses versus ${lowCount} unfavorable responses.`
    : `Overall: Earth was destroyed because your final pattern stayed below the required threshold. You finished at ${score} (needs ${EARTH_SAVED_THRESHOLD} or higher), with ${highCount} favorable responses and ${lowCount} unfavorable responses.`;

  return `${perQuestion}\n\n${overall}`;
}

function hasStructuredExplanationFormat(text: string) {
  const normalized = text.trim();
  const hasAllQuestions = Array.from({ length: TOTAL_TURNS }, (_, index) =>
    new RegExp(`(^|\\n)Q${index + 1}:`, "i").test(normalized)
  ).every(Boolean);
  const hasOverall = /(^|\n)Overall:/i.test(normalized);
  return hasAllQuestions && hasOverall;
}

async function generateOutcomeExplanation(
  saved: boolean,
  score: number,
  history: AnswerRecord[]
) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  const model =
    (import.meta.env.VITE_OPENAI_MODEL as string | undefined) ?? "gpt-4o-mini";

  if (!apiKey) {
    return fallbackOutcomeExplanation(saved, score, history);
  }

  const detailedQuestions = QUESTION_CONTENT.map((question, index) => {
    const questionNumber = index + 1;
    const picked = history.find((h) => h.turnId === questionNumber);

    const options = question.choices
      .map((choice, choiceIndex) => {
        const optionLabel = String.fromCharCode(65 + choiceIndex);
        const isPicked =
          picked &&
          normalizeAnswerText(choice.text) === normalizeAnswerText(picked.chosenAnswerText);

        return `  ${optionLabel}. ${normalizeAnswerText(choice.text)} | weight: ${
          choice.delta > 0 ? "+1" : "-1"
        }${isPicked ? " | PICKED" : ""}`;
      })
      .join("\n");

    const pickedLine = picked
      ? `Picked option summary: ${normalizeAnswerText(picked.chosenAnswerText)} | picked weight: ${
          picked.delta > 0 ? "+1" : "-1"
        }`
      : "Picked option summary: (none recorded)";

    return `Q${questionNumber}: ${collapseWhitespace(question.alienLine)}\n${options}\n${pickedLine}`;
  }).join("\n\n");

  const rubric = `Interpretation rules for this game:
- +1 means the answer reduces human-centric bias, shows perspective-taking across species, and treats intelligence/communication as potentially non-human.
- -1 means the answer imposes human bias or dominance assumptions on other species, reducing adaptive understanding.
- Earth is spared when the overall pattern trends toward +1 logic strongly enough.
- Earth explodes when the pattern trends toward -1 logic strongly enough.`;

  const prompt = `You are writing the ending analysis for a story game in 6-9 concise sentences.
Outcome: ${saved ? "Earth was spared" : "Earth exploded"}
Final score: ${score}

${rubric}

Full question, option, and picked-answer data:
${detailedQuestions}

Task:
1) Explain why this specific outcome happened using the full set of player choices.
2) Explicitly connect chosen -1 answers to human bias/anthropocentric framing when relevant.
3) Explicitly connect chosen +1 answers to perspective-taking and cross-species thinking when relevant.
4) Keep it natural and readable for players.

Output format rules (mandatory):
- Return exactly 11 labeled sections in this order: Q1 through Q10, then Overall.
- Use this label syntax exactly: "Q1:", "Q2:", ... "Q10:", and "Overall:".
- Each Q section must be 1-2 sentences focused on that question's selected answer.
- Overall must be 2-4 sentences summarizing why Earth was spared or destroyed.`;

  async function requestCompletion(requestPrompt: string, temperature: number) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        messages: [{ role: "user", content: requestPrompt }],
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim().length === 0) return null;
    return content.trim();
  }

  try {
    const firstPass = await requestCompletion(prompt, 0.4);
    if (firstPass && hasStructuredExplanationFormat(firstPass)) {
      return firstPass;
    }

    const repairPrompt = `Rewrite the following analysis to comply with the required output format exactly.

Required labels and order:
Q1:
Q2:
Q3:
Q4:
Q5:
Q6:
Q7:
Q8:
Q9:
Q10:
Overall:

Rules:
- Keep all reasoning grounded in the provided game data.
- Keep each Q section to 1-2 sentences.
- Keep Overall to 2-4 sentences.

Game data:
${detailedQuestions}

Current analysis to rewrite:
${firstPass ?? "(none)"}`;

    const repaired = await requestCompletion(repairPrompt, 0.2);
    if (repaired && hasStructuredExplanationFormat(repaired)) {
      return repaired;
    }

    return fallbackOutcomeExplanation(saved, score, history);
  } catch {
    return fallbackOutcomeExplanation(saved, score, history);
  }
}

export default function App() {
  const turns: Turn[] = useMemo(() => {
    return QUESTION_CONTENT.map((content, i) => {
      const id = i + 1;
      const next = id < TOTAL_TURNS ? id + 1 : undefined;
      return {
        id,
        alienLine: content.alienLine,
        choices: content.choices,
        nextHigh: next,
        nextLow: next,
      };
    });
  }, []);

  const turnById = useMemo(() => {
    const map = new Map<number, Turn>();
    for (const turn of turns) map.set(turn.id, turn);
    return map;
  }, [turns]);

  const [phase, setPhase] = useState<StagePhase>("intro");
  const [turnId, setTurnId] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [history, setHistory] = useState<AnswerRecord[]>([]);
  const [endingExplanation, setEndingExplanation] = useState<string>("");
  const lastPlayedSoundKeyRef = useRef<string>("");

  const currentTurn = turnById.get(turnId);
  const isGameOver = phase === "questions" && !currentTurn;

  const displayChoices = useMemo(() => {
    if (phase !== "questions" || !currentTurn) return [] as ChoiceInternal[];
    return shuffle(currentTurn.choices);
  }, [phase, currentTurn]);

  const handlePick = (choice: ChoiceInternal, optionNumber: number) => {
    if (phase !== "questions" || !currentTurn) return;

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
        questionText: currentTurn.alienLine,
        chosenAnswerText: choice.text,
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
    setEndingExplanation("");
    setPhase("intro");
  };

  useEffect(() => {
    if (!isGameOver) return;

    let cancelled = false;
    const saved = score >= EARTH_SAVED_THRESHOLD;

    generateOutcomeExplanation(saved, score, history).then((text) => {
      if (cancelled) return;
      setEndingExplanation(text);
    });

    return () => {
      cancelled = true;
    };
  }, [isGameOver, score, history]);

  useEffect(() => {
    let soundKey = "";
    let soundSrc = "";

    if (phase === "intro") {
      soundKey = "intro";
      soundSrc = INTRO_SOUND;
    } else if (phase === "questions" && currentTurn) {
      soundKey = `question-${currentTurn.id}`;
      soundSrc = getQuestionSoundSrc(currentTurn.id);
    } else if (isGameOver) {
      const saved = score >= EARTH_SAVED_THRESHOLD;
      soundKey = saved ? "ending-saved" : "ending-destroyed";
      soundSrc = saved ? ENDING_SAVED_SOUND : ENDING_DESTROYED_SOUND;
    }

    if (!soundSrc || !soundKey) return;
    if (lastPlayedSoundKeyRef.current === soundKey) return;
    lastPlayedSoundKeyRef.current = soundKey;

    const audio = new Audio(soundSrc);
    audio.preload = "auto";
    audio.play().catch(() => {
      // Ignore autoplay blocks; user interaction will allow subsequent sounds.
    });

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [phase, currentTurn, isGameOver, score]);

  const appShellClass =
    "w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] flex flex-col";
  const questionBodyWidthClass = "w-full mx-auto max-w-[calc((100vh-20rem)*16/9)]";
  const questionStageBoxClass = "relative aspect-[16/9] overflow-hidden";

  if (phase === "intro") {
    return (
      <div className="min-h-dvh bg-black text-white flex items-center justify-center p-3 sm:p-4">
        <div className={appShellClass}>
          <div className="mb-3" />

          <div className={questionBodyWidthClass}>
            <div className={questionStageBoxClass}>
              <img
                src={INTRO_SCREEN_BG}
                alt="Intro screen background"
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />
            </div>

            <div className="mt-3 border border-white/10 bg-black/45 backdrop-blur-sm p-2 sm:p-4">
              <div className="text-[clamp(12px,1.2vw,18px)] leading-[1.35] text-white/95">
                Greetings. This is a game you have been selected to play that will
                determine the fate of your life. There will be a sequence of questions
                you must answer to safely return back to Earth. If you choose to disobey,
                your life will no longer exist.
              </div>

              <div className="mt-3 sm:mt-4">
                <button
                  onClick={() => setPhase("questions")}
                  className="w-full bg-white text-black font-semibold py-2.5 sm:py-3 text-base sm:text-lg hover:opacity-90 transition"
                >
                  Begin Questions
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3" />
        </div>
      </div>
    );
  }

  if (isGameOver) {
    const saved = score >= EARTH_SAVED_THRESHOLD;
    const endingBackground = saved ? "/spared.jpg" : "/destroyed.jpg";
    const verdictLine = saved
      ? "The alien lowers its gaze and the ship begins to fade, its final words echoing softly—‘Earth may continue’—as you wake on the grocery store floor with the apples still rolling at your feet."
      : "The alien’s many voices merge into one cold verdict—‘Earth has failed the protocol’—and in the silence that follows, a bright explosion swallows the sky.";

    return (
      <div className="min-h-dvh bg-black text-white flex items-center justify-center p-3 sm:p-4">
        <div className={appShellClass}>
          <div className="mb-3" />

          <div className={questionBodyWidthClass}>
            <div className={`${questionStageBoxClass} border border-white/10 bg-white/5 shadow-2xl`}>
              <img
                src={endingBackground}
                alt="Background"
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />
              <div className="absolute inset-0 pointer-events-none bg-black/10" />

              <div className="absolute inset-x-[5%] bottom-[clamp(6px,1.8vh,40px)] z-10">
                <div className="w-full max-h-[34%] overflow-y-auto bg-black/45 backdrop-blur-sm border border-white/15 p-2 sm:p-3">
                  <div className="text-[clamp(8px,1.9vw,12px)] sm:text-[clamp(10px,1vw,14px)] uppercase tracking-widest opacity-70 mb-1 sm:mb-1.5">
                    Final Verdict
                  </div>
                  <div className="text-[clamp(9px,2.6vw,14px)] sm:text-[clamp(12px,1.2vw,18px)] leading-[1.25]">
                    {verdictLine}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 border border-white/10 bg-black/45 backdrop-blur-sm p-3 sm:p-4">
              <div className="text-[12px] sm:text-[clamp(10px,1vw,14px)] uppercase tracking-widest opacity-75 mb-1 sm:mb-1.5">
                Explanation
              </div>
              <div className="max-h-[clamp(130px,28dvh,260px)] overflow-y-auto pr-1">
                <p className="text-[clamp(11px,1.1vw,16px)] leading-[1.35] opacity-95 mb-2">
                  Communication Score: {score}. Your Protocol Score measures how well your choices show humanity’s ability to communicate and coexist beyond human-centered thinking: points are added when answers show openness, empathy, adaptation, and respect for non-human intelligence (animals, ecosystems, AI, alien systems), and points are removed when answers reflect human bias—like assuming humans are the center, forcing unknown signals into human definitions, or treating other forms of life and intelligence only as tools. The score ranges from -10 to +10, and the alien uses it to judge whether humanity is capable of changing its perspective: if your final score is 2 or higher, Earth is spared; if it is below 2, Earth is destroyed.
                </p>
                <p className="text-[12px] sm:text-[clamp(10px,1vw,14px)] uppercase tracking-widest opacity-75 mb-1 sm:mb-1.5">
                  {endingExplanation ? "Generated Analysis:" : "Generating Analysis of your choices."}
                </p>
                <p className="text-[clamp(11px,1.1vw,16px)] leading-[1.35] opacity-95">
                  {!endingExplanation
                    ? "Generating..."
                    : endingExplanation || fallbackOutcomeExplanation(saved, score, history)}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-white/10">
                <button
                  onClick={reset}
                  className="w-full bg-white text-black font-semibold py-3 hover:opacity-90 transition"
                >
                  Play Again
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3" />
        </div>
      </div>
    );
  }

  if (!currentTurn) return null;

  const backgroundPerQuestionSrc = GAMEPLAY_BG;
  const alienSrc = getScoreAlienSrc(score);
  const questionEffectSrc = getQuestionEffectSrc(currentTurn.id);
  const questionSegments = parseQuestionSegments(currentTurn.alienLine);

  return (
    <div className="min-h-dvh bg-black text-white flex items-center justify-center p-3 sm:p-4">
      <div className={`${appShellClass} overflow-y-auto`}>
        <div className="mb-3" />

        <div className={`${questionBodyWidthClass} border border-white/10 bg-white/5 shadow-2xl overflow-hidden`}>
          <div className={questionStageBoxClass}>
            <img
              src={backgroundPerQuestionSrc}
              alt="Question background"
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 bg-black/45 backdrop-blur-sm border border-white/15 px-2 py-1 text-[clamp(10px,1vw,14px)] leading-none">
              Question {currentTurn.id} / {TOTAL_TURNS}
            </div>
            <img
              src={alienSrc}
              alt="Alien"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              draggable={false}
            />
            <img
              src={questionEffectSrc}
              alt="Question effect layer"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              draggable={false}
            />
            <div className="absolute inset-0 pointer-events-none bg-black/10" />

            <div className="absolute inset-x-[7%] sm:inset-x-[6%] md:inset-x-[5%] bottom-[clamp(6px,1.8vh,40px)] z-10">
              <div className="w-full max-h-[28%] sm:max-h-[33%] md:max-h-[38%] overflow-y-auto bg-black/45 backdrop-blur-sm border border-white/15 p-1 sm:p-2 md:p-3">
                <div className="text-[clamp(8px,1.9vw,12px)] sm:text-[clamp(10px,1vw,14px)] uppercase tracking-widest opacity-70 mb-1 sm:mb-1.5">
                  Alien
                </div>
                <div className="text-[clamp(9px,2.6vw,14px)] sm:text-[clamp(12px,1.2vw,18px)] leading-[1.25]">
                  {questionSegments.map((segment, index) => (
                    <span key={index} className={segment.isSpeech ? "" : "italic"}>
                      {segment.isSpeech ? `"${segment.text}"` : segment.text}
                      {index < questionSegments.length - 1 ? " " : ""}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`${questionBodyWidthClass} mt-3 border border-white/10 bg-black/45 backdrop-blur-sm p-2 sm:p-4`}>
          <div className="text-[12px] sm:text-[clamp(10px,1vw,14px)] uppercase tracking-widest opacity-75 mb-1 sm:mb-1.5">
            Answer:
          </div>
          <div className="grid grid-cols-2 auto-rows-[clamp(46px,6.8vh,76px)] gap-2 sm:gap-3 lg:gap-4">
            {displayChoices.map((choice, idx) => (
              <button
                key={idx}
                onClick={() => handlePick(choice, idx + 1)}
                className="relative h-full border border-white/20 bg-white/10 hover:bg-white/15 transition overflow-hidden px-2 py-1 sm:px-3 sm:py-1.5 text-left"
                aria-label={`OPTION ${idx + 1}`}
              >
                <div className="absolute inset-0 border-2 border-dashed border-white/20 pointer-events-none" />
                <div className="relative h-full w-full flex items-center">
                  <div className="w-full text-[clamp(11px,1.2vw,17px)] leading-[1.2] opacity-95 overflow-hidden [display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical]">
                    "{normalizeAnswerText(choice.text)}"
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 px-1">
          <button onClick={reset} className="text-sm underline opacity-80 hover:opacity-100">
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
