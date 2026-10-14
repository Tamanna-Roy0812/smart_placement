# AI Algorithms Used + Viva Q&A (AIES)

Project: **Smart Placement Officer** – resume parsing, resume-to-job matching, job recommendation, eligibility checking.
All AI code is in `ai-service/app/` (Python, FastAPI) plus `backend/services/eligibilityService.js`.

> **Be honest in the viva:** this system uses *classical NLP / Information Retrieval and rule-based (knowledge-based) AI*.
> There is **no model training** and no neural network by default (an optional sentence-transformer embedding mode exists).
> That is a deliberate choice: no labelled placement data, explainable output, runs on a free 512 MB server.

---

## 1. Big picture (pipeline)

```
Resume PDF ──► Text extraction (PyMuPDF)
          ──► Section segmentation (rule-based)
          ──► Entity extraction (regex + dictionary): skills, degree, CGPA, years, projects
          ──► 5-component scoring ──► Match % + breakdown + missing/recommended skills
Job list  ──► Same scoring for every job ──► Sort descending ──► Top-N recommendations
Student + Job rules ──► Eligibility engine (hard rules) ──► eligible / not + reasons
```

| Step | File | AI technique |
|---|---|---|
| PDF → text | `parser.py: extract_text` | Text extraction (PyMuPDF) |
| Section split | `parser.py: split_sections` | Rule/heading-based segmentation |
| Skill extraction | `skills.py: extract_skills` | Dictionary + regex pattern matching (keyword NER) |
| Education / CGPA / years | `parser.py` | Regex information extraction |
| Text similarity | `matcher.py: text_similarity` | **TF-IDF + cosine similarity** (optional: sentence embeddings) |
| Match score | `matcher.py: analyze` | **Weighted multi-criteria scoring** (MCDM) with dynamic re-normalisation |
| Skill gap | `matcher.py` + `RELATED` map | Set difference + knowledge-graph style recommendation |
| Job recommendation | `matcher.py: recommend_jobs` | Content-based filtering / ranking |
| Eligibility | `eligibilityService.js` | Rule-based expert system (propositional logic) |

---

## 2. Algorithms in detail

### 2.1 Text extraction
PyMuPDF (`fitz`) reads each page's text layer. **Limitation:** scanned/image resumes have no text layer → rejected (needs OCR, e.g. Tesseract, not implemented).

### 2.2 Section segmentation (rule-based)
Each line is lower-cased, punctuation stripped; if it exactly matches a known heading alias (`"technical skills"`, `"work experience"`, `"projects"` …) and is ≤ 40 chars, a new section starts. Result: a dict `{skills, education, experience, projects, …}`.
*Why:* resumes have no fixed schema; headings are the strongest structural signal.

