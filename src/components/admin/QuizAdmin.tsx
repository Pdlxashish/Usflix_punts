/**
 * Admin panel section — manage Relationship Quiz questions.
 */
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, AlertCircle, Check, Brain } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface QuizQuestion {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "a" | "b" | "c" | "d";
  funFact: string;
  sortRank: number;
}

const BLANK = {
  question: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOption: "a" as "a" | "b" | "c" | "d",
  funFact: "",
  sortRank: 0,
};

export function QuizAdmin() {
  const toast = useToast();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await api.get<QuizQuestion[]>("/quiz/admin");
      setQuestions(data);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startEdit = (q: QuizQuestion) => {
    setEditingId(q.id);
    setForm({
      question: q.question,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctOption: q.correctOption,
      funFact: q.funFact,
      sortRank: q.sortRank,
    });
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(BLANK);
    setError(null);
  };

  const save = async () => {
    if (!form.question.trim()) { setError("Question is required."); return; }
    if (!form.optionA.trim() || !form.optionB.trim()) {
      setError("At least options A and B are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await api.put(`/quiz/${editingId}`, form);
        toast.success("Question updated!");
      } else {
        await api.post("/quiz", form);
        toast.success("Question added!");
      }
      cancelEdit();
      await load();
    } catch (e: any) {
      setError(e.message || "Failed to save.");
      toast.error(e.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/quiz/${id}`);
      toast.success("Question deleted.");
      setDeleteTarget(null);
      await load();
    } catch {
      toast.error("Failed to delete.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-card/50 border border-border/60 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="font-medium text-sm">
            {editingId ? "Edit Question" : "Add New Question"}
          </h3>
        </div>

        {error && (
          <p className="text-sm text-destructive mb-3 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}

        <div className="space-y-3">
          {/* Question */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Question *</label>
            <input
              value={form.question}
              onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
              placeholder="What was our first date?"
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Option A *</label>
              <input
                value={form.optionA}
                onChange={(e) => setForm((f) => ({ ...f, optionA: e.target.value }))}
                placeholder="Coffee shop"
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Option B *</label>
              <input
                value={form.optionB}
                onChange={(e) => setForm((f) => ({ ...f, optionB: e.target.value }))}
                placeholder="Restaurant"
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Option C</label>
              <input
                value={form.optionC}
                onChange={(e) => setForm((f) => ({ ...f, optionC: e.target.value }))}
                placeholder="Park"
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Option D</label>
              <input
                value={form.optionD}
                onChange={(e) => setForm((f) => ({ ...f, optionD: e.target.value }))}
                placeholder="Movie theater"
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Correct answer */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Correct Answer *</label>
            <div className="flex gap-2">
              {(["a", "b", "c", "d"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setForm((f) => ({ ...f, correctOption: opt }))}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    form.correctOption === opt
                      ? "bg-primary text-primary-foreground"
                      : "border border-border hover:bg-card"
                  }`}
                >
                  {opt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Fun fact */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Fun Fact (optional)</label>
            <textarea
              value={form.funFact}
              onChange={(e) => setForm((f) => ({ ...f, funFact: e.target.value }))}
              placeholder="We actually went back to that same coffee shop for our anniversary!"
              rows={2}
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : editingId ? <><Check className="h-4 w-4" /> Save</> : <><Plus className="h-4 w-4" /> Add</>}
            </button>
            {editingId && (
              <button
                onClick={cancelEdit}
                className="inline-flex items-center gap-2 border border-border px-5 py-2.5 rounded-md text-sm hover:bg-card transition-colors"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-card/50 border border-border/60 rounded-xl p-5">
        <p className="text-sm text-muted-foreground mb-4">
          {questions.length} question{questions.length !== 1 ? "s" : ""} in the quiz
        </p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-input/40 animate-pulse" />
            ))}
          </div>
        ) : questions.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No questions yet. Add some above.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {questions.map((q) => (
              <div
                key={q.id}
                className="bg-input/40 border border-border/40 rounded-lg px-4 py-3"
              >
                <div className="flex items-start gap-3 mb-2">
                  <p className="flex-1 text-sm font-medium">{q.question}</p>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(q)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {deleteTarget === q.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => remove(q.id)} className="text-xs text-destructive font-medium">Yes</button>
                        <button onClick={() => setDeleteTarget(null)} className="text-xs text-muted-foreground">No</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteTarget(q.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>A: {q.optionA}</p>
                  <p>B: {q.optionB}</p>
                  {q.optionC && <p>C: {q.optionC}</p>}
                  {q.optionD && <p>D: {q.optionD}</p>}
                  <p className="text-green-600 dark:text-green-400 font-medium">
                    ✓ Correct: {q.correctOption.toUpperCase()}
                  </p>
                  {q.funFact && <p className="italic text-primary/80">💡 {q.funFact}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
