# Lugha — learn Kenyan languages

A phone-first web app for learning Gĩkũyũ, Dholuo, Luhya, Kĩkamba and Kalenjin in short daily lessons. People can install it on their home screen, and it works offline.

**What makes it Lugha (not a Duolingo copy)**
- **The journey (Safari):** each unit is a town on a winding road through the region where the language is spoken. Kikuyu goes Nyeri → Murang'a → Kirinyaga → Kiambu → Nyandarua.
- **Shanga (beads), not XP:** each finished lesson threads a bead in the unit's colour onto your necklace, and lesson progress fills a string of beads.
- **Hearth fire, not a streak flame:** keep the three-stone fire burning by learning every day.
- **A calabash of water, not hearts:** a wrong answer spills a sip. Refill it over time, or by practising at the **well (Kisima)**.
- **Your boma:** finishing units builds your homestead piece by piece — a hut, a granary, cattle, a second hut and acacia trees, then a fence and the family hearth.
- **Story scenes:** recurring characters (a grandmother, a friend, a market seller, a matatu conductor) speak to you, and you pick the right reply. Tap a speech bubble's blurred line to reveal its meaning.
- **English or Kiswahili:** learners choose which language they learn through, and the whole interface switches with it.

**Hearing and speaking**
- **Pronunciation:** tap 🔊 on any word, or 🐢 to hear it slowly. Story scenes are read aloud line by line. Each word plays the best audio available:
  1. a native-speaker recording that a reviewer uploaded in the Review panel;
  2. a generated voice file (see "Generate pronunciation audio" below);
  3. for the Bantu languages only (Gĩkũyũ, Kĩkamba, Luhya), the device's own Kiswahili voice as a rough approximation, labelled as such. You can switch this off in Boma settings.
- **Say it aloud:** each lesson has two speaking turns. Tap the mic and say the word. If the browser can't recognise speech, you record yourself, compare with the model audio, and mark it yourself. "Can't speak now" pauses speaking for an hour.
- **Speak your answers:** on any question where you produce a word (how do you say, type it, build the sentence, story reply), tap **🎤 Speak your answer** to answer out loud instead of tapping or typing.
- **Town gate tests:** at the end of every stop on the journey there's a 10-question test. Score 80% to open the gate, which also marks the whole stop as done, so you can test out of units you already know. Tests don't use water.

How speech checking works: no speech recogniser exists yet for these languages, so the app listens with the Kiswahili (Kenya) recogniser in Chrome, Edge and Android, and compares what it heard with the expected word. Matching is forgiving (it ignores accent marks and long vowels), and learners can always tap "I said it right". Speaking works best in Chrome on Android.

**Courses:** Gĩkũyũ, Dholuo, Kĩkamba, Luhya (General, Bukusu, Maragoli, Nyore) and Kalenjin (General, Kipsigis, Nandi).

**What's in it**
- **Hearing and speaking**
- **Pronunciation:** tap 🔊 on any word, or 🐢 to hear it slowly. Story scenes are read aloud line by line. Each word plays the best audio available:
  1. a native-speaker recording that a reviewer uploaded in the Review panel;
  2. a generated voice file (see "Generate pronunciation audio" below);
  3. for the Bantu languages only (Gĩkũyũ, Kĩkamba, Luhya), the device's own Kiswahili voice as a rough approximation, labelled as such. You can switch this off in Boma settings.
- **Say it aloud:** each lesson has two speaking turns. Tap the mic and say the word. If the browser can't recognise speech, you record yourself, compare with the model audio, and mark it yourself. "Can't speak now" pauses speaking for an hour.
- **Speak your answers:** on any question where you produce a word (how do you say, type it, build the sentence, story reply), tap **🎤 Speak your answer** to answer out loud instead of tapping or typing.
- **Town gate tests:** at the end of every stop on the journey there's a 10-question test. Score 80% to open the gate, which also marks the whole stop as done, so you can test out of units you already know. Tests don't use water.

How speech checking works: no speech recogniser exists yet for these languages, so the app listens with the Kiswahili (Kenya) recogniser in Chrome, Edge and Android, and compares what it heard with the expected word. Matching is forgiving (it ignores accent marks and long vowels), and learners can always tap "I said it right". Speaking works best in Chrome on Android.

