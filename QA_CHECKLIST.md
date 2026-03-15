# ToggleTail Manual QA Checklist

**Version:** Post-ElevenLabs Integration  
**Last Updated:** March 2026

Use this checklist to manually validate core product flows after architecture changes.

---

## 1. First App Launch with Bundled Story Seeding

### Setup
- Fresh install (clear app data) OR first-time simulator launch
- No previous AsyncStorage data

### Steps
1. Launch app for the first time
2. Complete onboarding (select role → child name → age → interests → password)
3. Navigate to child home screen
4. Check story library

### Expected Result
- Onboarding completes without errors
- Child home shows pre-seeded stories from `assets/library/manifest.json`
- Stories display with correct titles, categories, and thumbnails
- At least 10+ stories visible immediately

### Likely Failure Signs
- Empty story library on first launch
- Console errors mentioning `manifest.json` or `preloadedSeeder`
- "No stories found" message
- Stories show but with missing metadata (blank titles, no categories)

---

## 2. Parent Approving Stories and Child Visibility

### Setup
- App with seeded stories
- At least one story in "pending" (unapproved) state
- Know the parent PIN/password

### Steps
1. Open child home → note which stories are visible
2. Navigate to parent area (tap parent icon or settings)
3. Complete parent gate (enter PIN)
4. Go to story management / approval screen
5. Find a pending story → approve it
6. Return to child home
7. Verify newly approved story appears

### Expected Result
- Parent gate blocks access until correct PIN entered
- Pending stories shown in parent area with "Approve" action
- After approval, story immediately visible in child home
- Unapproved stories remain hidden from child

### Likely Failure Signs
- Child can see unapproved stories
- Approved story doesn't appear until app restart
- Parent gate accepts any PIN
- "Approve" button has no effect
- Console errors about `storyApprovalService` or `storyStorage`

---

## 3. Story Creation → Approval → Child Access

### Setup
- Logged in as parent (past parent gate)
- Story creation feature accessible

### Steps
1. Navigate to "Create Story" from parent area
2. Enter story title and content (or generate via AI if available)
3. Save the new story
4. Check that story appears in parent's story list as "pending"
5. Approve the story
6. Switch to child view
7. Find and open the newly created story

### Expected Result
- Story saves without error
- New story defaults to unapproved/pending state
- After approval, story appears in child library
- Story opens and displays correctly with all pages

### Likely Failure Signs
- Story creation fails silently
- New story auto-approved (security issue)
- Story appears in child view before parent approval
- Story content corrupted or missing pages
- Console errors during save or approval

---

## 4. Parent Recording Narration Playback

### Setup
- At least one story with parent-recorded narration
- Narration mode set to "Human" in settings
- Audio files exist in app storage

### Steps
1. Open child home
2. Select a story with parent recording
3. Choose "Listen to Story" mode
4. Tap Play
5. Listen to page 1 narration
6. Navigate to next page
7. Listen to page 2 narration

### Expected Result
- Button shows "Loading..." briefly, then "Pause"
- Parent's recorded voice plays (recognizable audio quality)
- Audio stops when pausing or changing pages
- Each page plays its specific recording
- `isPlayingParentAudio` state updates correctly

### Likely Failure Signs
- AI voice plays instead of parent recording
- "Loading..." never transitions to "Pause"
- Wrong recording plays for page
- Audio continues after page change
- Console errors mentioning `narrationService` or `playPageRecording`
- Silence with "Pause" button shown

---

## 5. AI Narration with ElevenLabs Cache Miss

### Setup
- Story that has NOT been played before (no cached audio)
- Network connectivity enabled
- Backend TTS endpoint running
- Narration mode set to "AI"

### Steps
1. Open child home
2. Select an unplayed story
3. Choose "Listen to Story" mode
4. Tap Play
5. Observe loading state
6. Listen to narration

### Expected Result
- Button shows ⏳ "Loading..." for 2-5 seconds
- Network request visible in backend logs
- Transitions to ⏸️ "Pause" when audio starts
- High-quality AI voice plays (ElevenLabs quality)
- Audio file cached locally after playback

### Likely Failure Signs
- "Loading..." shown indefinitely (>10s)
- Button shows "Pause" but no audio plays
- Robotic TTS voice instead of natural ElevenLabs
- Console shows `fetchAndCacheAudio` errors
- Network request fails silently
- Multiple network requests for same page

---

## 6. AI Narration with Cached Replay

### Setup
- Story that has been played at least once (audio cached)
- Can verify cache by checking `elevenlabs_cache/` directory
- Network can be disabled for extra verification

### Steps
1. Open a previously-played story
2. Choose "Listen to Story" mode
3. Tap Play
4. Observe loading state duration
5. Listen to narration
6. (Optional) Disable network and replay

### Expected Result
- Button shows ⏳ "Loading..." very briefly (~100ms)
- Transitions to ⏸️ "Pause" almost instantly
- Same high-quality voice as original playback
- No network request made (check backend logs)
- Works even with network disabled

