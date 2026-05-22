/**
 * Relationship Quiz — "How well do you know us?"
 * A mini quiz with questions only you two would know the answers to.
 * Shows a score and a cute message at the end.
 */
import { useState, useEffect } from "react";
import { Brain, Check, X, Trophy, RotateCcw, Sparkles } from "lucide-react";
import { fetchApiJson } from "@/lib/fetchApi";
import { useHeartRainfall } from "@/context/heartRainfall";

interface QuizQuestion {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  sortRank: number;
}

interface QuizAnswer {
  id: string;
  correctOption: "a" | "b" | "c" | "d";
  funFact: string;
}

type OptionKey = "a" | "b" | "c" | "d";

export function RelationshipQuiz() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, OptionKey>>({});
  const [showResults, setShowResults] = useState(false);
  const { triggerHeartRainfall } = useHeartRainfall();

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const [qs, ans] = await Promise.all([
          fetchApiJson<QuizQuestion[]>("/quiz"),
          fetchApiJson<QuizAnswer[]>("/quiz/answers"),
        ]);
        setQuestions(qs);
        setAnswers(ans);
      } catch (error) {
        console.error("Failed to fetch quiz:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, []);

  const handleStart = () => {
    setStarted(true);
    setCurrentIndex(0);
    setUserAnswers({});
    setShowResults(false);
  };

  const handleAnswer = (option: OptionKey) => {
    const currentQ = questions[currentIndex];
    setUserAnswers((prev) => ({ ...prev, [currentQ.id]: option }));

    if (currentIndex < questions.length - 1) {
      setTimeout(() => setCurrentIndex((i) => i + 1), 300);
    } else {
      setTimeout(() => {
        setShowResults(true);
        triggerHeartRainfall();
      }, 300);
    }
  };

  const score = showResults
    ? questions.reduce((acc, q) => {
        const correct = answers.find((a) => a.id === q.id)?.correctOption;
        return acc + (userAnswers[q.id] === correct ? 1 : 0);
      }, 0)
    : 0;

  const percentage = showResults ? Math.round((score / questions.length) * 100) : 0;

  const getMessage = () => {
    if (percentage === 100) return "Perfect score! You know us better than we know ourselves! 💕";
    if (percentage >= 80) return "Amazing! You really pay attention to our story! 🥰";
    if (percentage >= 60) return "Pretty good! You know us well! 💖";
    if (percentage >= 40) return "Not bad! There's still more to discover! 💫";
    return "Looks like you need to spend more time with us! 😄";
  };

  if (loading) {
    return (
      <section className="relative py-20 px-6 lg:px-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mx-auto mb-4" />
          <div className="h-12 w-full bg-muted animate-pulse rounded" />
        </div>
      </section>
    );
  }

  if (questions.length === 0) return null;

  // Start screen
  if (!started) {
    return (
      <section className="relative py-20 px-6 lg:px-12 overflow-hidden">
        <div
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 65% 50% at 50% 50%, oklch(0.15 0.05 280 / 0.3) 0%, transparent 70%)",
          }}
        />

        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="h-px w-8 bg-primary/60" />
            <p className="text-xs uppercase tracking-[0.4em] text-primary/80">Test Your Knowledge</p>
            <span className="h-px w-8 bg-primary/60" />
          </div>
          <h2 className="font-display text-5xl md:text-6xl mb-3">
            How Well Do <span className="text-primary italic">You Know Us?</span>
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            A mini quiz with questions only we would know the answers to. Let's see how much you've been paying attention!
          </p>

          <div className="inline-flex items-center gap-3 bg-card/50 backdrop-blur border border-border/60 rounded-2xl px-6 py-4 mb-8">
            <Brain className="h-8 w-8 text-primary" />
            <div className="text-left">
              <p className="text-sm text-muted-foreground">Questions</p>
              <p className="text-2xl font-display">{questions.length}</p>
            </div>
          </div>

          <button
            onClick={handleStart}
            className="group inline-flex items-center gap-3 bg-primary text-primary-foreground px-10 py-5 rounded-2xl text-lg font-semibold shadow-[var(--shadow-glow)] hover:scale-105 hover:shadow-[0_0_40px_oklch(0.5_0.2_22/0.5)] active:scale-95 transition-all duration-200"
          >
            <Sparkles className="h-5 w-5" />
            Start Quiz
          </button>
        </div>
      </section>
    );
  }

  // Results screen
  if (showResults) {
    return (
      <section className="relative py-20 px-6 lg:px-12 overflow-hidden">
        <div
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 65% 50% at 50% 50%, oklch(0.15 0.05 280 / 0.3) 0%, transparent 70%)",
          }}
        />

        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <Trophy className="h-16 w-16 text-primary mx-auto mb-4 animate-bounce" />
            <h2 className="font-display text-5xl md:text-6xl mb-3">
              Your <span className="text-primary italic">Score</span>
            </h2>
            <div className="text-7xl font-display text-primary mb-2">{percentage}%</div>
            <p className="text-xl text-muted-foreground mb-6">
              {score} out of {questions.length} correct
            </p>
            <p className="text-lg">{getMessage()}</p>
          </div>

          {/* Answer breakdown */}
          <div className="space-y-4 mb-8 text-left">
            {questions.map((q) => {
              const answer = answers.find((a) => a.id === q.id);
              const userAnswer = userAnswers[q.id];
              const isCorrect = userAnswer === answer?.correctOption;
              const options = { a: q.optionA, b: q.optionB, c: q.optionC, d: q.optionD };

              return (
                <div
                  key={q.id}
                  className="bg-card/50 backdrop-blur border border-border/60 rounded-xl p-5"
                >
                  <div className="flex items-start gap-3 mb-3">
                    {isCorrect ? (
                      <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <X className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium mb-2">{q.question}</p>
                      <p className="text-sm text-muted-foreground">
                        Your answer: <span className={isCorrect ? "text-green-500" : "text-red-500"}>{options[userAnswer]}</span>
                      </p>
                      {!isCorrect && answer && (
                        <p className="text-sm text-muted-foreground">
                          Correct answer: <span className="text-green-500">{options[answer.correctOption]}</span>
                        </p>
                      )}
                      {answer?.funFact && (
                        <p className="text-xs text-primary/80 mt-2 italic">💡 {answer.funFact}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleStart}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </section>
    );
  }

  // Quiz question screen
  const currentQ = questions[currentIndex];
  const options: { key: OptionKey; label: string }[] = [
    { key: "a", label: currentQ.optionA },
    { key: "b", label: currentQ.optionB },
    { key: "c", label: currentQ.optionC },
    { key: "d", label: currentQ.optionD },
  ];

  return (
    <section className="relative py-20 px-6 lg:px-12 overflow-hidden">
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 65% 50% at 50% 50%, oklch(0.15 0.05 280 / 0.3) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Question {currentIndex + 1} of {questions.length}</span>
            <span>{Math.round(((currentIndex + 1) / questions.length) * 100)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="bg-card/50 backdrop-blur border border-border/60 rounded-2xl p-8 mb-6">
          <h3 className="font-display text-2xl md:text-3xl mb-8 text-center">{currentQ.question}</h3>

          <div className="space-y-3">
            {options.map((opt) => (
              <button
                key={opt.key}
                onClick={() => handleAnswer(opt.key)}
                className="w-full text-left px-6 py-4 rounded-xl border border-border/60 bg-card/30 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <span className="shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-sm group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {opt.key.toUpperCase()}
                  </span>
                  <span className="flex-1">{opt.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