**Courses:** 5 languages, each with Greetings, Numbers and Home & family units laid out on a lesson path that unlocks in order.
- **Exercise types:** meaning check, "how do you say", tap-the-pairs, sentence building, typing and listening. Listening exercises turn on automatically once an item has audio.
- **Motivation:** XP, a daily goal, a day streak, a weekly XP chart, and hearts. A wrong answer costs one heart. Hearts come back one every 30 minutes, or you can earn one by finishing a Practice session.
- **Practice mode:** drills the words each learner gets wrong most.
- **Accounts and sync:** optional email accounts. Progress merges across devices, and guest mode works with no account.
- **Review panel:** native speakers correct words, add notes, mark confidence, record or upload audio, and mark items reviewed. Learners see the changes straight away.

## ⚠️ About the content
Every word and phrase is a **draft** and needs a native speaker to check it. Learners see a "Draft" badge until an item is marked reviewed. Each item also has a confidence level:
- **Luhya:** all low confidence. Luhya has around 18 dialects, so you need to pick one (Bukusu, Maragoli, Idakho, …) and find a reviewer for it.
- **Kalenjin:** leans Kipsigis/Nandi. Confirm which variety to launch with.
- **Dholuo:** tone isn't written, so native audio matters most here.

The bundled content is in `src/content.ts`. To keep reviewer edits attached to the right word, only **add** rows to the end of a lesson. Don't reorder or delete rows.

## Run it locally
```powershell
cd lugha
tsc
python -m http.server 8080   # then open http://localhost:8080
```
`tsc` compiles `src/*.ts` into `js/`. Commit the `js/` folder too, because the site is served as plain static files.

## Deploy (GitHub Pages)
1. Create an empty GitHub repo, for example `lugha`.
2. Push this folder to it (see the commands at the bottom).
3. On GitHub, go to Settings → Pages → Source: *Deploy from a branch* → `main` / root.

## Switch on accounts, sync and the review panel (Supabase, free tier)
1. Create a project at supabase.com.
2. Open **SQL Editor**, paste in all of `supabase/schema.sql`, and click **Run**. This creates the tables, security rules and the `audio` storage bucket.
3. Go to **Project Settings → API**, then copy the *Project URL* and *anon public* key into `config.js`.
4. Go to **Authentication → URL Configuration** and set the Site URL to your GitHub Pages address.
5. Push the change.

### Make someone a reviewer
After they've signed up in the app, run this in the SQL Editor:
```sql
update public.profiles set role = 'reviewer'
  where id = (select id from auth.users where email = 'their@email.com');
```
A **Review** tab appears for them the next time they open the app. Use `'admin'` instead of `'reviewer'` for yourself.

### Baking reviewed content into the app
In the Review panel, **Export JSON** downloads a course with all corrections applied. You can paste those corrections back into `src/content.ts` from time to time, so a fresh install already has them.

## Generate pronunciation audio (optional, recommended)
`tools/generate_audio.py` voices every word with Meta's open MMS text-to-speech models and writes `audio/<course>/<id>.wav` plus `audio/manifest.json`. You need Python 3.10+ and about 3 GB of disk space for PyTorch; each language model downloads about 150 MB the first time.

```powershell
cd "$HOME\Projects\lugha"
python -m pip install -r tools/requirements.txt
tsc
node tools/export-content.mjs
python tools/generate_audio.py
```
The summary at the end shows which courses got a voice. Not every Kenyan language has an MMS model; any course without one falls back to recordings or the approximate voice. To try a different Kikuyu voice (fine-tuned on real Kikuyu speech): `python tools/generate_audio.py --course kik --force --model kik=gateremark/kikuyu-tts-v1`.

⚠️ **Licence:** the facebook/mms-tts models are CC BY-NC 4.0, which means **non-commercial use only**. They're fine for testing. Before you charge for Lugha, replace them with native-speaker recordings (the Review panel's 🎙️ button) or a voice you're licensed to use commercially.

## Project layout
```
index.html, styles.css, config.js, manifest.webmanifest, sw.js, icon.svg
src/          TypeScript source
  content.ts    course data (drafts)
  store.ts      progress, hearts, streaks, XP, content overrides
  exercises.ts  builds the exercise list for each lesson and checks answers
  lesson.ts     lesson player
  review.ts     reviewer panel
  cloud.ts      Supabase: auth, sync, overrides, audio upload
  audio.ts      pronunciation: recordings → generated audio → approximate voice
  speech.ts     speech recognition, recording, answer matching
  main.ts       screens and navigation
js/           compiled output (generated by tsc)
supabase/schema.sql
tools/        audio generator (generate_audio.py) and content exporter
audio/        generated pronunciation files + manifest.json
```

## Ideas for later
Leaderboards, M-Pesa subscriptions (Daraja API), speaking practice, Swahili as a base language for learners, more units (food, market, directions, proverbs), and an app-store wrapper (Capacitor).