### Likely Failure Signs
- Long loading time despite cache
- Different voice quality than first play
- Network request made despite cache hit
- Cache lookup errors in console
- `getCachedAudio` returns null unexpectedly

---

## 7. ElevenLabs Failure → Local TTS Fallback

### Setup
- Backend TTS endpoint disabled OR network disconnected
- Story with uncached audio
- Narration mode set to "AI"

### Steps
1. Disable backend or disconnect network
2. Open an unplayed story
3. Choose "Listen to Story" mode
4. Tap Play
5. Observe loading state
6. Listen to narration

### Expected Result
- Button shows ⏳ "Loading..." briefly
- Console logs: "ElevenLabs unavailable, using local TTS fallback"
- Transitions to ⏸️ "Pause"
- Device TTS voice plays (lower quality but functional)
- App does not crash or freeze

### Likely Failure Signs
- App hangs on "Loading..." forever
- No audio plays and button stuck
- Error alert shown to child
- App crashes
- Console shows unhandled promise rejection
- `onElevenLabsFallback` callback not firing

---

## 8. Auto-Play with Next-Page Pre-Caching

### Setup
- Multi-page story (3+ pages)
- First page uncached, subsequent pages uncached
- Network enabled
- Backend logs visible

### Steps
1. Open an unplayed multi-page story
2. Choose "Listen to Story" mode
3. Tap Play (page 1 - expect loading delay)
4. Let page 1 complete → auto-advance to page 2
5. Observe loading time for page 2
6. Let page 2 complete → auto-advance to page 3
7. Observe loading time for page 3

### Expected Result
- Page 1: Shows ⏳ "Loading..." (2-5s), then plays
- During page 1 playback: backend receives request for page 2 (pre-cache)
- Page 2: Shows ⏳ "Loading..." very briefly (~100ms), plays from cache
- During page 2 playback: backend receives request for page 3
- Page 3: Near-instant playback

### Likely Failure Signs
- Every page has 2-5s loading delay
- No pre-cache network requests in backend logs
- Console shows `precacheAudio` errors
- Pre-cache blocks current playback
- Same page fetched multiple times

---

## 9. Parent Gate Authentication Flow

### Setup
- Know correct parent PIN/password
- Currently in child area

### Steps
1. From child home, tap parent/settings icon
2. Parent gate modal appears
3. Enter WRONG PIN → tap submit
4. Observe error handling
5. Enter CORRECT PIN → tap submit
6. Verify access to parent area
7. Navigate back to child area
8. Return to parent area again
9. Check if gate reappears or session persists

### Expected Result
- Wrong PIN: Error message, gate remains locked
- Correct PIN: Gate dismisses, parent area accessible
- Multiple failed attempts don't crash app
- Session persists for reasonable duration
- Gate reappears after timeout or app restart

### Likely Failure Signs
- Any PIN accepted (security vulnerability)
- Correct PIN rejected
- Gate never dismisses
- App crashes on wrong PIN
- Parent area accessible without PIN
- Console errors in `parentGateService` or `pinAuthService`

---

## 10. Sign-Out / Navigation Sanity

### Setup
- App in any authenticated state
- Some stories played (cache populated)

### Steps
1. Navigate through: child home → story → back → parent area → settings
2. Use back button/gesture at each step
3. Sign out (if feature exists) or clear session
4. Restart app
5. Verify state reset appropriately
6. Check that navigation stack doesn't accumulate
7. Verify no memory leaks (app remains responsive)

### Expected Result
- Back navigation returns to correct screens
- No duplicate screens in stack
- Sign-out clears session state
- App restart shows onboarding OR returns to correct state
- Audio stops when leaving story view
- No zombie audio playing after navigation

### Likely Failure Signs
- Back button goes to wrong screen
- Screens stack infinitely
- Audio continues playing after leaving story
- App becomes sluggish after navigation
- Sign-out doesn't clear parent gate session
- Console shows navigation warnings
- `stopAllPlayback` not called on unmount

---

## Quick Smoke Test (5 minutes)

For rapid validation, run this abbreviated flow:

1. **Fresh start**: Clear data, launch app, complete onboarding
2. **Seeding check**: Verify stories appear in child home
3. **Basic playback**: Open story → "Listen to Story" → Play → hear audio
4. **Parent gate**: Tap parent icon → enter PIN → access granted
5. **Navigation**: Back to child home → close app → reopen → state preserved

If all 5 pass, core functionality is intact.

---

## Environment Notes

| Component | Check |
|-----------|-------|
| Backend TTS | `curl http://localhost:3001/api/tts/generate -X POST` |
| Network | Device/simulator has internet |
| Storage | Sufficient space for audio cache |
| Permissions | Microphone (if testing "Help Me Read") |

---

## Reporting Issues

When reporting failures, include:
- [ ] Scenario number and step
- [ ] Device/simulator info
- [ ] Console logs (filter by "error", "warn")
- [ ] Network tab (for ElevenLabs issues)
- [ ] Screenshots of stuck UI states
