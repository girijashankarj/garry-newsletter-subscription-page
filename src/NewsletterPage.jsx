/*
 NEWSLETTER SUBSCRIPTION PAGE
 ==============================
 Google Sheet Column Order (13 columns):
   A: Subscriber ID  B: First Name   C: Last Name      D: Email
   E: Country Code   F: Mobile       G: Tags (JSON arr) H: Article Mode
   I: Total Count    J: Topic Dist.  K: Status          L: Subscribed At
   M: Unsubscribed At

 Apps Script Setup:
   1. Create Apps Script project linked to your Google Sheet
   2. Deploy as Web App (Execute as: Me, Who can access: Anyone)
   3. Copy deployment URL and replace APPS_SCRIPT_URL constant below
   4. doPost() handles two actions:
      - "subscribe"   → appendRow with all 13 columns
      - "unsubscribe" → find row by email, update col K and M
   5. Return: ContentService.createTextOutput(JSON.stringify(res))
                             .setMimeType(ContentService.MimeType.JSON)

 CORS Note:
   Apps Script needs proper response headers for fetch() to read the body.
   If you see CORS errors, add these headers in your doPost():
   var output = ContentService.createTextOutput(JSON.stringify(res));
   output.setMimeType(ContentService.MimeType.JSON);
   return output;
*/

import React from "react";

const APPS_SCRIPT_URL = import.meta.env.VITE_NEWSLETTER_SCRIPT_URL || "";

const COUNTRY_CODES = [
  { code: "+91", country: "India" },
  { code: "+1", country: "US" },
  { code: "+44", country: "UK" },
  { code: "+971", country: "UAE" },
  { code: "+1", country: "Canada" },
  { code: "+61", country: "Australia" },
];

const PREDEFINED_TAGS = [
  "AI", "Machine Learning", "JavaScript", "TypeScript", "React", "Node.js",
  "Cloud & AWS", "DevOps", "MLOps", "Generative AI", "Data Engineering",
  "System Design", "Open Source", "Tech Career", "Finance & Markets", "History & Culture",
];

const SIMPLE_COUNTS = [5, 10, 15, 20, 25];
const PER_TOPIC_OPTIONS = [0, 1, 2, 3, 4, 5];
const MAX_TAGS = 10;
const CUSTOM_TAG_MAX_LEN = 30;