### 2.3 Skill extraction – dictionary + regex (keyword NER)
- A vocabulary `SKILLS` maps a **canonical name → aliases** (`React` ← `reactjs`, `react.js`).
- Each skill gets a compiled regex with **boundary guards**: `(?<![A-Za-z0-9+#.])alias(?![A-Za-z0-9+#]|\.[A-Za-z0-9])` so `Java` ≠ `JavaScript`, `C` ≠ `C++`.
- **Ambiguity handling:** `C`, `R`, `Go` are only accepted inside the *Skills section* (otherwise "go to market" would count as Go).
- `canonical()` normalises any alias to one name – this is **entity normalisation / canonicalisation**.
- Complexity: O(#skills × text length).

### 2.4 Education, CGPA, experience
- `DEGREE_RE`, `CGPA_RE`, `PERCENT_RE`, `YEAR_RE`: regexes over a 3-line window around the degree line.
- `degree_level`: ordinal encoding PhD=5, Master=4, Bachelor=3, Diploma=2, School=1, unknown=0.
- `estimate_years_of_experience`: finds ranges like `2022 – 2023` / `2023 – present`, sums `end − start` (capped 15 yrs/range); if a section exists but no dates → 0.5.

### 2.5 TF-IDF + Cosine similarity (core "ML" part)
Used for the 15 % "description similarity" component.

- **TF-IDF**: `tfidf(t,d) = tf(t,d) × idf(t)`, `idf(t) = ln((1+N)/(1+df(t))) + 1` (sklearn smooth). Words frequent in a document but rare across documents get high weight; common words are down-weighted.
- Config used: `stop_words="english"`, `ngram_range=(1,2)` (unigrams+bigrams, so "machine learning" is one feature), `sublinear_tf=True` (uses `1+log(tf)` to stop repeated words dominating).
- **Cosine similarity**: `cos(A,B) = (A·B)/(‖A‖‖B‖)` – angle between the two vectors, range 0–1 for non-negative TF-IDF; length-independent.
- **Calibration:** raw TF-IDF cosine between a resume and a job post rarely exceeds ~0.5, so `score = min(1, cos/0.5)`.
- **Optional upgrade:** `EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2` → 384-dim dense sentence embeddings, cosine on normalised vectors (dot product). Captures *meaning* ("ML engineer" ≈ "machine learning developer"); TF-IDF only matches *words*. Needs ~1 GB RAM; falls back to TF-IDF on failure.

### 2.6 Weighted multi-criteria scoring (the Match %)

`Match = Σ(wᵢ × sᵢ) / Σ(wᵢ)` over the components that could be evaluated.

| Component | Weight | How `s` (0–1) is computed |
|---|---|---|
| Skills | 40 | per required skill: on resume **and** assessment-proven = 1.0; proven only = 0.85; resume only = 0.7; missing = 0; then average |
| Experience | 20 | `0.6 × demonstrated + 0.4 × years_score` – demonstrated = fraction of job skills actually *used* in experience/projects (not just listed); years_score = `min(1, years/needed)` with years parsed from "3+ years" in the JD |
| Eligibility | 15 | average of `min(1, cgpa/min_cgpa)`, branch (0/1), `min(1, aptitude/min_apt)` |
| Education | 10 | Bachelor+ =1.0, Diploma 0.6, School 0.3, unknown 0.4 |
| Similarity | 15 | TF-IDF cosine (calibrated) |

**Dynamic re-normalisation:** if a component is unknown (e.g. no student profile → eligibility = `None`), its weight is dropped and the others are scaled so the total is still 100. Avoids unfairly punishing missing data.

**Why verified skills score higher than claimed ones:** a resume claim is unverified; an assessment score is evidence. Resume-only = 0.7 not 1.0.

**Worked example** – Job needs Python, SQL, Docker. Resume lists Python & SQL, assessment proves Python (≥60 %):
- Skills: Python 1.0, SQL 0.7, Docker 0 → 0.567 → ×40 = 22.7
- Suppose experience 0.5 (×20 = 10), eligibility 1.0 (×15 = 15), education 1.0 (×10 = 10), similarity 0.6 (×15 = 9)
- Match = (22.7+10+15+10+9)/100 = **66.7 %**

### 2.7 Skill-gap analysis & recommendation
- `missing = job_skills − (resume ∪ proven)` (set difference).
- `recommended` = missing skills + skills from the `RELATED` map (e.g. Docker → Kubernetes, CI/CD, Linux) not already known. A hand-built **knowledge graph / prerequisite map**, capped at 10.

### 2.8 Job recommendation (content-based filtering)
For each job → compute `analyze()` → sort by match % descending → return top-N. Uses only the **content** of the resume vs the job (no other users' behaviour), so there is **no cold-start problem**, but no collaborative signal either. Complexity O(J × (S + T)).

### 2.9 Eligibility engine (rule-based expert system)
`eligible = aptitudeMet ∧ skillMet ∧ cgpaMet ∧ branchMet` (propositional AND). Each failed rule appends a **human-readable reason** – an *explainable* decision. Empty branch list = open to all; missing data = fails (conservative).

**Key distinction to remember:** *Eligibility* = hard yes/no gate (rules). *Match %* = soft ranking (scoring). Both are used together.

### 2.10 Security / robustness around the AI service
API-key header compared with `hmac.compare_digest` (constant-time, prevents timing attacks); 5 MB upload limit; only PDF/TXT; backend calls with 60 s timeout and fails soft.

---

## 3. Viva questions & model answers

### A. General / conceptual
**Q1. Which AI techniques does your project use?**
NLP-based information extraction (regex + dictionary), TF-IDF vectorisation with cosine similarity, weighted multi-criteria scoring, content-based recommendation, knowledge-based skill-gap suggestion, and a rule-based eligibility expert system. Optional: sentence embeddings.

**Q2. Is it machine learning?**
Partly. TF-IDF is a statistical text-representation technique fitted on the two documents being compared, but we do **not train a supervised model**. Most of the logic is knowledge-based/rule-based AI. Reason: no labelled hired/not-hired dataset, and we want explainability.

**Q3. Why not use deep learning / an LLM?**
No training data, higher cost and RAM (free tier = 512 MB), harder to explain to a placement officer, possible hallucination, and a privacy concern sending resumes to third parties. We kept an embeddings upgrade path.

**Q4. Supervised vs unsupervised vs rule-based – where does yours fit?**
Rule-based + unsupervised statistics (TF-IDF needs no labels). Not supervised.

**Q5. Is this an expert system?**
The eligibility module is: knowledge (rules) + inference (AND of conditions) + explanation (reasons list).

**Q6. What type of agent / which AI category?**
A goal-based, utility-based decision aid: the weighted score is a utility function and jobs are ranked by expected utility.

**Q7. What is NLP and where do you use it?**
Processing human language by computer. Used for tokenisation, stop-word removal, n-grams, TF-IDF, entity extraction from resumes.

### B. TF-IDF / cosine
**Q8. Explain TF-IDF.** (formula in 2.5) Term frequency × inverse document frequency; highlights distinctive words.
**Q9. Why cosine and not Euclidean distance?** Cosine ignores vector length, so a long resume and a short JD are comparable; Euclidean would penalise length difference.
**Q10. What is `ngram_range=(1,2)`?** Uses single words and word pairs so phrases like "machine learning" keep meaning.
**Q11. What is `sublinear_tf`?** Replaces tf with 1+log(tf) so a word repeated 20 times does not dominate (keyword stuffing resistance).
**Q12. What are stop words, why remove?** Very common words (the, is, and) that carry no discriminative value.
**Q13. Why divide by 0.5?** Empirical calibration: real resume–JD cosine seldom exceeds 0.5, so raw values would always look low.
**Q14. With only two documents, IDF is weak – isn't that a problem?** Yes, a known limitation; with 2 docs IDF mostly separates shared vs unique terms. Improvement: fit the vectoriser on all jobs/resumes (corpus-level IDF) or use embeddings. Skill coverage (40 %) carries most signal so the overall score stays stable.
**Q15. Limitation of TF-IDF vs embeddings?** No semantics/synonyms ("developer" vs "engineer"), bag-of-words ignores order. Embeddings (MiniLM) handle both.
**Q16. What is an embedding / how does MiniLM work?** Transformer encoder mapping text to a 384-dim vector so similar meanings are close; we L2-normalise so dot product = cosine.
**Q17. Time complexity of TF-IDF + cosine?** Vectorising O(n) in text length; cosine O(V) over vocabulary.

### C. Scoring design
**Q18. Why those weights (40/20/15/10/15)?** Skills are the primary hiring criterion; experience next; eligibility and similarity are supporting; education least (most candidates are all students). They are tunable constants in `WEIGHTS` – a design choice, not learned. To justify: could tune with feedback data or AHP.
**Q19. What if a weight is missing?** Re-normalised so the total is 100 (Section 2.6).
**Q20. Why 1.0 / 0.85 / 0.7 / 0 for skills?** Evidence hierarchy: proven + claimed > proven > claimed > absent. Assessment evidence outranks a self-claim, but a claim with no proof still earns partial credit.
**Q21. How do you stop keyword stuffing?** Experience component counts only skills *used in experience/projects text*, not the skills list; sublinear TF; skills verified by assessments.
**Q22. How is bias handled / is it fair?** Scoring uses no name, gender, or photo. Branch/CGPA rules are placement-policy criteria. Still, parsing quality varies by resume format – a limitation; the officer makes the final decision.
**Q23. Why is the result explainable?** The response contains a `breakdown.components` array with score, weight and a note per component, plus matched/missing/verified skills.
**Q24. Normalisation – what is it and where used?** Scaling to a common range (all components to 0–1, then ×weight; weights to sum 100; cosine calibration).

### D. Extraction
**Q25. How do you extract skills? Why not an ML NER model?** Dictionary + regex; deterministic, fast, no training data, easy to extend by adding aliases. Downside: only finds skills in the vocabulary (misses new tech).
**Q26. How do you distinguish "Java" from "JavaScript"?** Regex look-around boundaries (Section 2.3).
**Q27. What is a regex look-behind/look-ahead?** Zero-width assertions that check surrounding characters without consuming them.
**Q28. How do you handle the skill "C" or "R"?** Marked ambiguous – only counted inside the skills section.
**Q29. What if the resume headings are unusual?** Section falls to "header"/unknown; skills are still extracted from the whole text, only experience/projects scoring degrades. Improvement: fuzzy heading matching or a classifier.
**Q30. How is experience computed?** Year-range regex, sum, cap, 0.5 fallback (Section 2.4). Limitation: no month precision, overlapping ranges double-count.
**Q31. Scanned resumes?** Rejected with a message; fix = OCR.

### E. Recommendation
**Q32. Type of recommender?** Content-based filtering. Collaborative filtering needs interaction history of many users – not available (cold start).
**Q33. How is the recommended-skills list produced?** Missing skills first, then related skills from the `RELATED` knowledge map.
**Q34. How to evaluate it?** Precision@K / recall / NDCG against officer shortlists; correlation between match % and actual selection; A/B testing. (Not yet done – future work.)

### F. Eligibility
**Q35. Difference between eligibility and match %?** Hard gate vs soft ranking (Section 2.9).
**Q36. Why return reasons?** Explainable AI – student knows what to fix; officer can audit.
**Q37. What logic is used?** Propositional logic, conjunction of four predicates; empty-branch-list = universal quantifier "all branches".

### G. Architecture / engineering
**Q38. Why a separate Python microservice?** Python has the NLP/ML ecosystem (scikit-learn, PyMuPDF); Express backend stays lightweight; independently deployable (Render).
**Q39. How do services talk?** Express → HTTP multipart POST `/recommend` or `/analyze` with `X-API-Key` → JSON response.
**Q40. What if the AI service is down?** Backend returns a friendly 502/503; the rest of the app keeps working (fail-soft).
**Q41. Why FastAPI?** Async, automatic validation (Pydantic), auto docs at `/docs`.
**Q42. How is it tested?** `pytest` + `httpx` in `ai-service/tests`, and `backend/test/eligibility.test.js` for the rules.

### H. Limitations & future work (examiners love this)
- Fixed hand-tuned weights → learn them from historical placements (logistic regression / learning-to-rank).
- Vocabulary-based skills → spaCy NER or a transformer NER.
- No OCR for scanned PDFs → Tesseract.
- TF-IDF fit on two documents → corpus-level IDF or embeddings by default.
- No fairness audit / bias testing.
- Add feedback loop (officer accepts/rejects → retrain).
- Add LLM-based explanation or resume improvement tips.

### I. Quick-fire definitions
| Term | One-liner |
|---|---|
| Tokenisation | Splitting text into words/units |
| Stemming/Lemmatisation | Reducing words to root (not used here; could be added) |
| Bag of Words | Text as unordered word counts |
| Vector space model | Documents as vectors in term space |
| Cosine similarity | cos of angle between vectors |
| Precision / Recall | Correct among returned / correct found among all relevant |
| Cold start | No data for a new user/item |
| Heuristic | Rule of thumb that gives a good-enough answer |
| MCDM | Multi-Criteria Decision Making – combine several criteria into one score |
| Explainable AI | Output comes with human-understandable reasons |
| Knowledge-based system | Decisions from encoded domain knowledge (rules, maps) |
