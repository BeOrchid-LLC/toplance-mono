# Toplance — Original Client Spec

The client's brief as received, verbatim. This is the source document behind
"Felix's Six-Phase PRD" referenced in
[`superpowers/specs/2026-08-26-toplance-prd-build-design.md`](superpowers/specs/2026-08-26-toplance-prd-build-design.md),
which records the gap analysis against this spec and the scope decisions taken
on 2026-08-26. Where the two disagree, the build-design doc is what is being
built; this file is what was asked for.

---

**OBJECTIVE:** Build and deploy the complete Toplance AI Travel Agent platform end-to-end

**COMPLETION STANDARD:** Every numbered phase below is 100% live and functioning. No phase is considered done until tested with real users.

## PHASE 1 — BUILD THE AI TRAVEL INTAKE AGENT

1. Build a conversational AI agent (voice + text) that asks users a sequence of simple, friendly questions covering: full name, nationality, current country, destination country, travel purpose (tourism, work, study, medical, relocation), estimated travel dates, budget range, accommodation preference, travel companions (solo, family, group), dietary or accessibility needs, and any prior visa history.

2. The agent must feel natural — like a knowledgeable travel friend, not a form. Questions must be asked one at a time, in plain conversational language.

3. All answers must be stored and auto-compiled into a structured User Travel Profile in the database.

## PHASE 2 — BUILD THE USER TRAVEL PROFILE

4. Every user gets a permanent, updatable profile containing: personal details, travel history, current application status, document upload status with completion score (0–100%), admin notes, and itinerary records.

5. The profile completion score must increase visibly as users upload each required document. Display this score prominently on the user's dashboard.

## PHASE 3 — VISA REQUIREMENTS ENGINE

6. Based on the user's nationality and destination country, the system must automatically retrieve and display the full current visa requirements (type of visa needed, fees, processing time, embassy contact, specific documents required).

7. Generate a personalized document checklist for each user based on their profile and visa type. Every item on the checklist must have an upload slot.

8. When a document is uploaded, the system must automatically verify it is the correct file type, is legible, and matches the expected document category. Mark each item verified or flag it for re-upload.

9. Every verified upload increases the completion score. When score reaches 100%, trigger an automatic admin notification.

## PHASE 4 — ADMIN DASHBOARD

10. Build a secure admin dashboard where the admin can: view all user profiles and their completion scores, review uploaded documents, manually update each user's application status (e.g., Submitted, Under Review, Approved, Rejected, Additional Documents Needed), and send status update messages to users.

11. Admin must be notified immediately (email + dashboard alert) when any user reaches 100% document completion.

## PHASE 5 — TRAVEL ITINERARY GENERATION

12. Upon visa approval (admin manually sets status to Approved), the system must automatically generate a comprehensive travel itinerary for the user covering: flight booking guidance, airport transfer options, accommodation recommendations, day-by-day activity plan for first 7 days, local transportation guide, emergency contacts and embassy location in destination country, healthcare and insurance requirements, currency and banking tips, cultural etiquette notes, and a full packing checklist.

13. The itinerary must be delivered to the user via email, in-app notification, and voice summary through the AI agent.

## PHASE 6 — ONGOING TRAVEL COMPANION

14. After arrival, the AI agent must continue to function as a permanent travel companion for each user. It must send regular updates via voice message, text, and email including: local opportunities (jobs, housing, events, networking), community and expat group suggestions, reminders for document renewals (visa expiry, permits), weather and safety alerts, and future travel plan suggestions based on their profile.

15. The agent must update the user profile automatically based on every new interaction and piece of information gathered.

16. Build a notification scheduler — each user can set their preferred frequency for receiving updates.

## TECHNICAL REQUIREMENTS

- Stack: Use any reliable stack. Recommended: Next.js front-end, Node.js or Python back-end, PostgreSQL database, OpenAI or Claude API for AI agent, Twilio for voice/SMS, SendGrid for email.
- The AI agent must be accessible via web browser and mobile browser (fully responsive).
- All user data must be encrypted at rest and in transit.
- Admin panel must be password-protected with 2FA.

## DELIVERABLES — NOTHING IS DONE UNTIL ALL OF THESE ARE LIVE

- Deployed AI intake agent (voice + text)
- User profile and document upload system with live completion score
- Visa requirements engine (covers minimum 50 destination countries at launch)
- Admin dashboard with status management
- Auto-generated travel itinerary triggered by approval
- Ongoing companion notification system (voice + text + email)
- Full end-to-end test with 3 real users before handoff