function NewsletterPage() {
  const [activeTab, setActiveTab] = React.useState("subscribe");

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100 font-body">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');
        .font-heading { font-family: 'DM Serif Display', serif; }
        .font-body { font-family: 'DM Sans', sans-serif; }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-slide { animation: fadeSlideIn 0.3s ease-out forwards; }
        @keyframes successPop {
          0% { opacity: 0; transform: scale(0.9); }
          50% { transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-success { animation: successPop 0.4s ease-out forwards; }
      `}</style>

      <header className="pt-10 pb-6 text-center">
        <h1 className="font-heading text-3xl md:text-4xl text-amber-400 tracking-tight">Garry&apos;s Daily Digest</h1>
        <p className="mt-2 text-gray-400 text-sm md:text-base">Curated tech, AI &amp; ML — delivered at 9 AM</p>
      </header>

      <div className="max-w-lg mx-auto px-4">
        <TabSwitcher activeTab={activeTab} setActiveTab={setActiveTab} />
        {activeTab === "subscribe" && <SubscribeSection />}
        {activeTab === "unsubscribe" && <UnsubscribeSection />}
      </div>

      <footer className="py-12 text-center text-gray-500 text-sm">
        Garry&apos;s Daily Digest · One sheet, one list
      </footer>
    </div>
  );
}

function TabSwitcher({ activeTab, setActiveTab }) {
  return (
    <div className="flex rounded-lg bg-gray-900/80 p-1 mb-8 border border-gray-800">
      <button
        type="button"
        onClick={() => setActiveTab("subscribe")}
        className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all ${
          activeTab === "subscribe"
            ? "bg-amber-500/20 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
            : "text-gray-400 hover:text-gray-200"
        }`}
      >
        Subscribe
      </button>
      <button
        type="button"
        onClick={() => setActiveTab("unsubscribe")}
        className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all ${
          activeTab === "unsubscribe"
            ? "bg-amber-500/20 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
            : "text-gray-400 hover:text-gray-200"
        }`}
      >
        Unsubscribe
      </button>
    </div>
  );
}

function SubscribeSection() {
  const [step, setStep] = React.useState(1);
  const [submitted, setSubmitted] = React.useState(false);
  const [form, setForm] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    countryCode: "+91",
    mobile: "",
    tags: [],
    customTagInput: "",
    articleMode: "simple",
    simpleCount: 10,
    topicDistribution: {},
    step1Error: "",
    step2Error: "",
    step3Error: "",
  });
  const [loading, setLoading] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const selectedTags = form.tags;
  const tagCount = selectedTags.length;
  const canAddMoreTags = tagCount < MAX_TAGS;

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      update("tags", selectedTags.filter((t) => t !== tag));
      setForm((f) => {
        const next = { ...f.topicDistribution };
        delete next[tag];
        return { ...f, topicDistribution: next };
      });
    } else if (canAddMoreTags) {
      update("tags", [...selectedTags, tag]);
      if (form.articleMode === "perTopic" && !(tag in form.topicDistribution)) {
        setForm((f) => ({ ...f, topicDistribution: { ...f.topicDistribution, [tag]: 0 } }));
      }
    }
  };

  const addCustomTag = () => {
    const raw = form.customTagInput.trim().slice(0, CUSTOM_TAG_MAX_LEN);
    if (!raw || !canAddMoreTags) return;
    const tag = raw;
    const exists = [...PREDEFINED_TAGS, ...selectedTags].some((t) => t.toLowerCase() === tag.toLowerCase());
    if (exists) return;
    update("tags", [...selectedTags, tag]);
    update("customTagInput", "");
    if (form.articleMode === "perTopic") {
      setForm((f) => ({ ...f, topicDistribution: { ...f.topicDistribution, [tag]: 0 } }));
    }
  };

  const setTopicCount = (tag, count) => {
    setForm((f) => ({
      ...f,
      topicDistribution: { ...f.topicDistribution, [tag]: count },
    }));
  };

  const topicTotal = Object.values(form.topicDistribution).reduce((a, b) => a + b, 0);
  const topicValid = topicTotal > 0 && topicTotal % 5 === 0;
  const simpleValid = form.articleMode === "simple" && [5, 10, 15, 20, 25].includes(form.simpleCount);
  const step3Valid = form.articleMode === "simple" ? simpleValid : topicValid;

  const validateStep1 = () => {
    let err = "";
    if (!form.firstName.trim()) err = "First name is required.";
    else if (!form.lastName.trim()) err = "Last name is required.";
    else if (!form.email.trim()) err = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) err = "Please enter a valid email.";
    update("step1Error", err);
    return !err;
  };

  const validateStep2 = () => {
    const err = selectedTags.length === 0 ? "Select at least one topic tag." : "";
    update("step2Error", err);
    return !err;
  };

  const validateStep3 = () => {
    let err = "";
    if (form.articleMode === "simple") {
      if (![5, 10, 15, 20, 25].includes(form.simpleCount)) err = "Select articles per newsletter.";
    } else {
      if (topicTotal === 0) err = "Total must be greater than 0.";
      else if (topicTotal % 5 !== 0) err = "Total must be a multiple of 5.";
    }
    update("step3Error", err);
    return !err;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    setStep((s) => Math.min(s + 1, 3));
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 1));
    setSubmitError("");
  };

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2() || !validateStep3()) return;
    setSubmitError("");
    setLoading(true);
    const subscriberId = `SUB_${Date.now()}`;
    const now = new Date().toISOString();
    const payload = {
      action: "subscribe",
      subscriberId,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      countryCode: form.mobile ? form.countryCode : null,
      mobile: form.mobile ? form.mobile.trim() : null,
      tags: selectedTags,
      articleMode: form.articleMode,
      totalCount: form.articleMode === "simple" ? form.simpleCount : topicTotal,
      topicDistribution: form.articleMode === "perTopic" ? form.topicDistribution : null,
      status: "active",
      subscribedAt: now,
      unsubscribedAt: null,
    };
    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (data.status === "success") {
        setSubmitted(true);
      } else {
        setSubmitError(data.message || "Something went wrong. Please try again.");
      }
    } catch (e) {
      setSubmitError("Network error. Please check the Apps Script URL and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="animate-success rounded-xl border border-amber-500/30 bg-gray-900/80 p-8 text-center">
        <div className="text-amber-400 text-5xl mb-4">✓</div>
        <h2 className="font-heading text-xl text-white">You&apos;re subscribed</h2>
        <p className="mt-2 text-gray-400 text-sm">Check your inbox at 9 AM for your first digest.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-slide">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <span>Step {step} of 3</span>
        <div className="flex-1 h-1.5 rounded-full bg-gray-800 overflow-hidden">
          <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
        </div>
      </div>

      {step === 1 && (
        <Step1PersonalInfo form={form} update={update} countryCodes={COUNTRY_CODES} error={form.step1Error} />
      )}
      {step === 2 && (
        <Step2TagSelection
          form={form}
          update={update}
          predefinedTags={PREDEFINED_TAGS}
          selectedTags={selectedTags}
          toggleTag={toggleTag}
          addCustomTag={addCustomTag}
          canAddMoreTags={canAddMoreTags}
          tagCount={tagCount}
          maxTags={MAX_TAGS}
          error={form.step2Error}
        />
      )}
      {step === 3 && (
        <Step3ArticleConfig
          form={form}
          update={update}
          selectedTags={selectedTags}
          setTopicCount={setTopicCount}
          topicTotal={topicTotal}
          topicValid={topicValid}
          step3Valid={step3Valid}
          error={form.step3Error}
        />
      )}

      <div className="mt-8 flex gap-3">
        {step > 1 ? (
          <button type="button" onClick={handleBack} className="px-5 py-2.5 rounded-lg border border-gray-600 text-gray-300 hover:border-gray-500 hover:text-white transition-colors">
            Back
          </button>
        ) : (
          <div />
        )}
        <div className="flex-1" />
        {step < 3 ? (
          <button type="button" onClick={handleNext} className="px-5 py-2.5 rounded-lg bg-amber-500 text-gray-900 font-medium hover:bg-amber-400 transition-colors">
            Next
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={loading} className="px-5 py-2.5 rounded-lg bg-amber-500 text-gray-900 font-medium hover:bg-amber-400 transition-colors disabled:opacity-60">
            {loading ? "Subscribing…" : "Subscribe Now"}
          </button>
        )}
      </div>

      {submitError && <p className="mt-4 text-sm text-red-400">{submitError}</p>}
    </div>
  );
}

function Step1PersonalInfo({ form, update, countryCodes, error }) {
  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="First Name *"
        value={form.firstName}
        onChange={(e) => update("firstName", e.target.value)}
        className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
      />
      <input
        type="text"
        placeholder="Last Name *"
        value={form.lastName}
        onChange={(e) => update("lastName", e.target.value)}
        className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
      />
      <input
        type="email"
        placeholder="Email ID *"
        value={form.email}
        onChange={(e) => update("email", e.target.value)}
        className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
      />
      <div className="flex gap-2">
        <select
          value={form.countryCode}
          onChange={(e) => update("countryCode", e.target.value)}
          className="w-28 px-3 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white focus:border-amber-500 outline-none transition"
        >
          {countryCodes.map(({ code, country }) => (
            <option key={`${code}-${country}`} value={code}>{code} {country}</option>
          ))}
        </select>
        <input
          type="tel"
          placeholder="Mobile (optional)"
          value={form.mobile}
          onChange={(e) => update("mobile", e.target.value)}
          className="flex-1 px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-gray-400 placeholder-gray-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

function Step2TagSelection({
  form,
  update,
  predefinedTags,
  selectedTags,
  toggleTag,
  addCustomTag,
  canAddMoreTags,
  tagCount,
  maxTags,
  error,
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        {tagCount} / {maxTags} tags selected
        {!canAddMoreTags && <span className="text-amber-400 ml-2">(max reached)</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        {predefinedTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            disabled={!selectedTags.includes(tag) && !canAddMoreTags}
            className={`px-3 py-1.5 rounded-full text-sm border transition ${
              selectedTags.includes(tag)
                ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                : "border-gray-600 text-gray-400 hover:border-gray-500 disabled:opacity-50"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
      <div className="flex gap-2 pt-2">
        <input
          type="text"
          placeholder="Custom tag (max 30 chars)"
          maxLength={CUSTOM_TAG_MAX_LEN}
          value={form.customTagInput}
          onChange={(e) => update("customTagInput", e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomTag())}
          disabled={!canAddMoreTags}
          className="flex-1 px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:border-amber-500 outline-none disabled:opacity-50 transition"
        />
        <button type="button" onClick={addCustomTag} disabled={!canAddMoreTags || !form.customTagInput.trim()} className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:border-amber-500/50 hover:text-amber-400 disabled:opacity-50 transition">
          Add
        </button>
      </div>
      {selectedTags.some((t) => !predefinedTags.includes(t)) && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.filter((t) => !predefinedTags.includes(t)).map((tag) => (
            <button key={tag} type="button" onClick={() => toggleTag(tag)} className="px-3 py-1.5 rounded-full text-sm bg-amber-500/20 border border-amber-500/50 text-amber-400 hover:opacity-80">
              {tag} ×
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

function Step3ArticleConfig({ form, update, selectedTags, setTopicCount, topicTotal, topicValid, step3Valid, error }) {
  const showPerTopic = selectedTags.length >= 2;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-400 mb-2">Article count</p>
        <div className="flex gap-1 p-1 rounded-lg bg-gray-900 border border-gray-800">
          <button
            type="button"
            onClick={() => update("articleMode", "simple")}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
              form.articleMode === "simple" ? "bg-amber-500/20 text-amber-400" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Simple
          </button>
          <button
            type="button"
            onClick={() => update("articleMode", "perTopic")}
            disabled={!showPerTopic}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition disabled:opacity-50 ${
              form.articleMode === "perTopic" ? "bg-amber-500/20 text-amber-400" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Per topic
          </button>
        </div>
      </div>

      {form.articleMode === "simple" && (
        <div className="flex flex-wrap gap-2">
          {SIMPLE_COUNTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => update("simpleCount", n)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                form.simpleCount === n ? "bg-amber-500/20 border-amber-500/50 text-amber-400" : "border-gray-600 text-gray-400 hover:border-gray-500"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {form.articleMode === "perTopic" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            Total: {topicTotal} articles {topicValid ? "(multiple of 5 ✓)" : "(must be multiple of 5)"}
          </p>
          {topicValid && <span className="text-green-400 text-sm">✓</span>}
          {selectedTags.map((tag) => (
            <div key={tag} className="flex items-center justify-between gap-4">
              <span className="text-sm text-gray-300 truncate">{tag}</span>
              <div className="flex gap-1 shrink-0">
                {PER_TOPIC_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setTopicCount(tag, n)}
                    className={`w-8 h-8 rounded text-sm font-medium border transition ${
                      (form.topicDistribution[tag] ?? 0) === n ? "bg-amber-500/20 border-amber-500/50 text-amber-400" : "border-gray-600 text-gray-400"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

function UnsubscribeSection() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unsubscribe",
          email: email.trim(),
          unsubscribedAt: new Date().toISOString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      setResult(data);
    } catch {
      setResult({ status: "error", message: "Network error." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-slide">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email ID"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
        />
        <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-amber-500 text-gray-900 font-medium hover:bg-amber-400 transition-colors disabled:opacity-60">
          {loading ? "Unsubscribing…" : "Unsubscribe Me"}
        </button>
      </form>
      <UnsubscribeResult result={result} />
    </div>
  );
}

function UnsubscribeResult({ result }) {
  if (!result) return null;
  if (result.status === "success") {
    return (
      <div className="mt-6 p-4 rounded-lg border border-green-500/30 bg-green-500/10 text-green-400 text-sm animate-fade-slide">
        You have been unsubscribed. Sorry to see you go.
      </div>
    );
  }
  if (result.status === "not_found") {
    return (
      <div className="mt-6 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm animate-fade-slide">
        This email is not in our subscriber list. Please check and try again.
      </div>
    );
  }
  return (
    <div className="mt-6 p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm animate-fade-slide">
      {result.message || "Something went wrong. Please try again."}
    </div>
  );
}

export default NewsletterPage;
