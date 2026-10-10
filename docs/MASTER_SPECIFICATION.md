# Queens Scholars Tutorial Website Master Prompt

Build a complete, polished **SHSAT tutoring website and learning portal** for a paid tutoring business named **Queens Scholars Tutorial**. Use this exact name consistently in the logo/header, navigation, page titles, footer, signup/login pages, and administrator, teacher, and student dashboards. Deliver working software, public enrollment pages, real administrator/teacher/student accounts, class and assignment management, a substantial verified question system, and clear setup instructions. Do not stop at a design, an implementation plan, a small demo bank, or mock screens.

The learning portal must prepare enrolled students for the current digital SHSAT, teach every relevant skill, provide extensive explanations, and turn diagnostic mistakes into focused practice. Include a required **SHSAT score-estimate feature** after eligible diagnostics, with the accuracy and calibration rules in section 14. Teachers must be able to create and revoke their assigned students' accounts, assign homework and classwork with custom titles, review submissions, and monitor progress. Administrators must control teacher accounts, student accounts, enrollment, and the center's settings, including revoking teacher and student access. Active teachers and administrators must also have their own learning workspace with the same SHSAT practice, diagnostic, explanation, results, and mistake-review tools available to students, without needing a second login or changing their staff role.

Tutoring is a paid service, but this website must contain **no payment processing**: no checkout, card collection, Stripe/PayPal integration, subscription billing, invoices, payment webhooks, or payment-gated activation. Enrollment arrangements happen outside the website; access is activated manually by authorized staff. Do not describe paid classes as free. Keep development dependencies and services free or open-source where practical, and do not provision paid infrastructure without explicit authorization.

No AI API key or running language model may be required by the finished website. A coding assistant may help develop the project; the finished app must generate and select practice through ordinary software and stored content.

The public class-inquiry contact is **718-913-7706**, available for **calls and texts**. Display this number prominently and use it consistently throughout the public website.

Treat this specification as an implementation contract. Correctness, authentic practice, and useful teaching take priority over decorative features. Do not claim perfection or official equivalence without evidence.

**1. Research and freeze the correct exam version**

Use current NYC Public Schools materials as the authority. This prompt was researched on October 9, 2026 and targets the fall 2026 SHSAT for fall 2027 admission. Recheck the official resources before implementation because policies can change.

The current default is a computer-adaptive exam with **100 questions: 50 ELA and 50 Math, with 180 minutes total standard testing time**. Do not implement the older 114-question exam as the current diagnostic. Students choose their starting subject. They must complete that subject before entering the other and cannot reopen a submitted subject.

Separate these concepts: test administration year, admission year, grade at testing, content standards, and simulator version. Make them explicit configuration fields rather than scattered assumptions. Any optional historical exam mode must carry its own year and format label.

Maintain a source register recording the URL, document title, access date, relevant page or section, and the requirement it supports. Distinguish published rules, observations from official practice forms, and choices made for this app. Prefer the current exam webpage when older materials conflict with it. Do not silently reconcile contradictions by guessing.

Review the official practice forms, explanations, SHSAT guide, technology-enhanced item examples, and Student Readiness Tool. The readiness tutorial and the item-type demonstration contain examples of interface mechanics; their simple content is not a standard for SHSAT question difficulty.

**2. Scope, cost, and architecture**

Create a responsive public website plus a protected learning portal that works especially well on a laptop or desktop, with usable mobile enrollment and study layouts. Use a practical, maintainable **full-stack architecture with a real backend, persistent shared database, authenticated sessions, and server-enforced permissions**. A frontend-only localStorage role switcher is not an account system. Verify current dependency documentation and licenses when choosing packages.

Requirements:

- No runtime AI, hosted LLM calls, browser language models, AI chat assistant, or AI story generator.
- No AI-key entry, paid question-generation service, credit-card collection, or payment processor. Ordinary server configuration secrets are allowed when needed for real authentication and database access; keep them outside the frontend and repository.
- No dependency on an unofficial AI proxy, shared key, or an expiring free AI quota.
- Question production remains deterministic/rule-based or draws from reviewed content. For graded assignments and diagnostics, the server controls answer keys, validation, deadlines, and recorded results. Do not send unreleased answer keys or teacher-only solutions to students.
- Public visitors can read marketing/class information, request enrollment, and call/text the center. Student learning access requires an active authorized account and enrollment. Active staff accounts include personal learning access without a student enrollment or second account; management access still follows their staff permissions. Remove the previous guest-first access model.
- Persist accounts, class memberships, assignments, submissions, diagnostic sessions, and progress in the shared database so authorized users can work across devices.
- Treat browser storage only as a scoped cache or temporary draft store. Separate data by user, clear private caches on logout, and do not let an offline cache bypass revoked/suspended accounts or inactive student enrollment.
- Optional offline practice packs may contain explicitly approved non-sensitive study content. Graded assignments and timed diagnostics require the server; label offline practice separately.
- Handle brief connectivity loss with clear saved/unsaved indicators and recovery from server-confirmed state. Never accept a backdated client timestamp as proof an answer met a server deadline.
- Provide appropriate backups and role-scoped exports. Do not let a student's import fabricate an official submission or overwrite the server's grade records.
- Store minimal personal information. No advertising, public student leaderboards, or unnecessary collection of children's data.
- Explain free local setup and any compatible free development hosting/database options and their limits. Do not deploy a writable database on ephemeral storage or pretend a static-only host can supply shared accounts.

Use modular code for authentication, permissions, enrollment, classes, assignments, curriculum, content, math generators, answer validators, explanations, adaptive selection, test state, score reporting, and progress. Avoid mixing correctness logic with display components.

**2A. Public pages, enrollment, and contact information**

Build Home, Classes/Programs, About, Contact/Join a Class, Sign Up, and Log In pages. Explain the tutoring service, SHSAT preparation, teacher support, assignments, diagnostics, and detailed mistake review. Keep public class names/descriptions editable by an administrator. Do not invent a physical address, teacher biography, price, class schedule, testimonial, or admission guarantee.

Use this contact copy prominently:

**Want to join a class? Call or text 718-913-7706 for enrollment information and availability.**

Provide **Call Now**, **Text Us**, and **Copy Number** actions. Call Now uses `tel:+17189137706`; Text Us uses `sms:+17189137706`. Show the readable number as well so desktop visitors can contact the center even if their device has no calling/texting handler. Put the contact on the home page, class pages, enrollment confirmation, contact page, footer, and account-help page. Buttons open the user's calling or messaging application; the website must not automatically place calls or send messages. No paid SMS API is needed.

The public **Sign Up / Request Enrollment** page submits an enrollment request, not an automatically activated learning account. Collect only necessary information such as student name, current grade/SHSAT track, parent/guardian or appropriate contact name and number, class interest, and an optional message. Do not require a child's email, full birth date, or home address to access ordinary tutoring features. Explain that staff will arrange enrollment and provide the login credentials.

Save requests to a protected administrator inbox with new, contacted, approved, and declined states. Validate and rate-limit submissions and handle likely duplicates without exposing private existing accounts. A successful submission must confirm that the request was saved and show the call/text number. Do not pretend an email or SMS was sent.

An administrator can turn an approved request into a student account and enrollment in one operation, setting its final custom username and initial password. Public signup cannot create teacher/administrator roles, activate itself, or grant classroom access. Account creation by authorized teachers is a separate flow described below.

**2B. Login, custom credentials, and access lifecycle**

Create one genuine **username + password** login page for administrators, teachers, and students. Do not require email login, Google login, or an OAuth provider for this version. After authentication, route users to their proper dashboard using the trusted server-side role. A public role selector must not grant permissions.

Administrators choose custom usernames and initial passwords for teacher or student accounts. Teachers choose custom usernames and initial passwords for students they create in their authorized classes. Provide validation, a unique normalized username constraint, clear authorized-staff duplicate-name feedback, password confirmation, and an optional strong-password generator. User IDs remain stable when a username changes.

Display/copy an initial password only as part of the authorized account-creation or reset flow. Store only a modern salted password hash. No staff page can retrieve an existing user's password; reset is the recovery mechanism. Require a password change after an initial or reset password is used, and let users change their own password after authenticating. Staff still retain their account-provisioning and reset permissions.

Administrators can reset teacher/student credentials. Teachers can reset credentials only for students currently assigned to their authorized classes. A teacher may never reset an administrator, another teacher, or an unrelated student. Password reset and account suspension revoke relevant sessions. Show a forgot-login/password help page directing users to the administrator, their teacher, or the center's call/text number; do not require a paid email/SMS delivery service.

Use explicit account states such as active, suspended, revoked, and archived, with a separate must-change-password flag. Enrollment/class membership states are separate from login identity. Administrators can activate, pause, end, restore, or archive enrollment manually. Never attach access to payment webhooks. A suspended/revoked/archived account cannot use protected resources through an old bookmark, existing session, API request, or private download. An inactive student enrollment blocks student learning access; active teachers and administrators do not need student enrollment for their personal study workspace.

Provide a working **Revoke Access** action in the appropriate account-management screens. Administrators can revoke any teacher or student account. Teachers can revoke student accounts currently assigned to their authorized classes; they cannot revoke another teacher, an administrator, or an unrelated student. Account revocation blocks that login across the entire portal and all of its classes, so show this scope clearly before the action, including for a student enrolled in multiple classes.

Revocation must be an immediate, server-enforced account-state change: invalidate all existing sessions and refresh tokens where used, block new logins, reject protected requests, and stop further assignment/diagnostic submissions by that account. Preserve previously accepted responses, submissions, progress, membership history, and audit records. Mark interrupted attempts as interrupted by access revocation rather than fabricating a completed diagnostic or resetting its timer. Display a neutral access-revoked screen with the center's account-help contact. Cached private content must not remain accessible through the app after it observes the revocation.

Revoking a teacher disables all of that teacher's management and personal learning access. Keep the teacher's historical assignment authorship and feedback; do not revoke their students automatically. Administrators can reassign the affected classes and outstanding work to active staff. Record the actor, target, previous/new status, time, and optional private reason for revocation/restoration. Use a confirmation naming the affected account; revocation preserves records rather than permanently deleting them.

Administrators can restore revoked teacher/student accounts after reviewing enrollment and class relationships. Teachers can restore only a student revocation they performed themselves while that student remains within their current authorized scope; they cannot undo an administrator's revocation, reactivate administrator-suspended enrollment, or grant themselves new permissions. Restoration requires a fresh login and never revives old sessions. Do not add hard deletion as the default revoke action.

Provision the first administrator through a private one-time setup/seed process. Never publish a universal default password or leave a public create-admin endpoint. Protect the last active administrator from accidental removal. Sample credentials belong only in isolated development fixtures.

**2C. Custom administrator dashboard**

Build a tailored tutoring-center dashboard with useful summary cards, search, filters, pagination, accessible forms, clear empty states, and real persisted data. Required areas:

- **Overview:** active teachers/students, classes, enrollment requests, upcoming assignments, overdue work, and recent activity.
- **Teacher management:** create accounts with custom credentials; edit profiles; activate/suspend/revoke/restore/archive; reset passwords; assign or remove classes. Only administrators can create teacher accounts, revoke teacher access, or grant staff privileges.
- **Student management:** create accounts with custom credentials; approve requests; edit basic information; assign/reassign classes and teachers; manage enrollment; revoke/restore access; reset credentials; review academic progress. Preserve historical work when a class or teacher changes or access is revoked.
- **Class management:** create a class/cohort, give it a title, grade/SHSAT track, description, optional schedule, assigned teacher(s), roster, and active/archived state. Public listing visibility is independent from enrolled roster access.
- **Enrollment requests:** review contact details, record staff follow-up notes, approve/decline, and convert approved requests without duplicate accounts.
- **Assignments and results:** inspect center-wide work, submissions, completion, topic weaknesses, score estimates/calibration status, and diagnostic history; create homework and classwork with custom titles and assign work to any authorized class or student.
- **My Learning:** use the complete personal SHSAT practice and diagnostic workspace described in section 2I, with personal results separate from center-wide student reporting.
- **Content administration:** manage reviewed questions, passages, lessons, generators, publication status, error reports, and question-bank coverage. Keep the content quality requirements in the later sections.
- **Settings:** center branding initialized to Queens Scholars Tutorial, public class information, contact number initialized to 718-913-7706, and relevant learning settings.
- **Audit history:** record account creation, enrollment changes, resets, access revocation/restoration, permission changes, assignment publication, and grade corrections with actor and time; never log passwords.

Every action must work through the backend and survive logout/server restarts. Do not deliver a decorative dashboard with hardcoded counts or buttons that do nothing.

**2D. Teacher dashboard and teacher-created students**

Teachers receive their own dashboard showing only the classes and students to which they are assigned. They can:

- Create a student account from **Add Student**, setting the custom username and initial password and adding the student to one of their own classes.
- Activate classroom access for a newly created student whom they have manually enrolled in that authorized class. Public applicants remain pending until staff approve enrollment; teachers do not gain general center-wide intake or staff-management permissions.
- View and edit permitted student profile fields, reset their students' credentials, and manage their own class rosters within administrator-defined permissions.
- Use **Revoke Access** for an assigned student's account and the permitted restore flow from section 2B. Show account status, preserve academic history, and enforce the action through the backend.
- Assign work to their classes, selected students, or an individual student.
- Build work from reviewed questions/passages by topic, subtopic, difficulty, question count, and format; select complete ELA passage sets.
- Create and assign **Homework** and **Classwork** as separate, clearly labeled work types, each with a teacher-written custom title. Also support lessons, practice sets, quizzes, full diagnostics, and approved handouts/resources.
- Set instructions, publish time, due date, attempt limit, time limit where appropriate, and feedback-release policy.
- Save drafts, preview student-facing work, publish, and duplicate an assignment as a new version.
- See per-student status, answers, grades, time spent, topic weaknesses, explanations, diagnostic history, and eligible score estimates/calibration status within their teaching scope.
- Add feedback, approve a permitted retry, extend an individual due date, and recommend targeted practice.
- View class summaries, student progress, and their own authorized exports; publish class announcements through the app.
- Open **My Learning** to answer SHSAT Math/ELA questions, take their own diagnostics, and use the full personal learning tools described in section 2I.

A student must be able to belong to more than one class without receiving duplicate login identities. Teachers cannot claim an unrelated existing account merely by guessing its username or ID; an administrator must authorize that relationship or it must already be within the teacher's scope. Teachers cannot create teachers/admins, change their own role, access another teacher's unrelated students, or manage global enrollment outside their authority.

Teacher-created custom questions remain drafts until required validation/review is complete. A teacher can select reviewed materials; account privileges do not waive content correctness standards.

**2E. Student dashboard**

Active students see their enrolled classes, teachers, upcoming work, due/overdue work, completed submissions, and their own study progress. Required views include **My Classes**, **Assigned Work**, **Practice**, **Diagnostics**, **Results**, **Mistake Notebook**, and **Account**. Assigned Work has visible **Homework** and **Classwork** filters/tabs plus other supported work types. Every assignment card and submission/review page shows the staff-written custom title, work type, class, assigned-by name, due date, and status. Results and progress pages show eligible SHSAT score estimates, section results, uncertainty, and calibration status as required in section 14.

Students can open instructions/resources, save allowed drafts, complete work, submit, and review feedback according to the assignment's release policy. They can practice eligible topics and use the detailed mistake-review/two-question follow-up features. Show schedule and announcements when a class has them.

Students cannot see other students' grades, private rosters/contact details, staff notes, unreleased answer keys, administrator pages, or teacher-only actions. They cannot assign themselves classes, grant enrollment, change roles, alter grades, or submit for another account.

**2F. Assignments, grading, and feedback rules**

An assignment has a stable ID, creator, class or selected recipients, required custom title, work type, instructions, grade track, content version, publication state, dates, allowed attempts, mode, and feedback policy. Work types include **homework, classwork, practice, quiz, lesson, diagnostic, and resource**. Homework/Classwork describe the assignment's purpose and are separate from its question topics and delivery mode. Administrators and teachers can assign either type to a whole authorized class, selected students, or one authorized student. Store its actual served items/variants and response formats. Use the center's **America/New_York** timezone for displayed due dates and unambiguous server timestamps for enforcement.

Build a real assignment composer with an editable **Title** field and **Work Type** selector. Allow descriptive staff-written titles such as "Week 3 Homework: Ratios and Proportions" or "Classwork 5: Main Idea and Evidence"; these are examples, not mandatory naming templates. Require a nonblank title, validate its length server-side, and render it as escaped plain text. Preserve the custom title and type in the database, student/staff lists, instructions, submission pages, feedback, notifications inside the app, and authorized exports. Drafts allow edits; duplicating work permits a new custom title and dates without overwriting prior submissions. Do not automatically replace a chosen title with a topic name or fixed "Assignment 1" label.

Homework supports independent completion, due dates, saved allowed drafts, retries where configured, and the chosen feedback policy. Classwork supports immediate/scheduled classroom release, the same question and grading tools, and a due time when needed. Classwork must still work if a student completes it remotely; the work type does not require location tracking. Both types use the shared question bank, detailed explanations, and two-question follow-up flow when feedback is released.

Support assigned/draft/not-started, in-progress, submitted, graded/released, and late states where relevant. Overdue status comes from deadlines and completion, not a guessed browser clock. Autosave accepted responses and make Finish/Submit reliable and idempotent. Submission updates the teacher's view without requiring a separate local export.

Grade objective questions server-side using the verified key. Teachers may provide an auditable correction or override where justified, with original results retained. Never replace an SHSAT diagnostic ability estimate with a teacher's homework percentage or claim they are the same metric.

Use feedback settings such as immediate practice feedback, after submission, after the due date, or manual teacher release. **Realistic SHSAT diagnostics always hide correctness, hints, and explanations until final submission or expiry**, regardless of a teacher's more permissive homework setting. Post-submission follow-ups do not change the diagnostic's recorded result.

For individualized variants, preserve comparable skill coverage and give the teacher the exact student's served instance and explanation. Do not regenerate a different question when reviewing a submission. Keep published/submitted content immutable; later edits produce a new assignment version. Define whether new class members receive existing work and confirm that rule rather than silently changing old recipients.

After released feedback, every wrong objective answer opens its detailed explanation and **Practice 2 similar questions**. Track related practice separately from the submitted grade.

**2G. Permissions, authentication, and shared data**

Implement permissions using role plus actual class/student relationships on every protected request, denying anything not explicitly permitted. Hiding a navigation link is insufficient; direct routes, APIs, exports, files, and guessed IDs need the same checks. Client-provided role, creator, class ownership, score, or enrollment state cannot be trusted.

| Capability | Administrator | Teacher | Student | Public visitor |
| --- | --- | --- | --- | --- |
| Submit an enrollment inquiry | Yes | Yes | Yes | Yes |
| Create teacher accounts or grant staff roles | Yes | No | No | No |
| Create student accounts | Yes | Within own authorized classes | No | No |
| Assign work | Any authorized class/student | Own classes/students | No | No |
| View academic records | Center-wide | Assigned students/classes | Own records | No |
| Change global settings or enrollment | Yes | No | No | No |
| Reset another user's credentials | Teachers/students | Assigned students only | No | No |
| Revoke student account access | Any student account | Currently assigned students | No | No |
| Revoke teacher account access | Any teacher account | No | No | No |
| Restore revoked account access | Teachers/students | Own student revocations within current scope; no administrator override | No | No |
| Create titled homework/classwork | Any authorized class/student | Own classes/students | No | No |
| Use personal SHSAT practice and diagnostics | Own learning workspace | Own learning workspace | Own learning workspace with active enrollment | No |
| View own diagnostic estimates and mistake review | Yes | Yes | Yes | No |

Use maintained authentication components, strong salted password hashing such as Argon2id, secure HTTP-only session cookies, HTTPS in deployment, CSRF protection where applicable, rate limits, input validation, and parameterized database access. Keep secrets and password hashes out of client responses. Avoid credentials/session tokens in localStorage. Expire/revoke sessions correctly and check current account/enrollment state server-side. Enforce active account status before role permissions, including staff personal practice; use an immediate revocation check or session version invalidation rather than allowing a revoked account to keep working until a long token expiry.

Model users, profiles, enrollment inquiries, classes, teacher-class assignments, student-class memberships, assignments with custom titles and work types, recipients, served items, attempts, responses, feedback, diagnostic state, score-estimate records/model versions, personal learning progress for every role, content versions, account revocation/restoration history, and audit events. Store an attempt's owner and purpose (student learning, staff personal learning, or staff preview) explicitly. Use unique constraints, foreign keys, transactions, migrations, and backups. Creating an account and its required class enrollment must not leave a half-created inconsistent record.

Separate student-visible teacher feedback from private staff notes. Limit access to parent/guardian contact details to staff who need it for their assigned students. User-scoped exports cannot expose unrelated records or authentication secrets. Protected downloads need authorization and safe file handling. Do not serve private class files as unrestricted public URLs.

**2H. Additional end-to-end acceptance checks**

Verify all of these with a real backend/database, including both allowed and forbidden requests:

- Public enrollment request persists and appears in the administrator inbox; approval creates one student identity and the intended enrollment.
- Administrator creates a teacher with custom credentials; teacher logs in and sees the correct classes.
- Administrator creates a student; teacher creates another student within their own class; both students can log in and access the intended portal.
- Initial/reset credentials enforce the first-login password change; previously stored passwords cannot be recovered from the dashboard.
- Teacher creates homework with a custom title and classwork with a different custom title; assigns one to a class and the other to selected students; intended recipients see the exact titles/types on another browser/device, submit, and the teacher sees saved results and feedback controls. Unselected students cannot access selected-recipient work by guessing its ID.
- Administrator creates, titles, assigns, previews, and reviews homework/classwork through the same working assignment system.
- Teachers cannot create staff accounts, claim unrelated students, or access records by modifying IDs; students cannot impersonate staff or each other.
- Duplicate normalized usernames fail cleanly; class changes preserve history; a second enrollment does not create a second login identity.
- Administrator revokes a student and a teacher; a teacher revokes an assigned student. Each loses access from existing sessions on other devices, cannot log in again, and cannot use direct APIs, submit work, practice, or open protected downloads. Historical work and assignment authorship remain intact. A revoked teacher's students retain their own authorized access.
- Teacher revocation/restoration requests targeting another teacher, an administrator, an unrelated student, or an administrator-revoked student are rejected. Authorized restoration permits a fresh login without reviving old sessions; expired diagnostic deadlines remain expired.
- Suspensions and password resets take effect on existing sessions; logout and user switching do not expose the previous user's cached records.
- Both administrator and teacher accounts complete their own Math/ELA practice, a full diagnostic, detailed mistake review, and two-question follow-ups using their existing login. Personal progress survives logout/restart and stays separate from student/class summaries. Staff accounts need no student enrollment and retain their management role.
- Eligible diagnostic results show the score-estimate panel, section results, uncertainty, and model/calibration information; uncalibrated or ineligible attempts show the correct explanation rather than a fabricated SHSAT number. The same results feature works for staff personal attempts.
- Assignment deadlines, attempt limits, delayed feedback, and diagnostic answer-key protection are enforced by the server.
- Every public phone reference is 718-913-7706; Call Now/Text Us use the corresponding number; enrollment requests do not automatically send messages.
- No checkout, card fields, payment SDK, billing integration, or payment-triggered access appears anywhere.

Deliver setup instructions for the first administrator and real account provisioning, not shared hardcoded production demo credentials.

**2I. Full personal learning access for teachers and administrators**

Every active administrator and teacher account must include **My Learning**, using the same working learning tools and question engines as the student portal. Staff can switch between **Manage Center / Manage Classes** and **My Learning** without logging out, impersonating a student, creating a second account, changing their role, or enrolling themselves in a student class. This switch changes the interface context; it never grants or removes a trusted role.

Staff must be able to choose the SHSAT grade track; read topic lessons and ELA passages; answer Math and ELA questions; use topic drills and mixed practice; create and complete personal homework/classwork-style sets with custom titles; complete mini and full diagnostics; submit answers; receive permitted feedback and step-by-step explanations; view accepted answers and why each option is wrong; use Practice 2 similar questions; save mistakes; schedule spaced review; follow study plans; view their own performance and score estimates/calibration status; and resume saved personal work across devices. Reuse the student assignment-taking interface for staff personal sets, with a real owner/recipient record and grading path. Personal work must not be published to a class unless staff explicitly use their authorized assignment-publication flow.

Use shared learning components and server logic so student features are also available to staff, rather than building a limited read-only preview. A staff **Preview Assignment** action remains a separate teaching tool; it does not replace My Learning or create a student's submission. All staff personal attempts are attached to that staff user's own stable account ID. Student assignment submissions remain attached only to their actual student recipient.

Maintain staff personal progress, submissions, diagnostic results, estimates, mistakes, and follow-ups separately from student/class statistics, enrollment counts, gradebooks, and score-calibration samples. Personal learning does not expand a teacher's access to other classes or students. The account owner sees their personal results; another teacher does not gain access merely because both users are staff. Any administrator-authorized inspection remains permission-checked and auditable.

When staff take a realistic diagnostic, apply the same timer, navigation, grading, and delayed feedback rules as for students. Do not display teaching answer keys or content-editor shortcuts inside the diagnostic. Label staff attempts as staff personal practice; known prior exposure to an item's solution makes that attempt ineligible for a standard independent score estimate. Preview activity never counts as mastery, student completion, or a diagnostic score. Revoking the staff account also revokes access to My Learning.

**3. Build a real curriculum registry**

Write all topics below into the application's curriculum and question-selection data. Do not leave them only in documentation. Give each assessable leaf skill a stable ID, title, description, prerequisites, subject, domain, grade track, standards reference, source evidence, eligible item types, difficulty levels, generator or bank references, and published-content count.

This is an expanded preparation checklist, not a claim that NYCPS publishes this exact exhaustive subtopic list or that every listed skill appears on every exam. Complete a standards-to-curriculum audit and add any omitted relevant skill. Categorize each entry as tested-content preparation, prerequisite support, or enrichment. A useful prerequisite may appear in lessons without receiving disproportionate diagnostic weight.

For Math, the official guide identifies standards **through grade 7 for students taking the grade 8 exam**, and **through grade 8 for students taking the grade 9 exam**. Keep grade 8 mathematical extensions out of the default grade 8 diagnostic. ELA coverage must follow the published reading and revising/editing scope and relevant language standards; do not assume it has the same cutoff as Math.

Never invent standards codes. If alignment is unresolved, keep the item out of an exam simulation until verified. Reading strategies, genres, and error labels are useful tags; do not count them as independent assessable topics simply to inflate bank totals.

**4. Math curriculum: core content and foundations**

Implement the following skill families and their assessable subskills, with grade-appropriate boundaries verified against the New York standards.

**M1 — Arithmetic and number sense**

- Place value; whole-number and decimal operations; estimation; rounding; numerical comparisons; number-line reasoning.
- Order of operations, grouping symbols, positive integer powers, and the difference between a negative base in parentheses and a negative sign outside a power.
- Properties of operations; equivalent numerical expressions; inverse operations; mental computation and reasonableness checks.
- Factors and multiples; divisibility; prime and composite numbers; prime factorization; greatest common factor; least common multiple; odd/even reasoning.
- Repeated-event and grouping problems using common factors or multiples.

**M2 — Fractions, decimals, and signed rational numbers**

- Equivalent fractions; simplification; improper fractions and mixed numbers; fraction comparison and ordering.
- Addition, subtraction, multiplication, and division of fractions and mixed numbers; reciprocals; fractions of quantities; fractions of a remainder; interpreting division.
- Decimal operations; fraction–decimal–percent conversions; terminating and repeating decimal relationships within the standards.
- Positive and negative integers and rational numbers; opposites; absolute value; ordering; arithmetic sign rules; distances on number lines.
- Multi-step rational-number applications involving changes, balances, temperatures, elevations, quantities, and measurement.
- Perfect squares and cubes and their area/volume models as appropriate; distinguish these from grade 8 irrational-number content.

**M3 — Ratios, rates, and proportional relationships**

- Ratio language and notation; equivalent ratios; part-to-part and part-to-whole comparisons; missing quantities; distributing a total in a ratio.
- Ratio tables; double number lines; unit rates, including fractional quantities; comparing rates; dimensional consistency.
- Proportions; constants of proportionality; recognizing proportional versus nonproportional situations.
- Representing proportional relationships using tables, graphs, equations, and descriptions; interpreting the origin and points on a proportional graph.
- Unit prices; recipes; constant-speed travel; distance/rate/time; production rates; grade-appropriate combined-rate contexts.
- Scale drawings; scale factors; map distances; actual dimensions; scale effects on area where aligned.
- Multi-step changes to a ratio caused by adding, removing, or transferring quantities.

**M4 — Percent applications**

- Finding a part, whole, or percent; percentages above 100%; selecting the correct reference quantity.
- Percent increase/decrease; percent change; successive percent changes; why equal increases and decreases do not cancel.
- Discounts; sales tax; tips; commissions; markup and markdown; original-price reasoning.
- Simple interest; percent error; multistep purchase and financial contexts within the standards.
- Percentages combined with fractions, ratios, graphs, and tables; interpreting misleading percentage comparisons.

**M5 — Expressions, equations, inequalities, and relationships**

- Variables; numerical and algebraic expressions; translating verbal relationships; evaluating by substitution.
- Terms, coefficients, constants; like terms; distributive property; expanding and factoring appropriate expressions; equivalent expressions.
- One-step equations and grade-appropriate two-step equations, including rational coefficients; checking solutions.
- Grade 7 equations with structures such as p(x + q) = r and px + q = r; multistep word reasoning using these structures.
- One-variable inequalities within the grade-level scope; interpreting solutions; representing solution sets on a number line; reversing inequality direction when multiplying or dividing by a negative value.
- Independent/dependent quantities; input-output tables; relationships between quantities; equations and graphs within the standards.
- Consecutive-number, age, quantity-transfer, perimeter, average, price, and other word problems solvable with permitted algebra.
- Equivalent-expression reasoning and comparing solution methods.

Do not make equations with variables on both sides, systems, or formal slope-intercept analysis required content for the grade 8 exam merely because they seem useful. Those belong in the verified extension track where applicable.

**M6 — Plane geometry**

- Geometric terminology; points, lines, rays, segments; parallel/perpendicular relationships; classifying appropriate shapes.
- Angle measurement; complementary, supplementary, adjacent, and vertical angles; angle relationships around a point; unknown-angle reasoning within scope.
- Triangle classification; conditions for constructing triangles; uniqueness, impossibility, or multiple possible triangles; triangle angle facts where aligned.
- Quadrilateral properties and classification, using the current New York definitions, including its inclusive trapezoid definition.
- Perimeter and missing dimensions; areas of rectangles, parallelograms, triangles, trapezoids, and composite polygons; shaded-region reasoning using eligible shapes.
- Circle radius and diameter; circumference and area; semicircles or other specified fractions of a circle; interpreting pi; giving exact or specified approximate answers.
- Coordinate quadrants; plotting rational coordinates; horizontal/vertical distances; polygons on coordinate grids; coordinate-based perimeter and area within scope.
- Scale drawings and diagrams; working from stated measurements rather than assuming a figure is drawn to scale.
- Changes in dimensions and the resulting perimeter or area, with scope checks.

Respect limitations in the standards' notes, not just their headings. For example, grade 7 does not require recovering a circle's radius from its area; do not introduce that task into the core diagnostic merely because the area formula is covered.

**M7 — Solid geometry and measurement**

- Units and conversions; elapsed time; length, mass, capacity, area, and volume; distinguishing linear, square, and cubic units.
- Nets and surface area of the right prisms and pyramids allowed by the standards, with necessary dimensions provided.
- Volume of rectangular prisms and right triangular prisms; fractional dimensions; composite rectangular-prism volumes.
- Cross-sections of appropriate solids; relating two-dimensional and three-dimensional representations.
- Missing dimensions; packing, filling, covering, and capacity applications; combined measurement and geometry problems.

Check solid types individually. Do not import every high-school solid formula into the grade 8 diagnostic. Cylinder, cone, and sphere volume belong in the grade 8-standards extension below.

**M8 — Statistics and data interpretation**

- Statistical questions; populations, samples, and variation; interpreting what a data set represents.
- Mean, median, mode, range; missing data values; how changes to observations affect measures of center and spread.
- Weighted or combined averages as an application of totals and counts when appropriate.
- Frequency tables; dot plots; histograms; box plots; other grade-appropriate data displays and axis scales.
- Quartiles, interquartile range, and interpreting outliers within the standards.
- Describing distributions: clusters, gaps, peaks, symmetry, and variability; comparing distributions and drawing justified informal conclusions.
- Reading charts/tables; percentage and ratio applications to data; identifying conclusions unsupported by the information.

Do not add statistics topics solely because another state's standards include them. For example, verify the current New York requirements before treating mean absolute deviation as core.

**M9 — Probability and counting**

- Probability from 0 to 1; impossible/certain events; complements; equally likely outcomes; favorable outcomes versus total outcomes.
- Experimental versus theoretical probability; relative frequency; predictions; interpreting a simulation.
- Sample spaces using organized lists, tables, and tree diagrams; basic counting by systematic enumeration.
- Compound events; independent/dependent contexts where supported; with/without replacement; keeping the sample space consistent.
- Probability expressed as fractions, decimals, and percents; multistep probability with proportional reasoning.

Do not require formal permutations/combinations, factorial formulas, or advanced conditional probability in the current core diagnostic unless an official alignment supports them.

**M10 — Integrated problem solving**

- Problems that combine two or more eligible skills; extracting constraints; selecting a representation; distinguishing relevant from irrelevant information; ordinary counting of overlapping groups where aligned.
- Backsolving and substitution; organized cases; estimation; recognizing equivalent representations; checking units and whether a solution makes sense.
- Interpreting mathematical vocabulary and quantifiers such as at least, at most, difference, remaining, total, consecutive, and distinct.
- Diagnosing incorrect mathematical reasoning and identifying which step fails.

These are cross-cutting skill tags, not a separate pool that replaces domain coverage.

**5. Math extensions for the grade 9 exam**

Build a separately selectable grade 9 track covering the core above plus verified grade 8 standards:

- Rational/irrational numbers; square and cube roots; approximating irrational numbers; locating them on a number line.
- Integer exponent rules, including zero and negative exponents; scientific notation and operations with it.
- Linear equations with variables on both sides; one solution, no solution, and infinitely many solutions.
- Systems of two linear equations; graphical and algebraic reasoning; grade-appropriate applications.
- Functions: recognizing a function; comparing representations; linear/nonlinear relationships; interpreting rate of change and initial value.
- Slope and proportional graphs; y = mx and y = mx + b; interpreting and comparing lines.
- Translations, rotations, reflections, dilations; congruence/similarity; coordinates and sequences of transformations.
- Angle relationships involving parallel lines/transversals; triangle exterior angles and angle-sum reasoning within the standards.
- Pythagorean theorem and its converse; coordinate-plane distance; appropriate two- and three-dimensional applications.
- Volume of cylinders, cones, and spheres.
- Bivariate data; scatter plots; associations; informal fitted lines and linear models; two-way tables and relative frequencies where aligned.

Do not silently expand this into a full Algebra I, Geometry, or Algebra II course. Keep quadratics, trigonometry, logarithms, formal proof units, and other unsupported material outside the exam track.

**6. ELA curriculum: reading comprehension**

Create separate assessable skill records for these families and subskills:

- **Central meaning:** main/central idea; theme; distinguishing topic from central idea or theme; how ideas/themes develop; accurate summaries; selecting an appropriate title when supported.
- **Details and evidence:** explicit information; supporting details; strongest textual evidence; connecting evidence to a conclusion; integrating information from different parts of a text.
- **Inference:** implied meaning; reasonable conclusions; character motives; inferred relationships; distinctions between supported inference, unsupported assumption, and contradiction.
- **Vocabulary in context:** contextual meaning; multiple meanings; connotation versus denotation; domain-specific vocabulary explained by the text; word relationships; appropriate use of word parts without relying on them alone.
- **Author's choices:** purpose; perspective; attitude; tone; tone shifts; mood and its distinction from tone; word choice; rhetorical effect; intended effect on the reader.
- **Structure and organization:** chronology; sequence; comparison/contrast; cause/effect; problem/solution; description; argument; the function of a sentence, paragraph, section, opening, or conclusion.
- **Literary analysis:** setting; characterization through actions, thoughts, description, and dialogue; conflict; plot development; turning points; narrative perspective; relationships among characters and events.
- **Literary language:** simile; metaphor; personification; hyperbole; idiomatic meaning; imagery; symbolism; irony; allusion; repetition; how a device contributes to meaning rather than merely naming it.
- **Poetry:** speaker; shifts; stanza and line relationships; imagery and figurative meaning; rhyme, rhythm, alliteration, assonance, and onomatopoeia when their effect is relevant; form and development of an idea. Do not invent requirements to memorize advanced poetic terminology.
- **Informational reasoning:** claims; reasons; relevant and sufficient evidence; facts versus opinions; supported versus unsupported conclusions; connections among ideas; explanations of processes or events.
- **Synthesis and representation:** relationships between a text and an associated graphic, chart, or table; comparing perspectives or ideas across texts when supported by current official examples.

Include questions requiring close reasoning across several sentences or paragraphs. Do not reduce reading comprehension to trivia, vocabulary matching, or selecting a sentence that repeats the question.

Teach useful reading habits—annotating, summarizing paragraphs, finding evidence, eliminating distractors—but assess the underlying reading skill rather than whether students use one preferred strategy.

**7. ELA curriculum: revising and editing**

Support passage-based revision and stand-alone editing. Separate the assessed skill from the response format.

**Writing development and organization:**

- Clear main claim or controlling idea; relevant introduction; effective conclusion.
- Topic sentences; supporting details; adding/deleting material based on purpose and relevance.
- Logical paragraph and sentence order; placing a sentence where it belongs; preserving references and chronology.
- Appropriate transitions between ideas; addition, contrast, cause/effect, sequence, and examples.
- Combining sentences while retaining every necessary meaning and relationship.
- Clarity; precision; concision; redundancy; repetition; consistent style and tone.
- Appropriate word choice; avoiding vague references; preserving intended emphasis and logical meaning.

**Grammar, usage, and sentence structure:**

- Complete sentences; fragments; run-ons; comma splices.
- Independent/dependent clauses; phrases; simple, compound, complex, and compound-complex structures; identifying and correcting an error in sentence construction.
- Subject–verb agreement; intervening phrases; compound subjects; suitable verb forms and consistent tense.
- Pronoun case; agreement; clear antecedents; consistent person and number; appropriate reflexive/intensive forms.
- Misplaced and dangling modifiers; logical placement of phrases and clauses; restrictive versus nonrestrictive material.
- Parallel construction; conjunctions; coordination and subordination.
- Adjective/adverb use; logical comparisons; frequently confused words as context supports them.
- Verbals; active/passive voice; inappropriate shifts in verbs or voice within the relevant language standards.

**Mechanics:**

- Capitalization; spelling where actually relevant to the editing scope.
- Commas in clauses, introductions, lists, and nonessential material; distinguishing necessary from unnecessary punctuation.
- Semicolons and colons; apostrophes and possession; quotation punctuation.
- Parentheses, dashes, hyphens, and ellipses within grade-appropriate conventions.

Avoid subjective rules presented as absolute errors. For example, a passive sentence can be grammatical; a revision question must specify the purpose that makes a particular revision best. An optional serial comma must not create two defensible answers.

Do not reintroduce obsolete stand-alone logical-reasoning or scrambled-paragraph sections as current SHSAT sections. Sentence-order questions may appear only as supported revision skills.

**8. Reading passage bank without runtime AI**

Use a curated local library of authentic excerpts and original authored passages. This is the main solution for strong ELA content without an AI key. Randomly recombining sentences is not an acceptable substitute for coherent stories or meaningful reading questions.

Cover fiction, poetry, narrative nonfiction, essays, speeches, biography/memoir, journalism, argument, and broad-audience scientific, historical, technical, and economic writing. Match the current official genre scope. Include varied subjects, voices, structures, and levels of complexity.

Passage acquisition:

- Use verified public-domain works and openly licensed materials with appropriate permission for redistribution and adaptation.
- Project Gutenberg and Standard Ebooks can supply candidate literary sources. Check the specific work, edition, translation, license, and applicable copyright status; neither a famous author's age nor the site's name is sufficient proof for every asset.
- Use original passages authored during development and editorially checked, particularly where older literature leaves gaps in modern informational writing.
- Treat public access to official samples or commercial preparation sites as separate from permission to republish. Link to official resources unless reuse is permitted. Do not copy a commercial question bank.
- Record title, author, source link, publication/edition information, rights basis, excerpt boundaries, adaptations, and a content checksum.
- Keep attributions with content. Review imported HTML and strip active content. Follow source download rules; fetch at build/import time, not once per student's question.

Passage quality:

- Select coherent excerpts with enough context to stand alone. Preserve paragraph breaks, dialogue, poetry lineation, and meaningful punctuation.
- Identify quotations, omissions, and adaptations accurately; never invent a source attribution for an original passage.
- Provide brief neutral context or verified glossary notes only when needed; do not reveal the answer through them.
- Compare length, syntax, vocabulary, conceptual density, and inferential demand with official examples. Readability scores alone do not establish difficulty.
- Check informational accuracy against reliable sources. Each question must be answerable from the supplied material, without outside trivia.

Attach questions to specific immutable passage versions. Record exact paragraph/sentence/line IDs and evidence spans. When text changes, invalidate and recheck its questions and explanations.

**9. Math generation without AI**

Implement seeded, rule-based generators built from mathematical models and reviewed problem blueprints. Each blueprint must have:

- Its target skill, required prerequisites, grade eligibility, and intended reasoning demand.
- Parameter ranges and constraints that ensure a valid situation and a well-defined answer.
- A canonical mathematical model, exact solution, independent verification method, and answer-normalization rules.
- Several coherent wording/representation variants, where valid, rather than only random names and numbers.
- Distractors linked to realistic errors and explanations for those specific errors.
- An explanation template filled from the actual instance's solution steps.
- A deterministic seed, version ID, and reproducible item ID.

Generate from valid structures. For example, select a valid solution and compatible coefficients before writing an equation problem; construct a data set with a known total before asking for a missing value; build a geometric model before drawing its diagram.

Use rational arithmetic for fraction-sensitive calculations. Use symbolic pi or explicitly specified approximations. Never mark an equivalent fraction wrong or let floating-point noise change the key. Do not accept arbitrary near answers unless the prompt requires rounding and defines the tolerance.

Use a constrained expression parser for equation-editor responses. Support only explicitly implemented syntax and domains; do not execute student input as code. Check semantic equivalence as well as required answer form. A request for an ordered pair, a simplified expression, or a particular unit must be enforced consistently with that item's stated directions.

Reject instances with zero denominators, impossible shapes, conflicting measurements, accidental extra solutions, invalid probabilities, impossible counts, inappropriate negative quantities, missing units, or wording that permits a second interpretation.

Every single-select item must have exactly one correct choice after semantic normalization. Every multiple-response item must have the intended correct set. Remove duplicate or equivalent options. Shuffle using stable option IDs so the key and explanations remain correct.

Make difficulty come from reasoning: linked steps, representations, constraints, and concept combinations. Bigger numbers, longer arithmetic, obscure tricks, and out-of-scope algebra are not reliable ways to make a question SHSAT-level.

For every assessable core math leaf, aim for at least **1,000 distinct validated instances** across several meaningful blueprints where possible. Track unique mathematical structures separately from numerical variants. A single template with 1,000 substituted numbers must not be reported as 1,000 authored problem types.

**10. ELA question production without AI**

Use three complementary systems:

1. An authored, reviewed bank for reading comprehension and nuanced passage revision.
2. Rule-based grammar generation from controlled sentence structures, validated agreement, clear clause boundaries, and carefully defined error transformations.
3. Reviewed question forms connected to passage annotations and evidence records, with variations allowed only when the answer and rationale remain valid.

For reading items, store the skill, stem, options, correct answer or answer set, exact textual evidence, reasoning chain, and an explanation for every distractor. Each item needs an editorial check for a uniquely defensible answer. A keyword match or a grammar checker cannot validate a theme or inference answer.

Distractors should represent specific errors: too broad, too narrow, partly true but incomplete, wrong referent, unsupported inference, contradicted detail, confused cause/effect, or an answer to a different question. Keep options comparable in specificity and plausibility. Avoid making the correct answer conspicuously longer or more sophisticated.

Grammar generators must track number, person, tense, case, phrase attachment, and sentence structure. Apply a reviewed transformation for the tested error. Verify all options for both grammatical correctness and preservation of meaning. Do not assume a randomly altered word necessarily creates a useful editing question.

For open-ended fill-in formats, allow only cases with a clearly bounded accepted answer set that matches the observed official mechanic. Do not create ungradable free-form essays or require AI judgment.

Build toward **thousands of genuinely distinct ELA questions per major skill family** and, ultimately, **1,000 reviewed questions per assessable leaf skill** across varied passages or sentence contexts. A question tagged with three skills still counts as one unique item. Shuffled options, renamed characters, and trivial paraphrases do not inflate totals.

A practical first substantial content release should target at least 250 suitable passages and 2,000 reviewed ELA items, with balanced coverage. This is an intermediate milestone, not fulfillment of the full per-skill expansion target. Provide an actual coverage report, batch-authoring/import workflow, and remaining-content checklist. Do not claim the complete bank is finished until the stated targets are met; never lower the review standard to reach a number.

Cache approved content locally in versioned packs. The student app selects and assembles reviewed content; it does not invent new interpretations, stories, or answer keys while a student waits.

**11. Explanations that actually teach**

Every published item must have a complete explanation before it is available to students. In study mode, explanations appear after an answer is checked. In diagnostics, all feedback stays hidden until final submission or time expiry.

For Math, show:

- What is being asked and which information matters.
- The relevant concept, with variables and units defined.
- A sequence of justified steps using the exact numbers in this instance.
- Why each operation follows from the situation; do not skip the difficult setup.
- The final answer in the requested form and a verification by substitution, units, estimation, or a second method.
- Why the selected wrong answer fails, when a known misconception explains it; the reason each other distractor is incorrect.
- A useful alternative method only when it adds understanding.
- A short transferable lesson, followed by related practice.

For ELA, show:

- A plain-language explanation of the task.
- The exact supporting text with stable references, highlighted in the full passage.
- The connection between that evidence and the answer, including the reasoning needed for an inference.
- Why the correct answer satisfies the entire question.
- A separate explanation for every incorrect option, stating precisely where it overreaches, contradicts the text, misreads a relationship, or fails the editing requirement.
- For revision, the original and revised text and why the change improves grammar, meaning, organization, or purpose.
- A short technique the student can apply to another passage.

Never write only “B is correct because the passage supports it.” Never fabricate quotations, circular justifications, or an explanation unrelated to the submitted answer. Do not claim to know the student's thought process from their choice alone; describe a possible mistake and let the student identify their actual reason.

Use progressive disclosure: a clear explanation first, then expanded steps and option analysis. Detail should be useful, not padded. Correct answers must also have explanations available in review.

**12. Diagnostic fidelity and digital interactions**

Create a full-length **current-format simulation** using original or permitted content. Match the published structure and interaction rules closely. Describe it as independent SHSAT preparation, not the official examination. A visual resemblance does not establish identical adaptive selection or score accuracy.

Implement these navigation rules:

- Require a response before normal advancement.
- Math and stand-alone ELA answers become locked after advancing.
- Within an active ELA passage set, allow revisiting and changing responses and using bookmarks.
- Submitting an ELA set permanently locks that set.
- Completing/submitting the first subject unlocks the other; the submitted subject stays locked.
- Do not add a global skip-and-return grid or unrestricted section switching to realistic mode.

Use a shared 180-minute timer, without an invented mandatory 90/90 split. Let students plan their time without enforcing a coaching suggestion as a test rule. Realistic mode has no ordinary pause. Refreshing, backgrounding the tab, or reopening the app must not reset the timer. An explicitly abandoned attempt is recorded as abandoned, never as a completed diagnostic.

When time ends, preserve and submit saved responses, mark unreached items accurately, and show results. A complete untimed attempt has exactly 50 answered items in each subject; an expired attempt may have fewer reached/answered items. Keep the planned 100-item structure distinct from how many items were actually administered before timeout.

Support a selectable 360-minute extended-time simulation and configurable approved-accommodation practice. Model break behavior from the current official rules. Label untimed, pausable, coached, or altered-accommodation attempts separately so their results are not mixed indiscriminately with standard timed attempts.

Provide an uncluttered testing layout inspired by the official tools: passage/item area, answer area, visible subject and progress, timer visibility control, clear navigation, and a review interface confined to the active ELA set. During diagnostics, hide accuracy, adaptive difficulty changes, hints, explanations, and study streak animations.

Implement the documented interaction families, then verify their applicability against the current readiness tool and practice forms:

- Single-choice options and typed answer blanks.
- Drag-and-drop targets or categorization.
- Clickable image regions and selectable text spans.
- Mathematical expression entry with the necessary equation-editor symbols.
- Embedded dropdown choices and multiple-response selections.
- Selection tables, point plotting, and supported shape interactions.
- Solution-set interaction, which the official item-type examples identify for grade 9 only.

Build keyboard and touch alternatives without changing what a task assesses. Respect the specified number of selections and validate every required component before submission. Do not invent the official fraction of each item type or claim every documented renderer must occur on every form.

Store scoring rules per item format and verify official partial-credit behavior where documented. If it is not published or observable, use an explicit practice scoring assumption and record it as a difference; do not invent an official partial-credit policy. Any learning feedback about partly correct components belongs after diagnostic submission.

Add highlighting, answer elimination, a digital notepad, drawing with undo/redo/clear, a line-reader mask, and passage glossary popups. The guide describes the ELA notepad as retained across that subject and the Math notepad as refreshing per item; verify and implement those differences. No calculator or teaching formula sheet in realistic mode. Study-mode reference sheets are allowed and must be separate.

Do not recreate Pearson branding or imply NYCPS endorsement. Compare layouts and behavior using observable official resources; document any remaining visual or functional differences instead of calling an approximate simulator “exactly identical.”

**13. Adaptive selection without a language model**

Implement deterministic, testable statistical or rule-based selection. Adapt separately by subject, beginning near moderate difficulty. Update only from committed responses: a submitted Math/stand-alone item or a finalized ELA set. Do not adapt repeatedly from temporary answer changes inside a passage set.

Use calibrated item parameters when available. A documented item-response model is suitable; do not assume NYCPS uses your chosen model. If empirical calibration is unavailable, use reviewed difficulty bands and explicitly treat the algorithm as an adaptive practice approximation.

Selection must account for subject-domain coverage, eligible item formats, grade boundaries, content exposure, remaining question slots, and passage sets. Do not simply choose “one harder after right, one easier after wrong” and claim official equivalence. Keep ELA sets intact; shared-passage items are not independent evidence in the same way as unrelated items.

If the public resources do not publish an exact domain/item-type allocation, derive and document a balanced practice blueprint from official examples without presenting it as an official confidential blueprint. Provide a configuration path for later verified updates.

Do not assume that a publicly available sample form uses the same adaptive algorithm as the live examination. Use official samples to check content and observed interactions, while documenting the app's own selection method separately.

Keep enough reserve content to finish a test without prohibited repetition. Exclude already exposed diagnostic items and close math siblings where possible. If the bank cannot meet a planned diagnostic, report the shortage before starting; do not secretly substitute lessons, out-of-scope items, or unreviewed content.

**14. SHSAT-style score estimates with honest limits**

**Score estimation is a required product feature, not an optional suggestion.** Build the working estimation module, eligibility checks, results panel, history, and staff reporting with no AI or paid scoring API. Eligible student diagnostics and staff personal diagnostics use the same estimation method. Students see their own estimates; teachers see their own and their authorized students' estimates; administrators see their own and authorized center-wide student estimates. Do not omit the feature merely because score calibration needs additional evidence; implement the complete workflow and report any missing calibration data honestly.

Official scoring relates the response pattern to established item difficulty, transforms performance separately for ELA and Math, and combines the scaled subject scores. Therefore, percent correct alone cannot reproduce the current official score.

Implement separate concepts for:

- Correct/reached counts, completion, and topic accuracy.
- The app's subject ability estimates, with a documented uncertainty measure.
- A validated mapping, if available, from practice performance to an estimated SHSAT-scale result.
- Readiness categories supported by the student's practice evidence.

After an eligible full diagnostic, show a prominent **Estimated SHSAT Score** panel supporting a report such as “Estimated SHSAT score: 470,” accompanied by a defensible interval, separate ELA/Math section estimates, correct/reached counts, mapping/model version, calibration status, and a clear **practice estimate, not an official score** label. This number is an example of the UI format, not a value to hardcode or a promised official conversion. Do not show the estimate, correctness, or changing difficulty while a realistic diagnostic is in progress.

Persist the estimate together with its underlying subject performance, uncertainty, eligibility reason, calibration/model version, exam year, grade track, attempt conditions, completion time, and question/content versions. Results must survive logout/server restart and remain attached to the actual attempt. Include the latest eligible estimate and an estimate-history view in student progress and staff My Learning, and expose authorized student estimates in teacher/administrator diagnostic reports. Compare trends only across suitably comparable attempts and mappings; label changes of model, track, accommodation, or test conditions. Do not count a short homework/classwork percentage as a full SHSAT score estimate.

Keep estimation deterministic and explain the published method in accessible language. Use a versioned, validated mapping or model with subject-specific calibration; apply its documented precision and eligibility rules. Administrators can import an approved calibration version and inspect validation/coverage reports. Teachers can read authorized estimates and explanations, but cannot silently set a student's predicted score or change the conversion curve. New calibration versions do not overwrite historical estimates without an explicit, audited recalculation that preserves the original result.

Do not invent NYCPS item parameters, percentiles, raw-to-scaled tables, experimental-item counts, or a universal maximum score. Do not multiply accuracy by 800, use historical 114-question curves as the current adaptive conversion, assume equal accuracy implies equal ability, or manufacture an uncertainty range.

The public materials used for this prompt explain the process but do not supply the item parameters and complete operational conversion needed to reproduce official scoring. This means exact reproduction is not established by those materials. Build a configurable estimation system, not a fabricated official scoring engine.

If there is no defensible calibration mapping, show a clearly identified practice ability/readiness result and “SHSAT score estimate not yet calibrated.” Leave the SHSAT-scale estimate unavailable rather than filling it with a fake number. The app must remain fully usable for studying and diagnostics. Report score calibration as an outstanding requirement before claiming that feature complete.

If later calibration data are available, document their source, permissions, year/grade relevance, sample size, representativeness, fitted method, validation on held-out data, observed prediction errors, and limitations. Separate local privacy-preserving imports from any optional data collection; do not add student-data uploads by default.

Incomplete, coached, repeated-content, and untimed attempts need appropriate labels and score-estimate eligibility rules. Never award a guaranteed admission, claim an official percentile from app users, or treat a previous year's school cutoff as a guaranteed future requirement.

**15. Results, mistake review, and two-question follow-up**

Attach each attempt to its authenticated owner, whether a student, teacher, or administrator, and, when assigned, its assignment/class or staff personal-work record. Save server-confirmed responses and results in the shared database. Users see their own learning reports; authorized teachers and administrators also see student reports allowed by their relationships and feedback policies. Keep staff personal attempts and staff previews separate from student submissions and class reporting.

When a student finishes or time expires, save the attempt and show:

- Overall completion and elapsed time; ELA/Math performance; the prominent score-estimate panel or an explicit calibration/eligibility status from section 14.
- Correct, incorrect, and unreached items, with formats preserved for review.
- Domain/subskill breakdowns with sample sizes; strengths, weaknesses, and topics not sufficiently sampled.
- Detailed explanations, the student's submitted responses, accepted answers, and relevant passage evidence.
- Timing patterns as coaching information, without inventing an official time-based score penalty.
- A personalized next-study plan derived from actual mistakes and uncertain skills.

For **every wrong answer**, offer **“Practice 2 similar questions.”** Select one question checking the same concept and one requiring transfer. Use distinct mathematical instances or a different passage/context for reading. The two follow-ups should not merely reshuffle the original options or reveal the answer through a shared text.

Save the original item, misconception possibilities, student-selected mistake reason, related lesson, and follow-up results in a mistake notebook. Retry the original later, not immediately as evidence of mastery. Schedule spaced review at configurable intervals, such as 1, 3, 7, and 14 days.

Keep follow-up performance separate from the completed diagnostic. Do not rewrite a diagnostic score when a student learns the answer afterward.

**16. Study experience**

Build these working screens and flows:

- Dashboard showing a useful next action, recent progress, and pending review.
- Full topic library with search, grade-track filters, prerequisites, and honest coverage status.
- Short topic lessons with worked examples and available reference material outside realistic mode.
- Topic drills and mixed practice; answer feedback immediately or after the set, chosen before starting.
- Mini diagnostics clearly labeled as shorter practice, not a full official-length test.
- Full-length diagnostic setup, realistic testing, reliable submission, complete results, and required score-estimate/calibration reporting.
- ELA passage library with genre/skill filters; poetry formatting retained.
- Math/ELA digital-item tutorial explaining input mechanics separately from content difficulty.
- Mistake notebook, two-question follow-ups, and spaced review.
- Progress history and customizable daily plans for reasonable study durations.
- Settings, accessibility options, approved downloaded study packs, content attribution, and role-scoped account-data export/import that cannot overwrite server-authoritative grades.
- My Learning for active teachers and administrators, providing the same personal question practice, diagnostics, explanations, mistakes, follow-ups, results, and score-estimate tools as students, with staff management available separately.

Make personalization rule-based: prioritize skills using accuracy, observed misconceptions, recency, uncertainty, and prerequisites. Show the student why a topic is recommended. Avoid declaring mastery from one right answer or many near-duplicate questions. Separate independent attempts from hinted practice.

Use realistic, challenging content alongside foundation lessons. Do not pad difficulty with excessive arithmetic, unrelated knowledge, trick wording, or advanced material outside the selected track.

**17. Content validation and quality gates**

No published question may be missing its answer, explanation, scope evidence, or required passage/diagram. Use draft, reviewed, published, and quarantined content states. Automated validation is necessary but cannot establish that every nuanced ELA answer is uniquely defensible.

For Math, exercise at least 1,000 deterministic seeds per blueprint where its distinct parameter space permits; enumerate smaller spaces. Independently check solutions, distractors, dimensions, answer equivalence, boundaries, unit handling, and explanation values. Prevent infinite regenerate-until-valid loops; use bounded attempts and explicit errors.

For ELA, validate references, sentence/line IDs, evidence text, option mappings, accepted responses, attribution, duplicates, and passage-version compatibility. Require documented editorial review for interpretation questions. Check whether two reasonable readers can defend different answers; revise or quarantine ambiguous items.

Deduplicate exact content and close siblings. Report authored items, blueprints, valid parameter variants, unique passages, and semantic duplicates separately. Counts must be computed from actual approved content or validated generator capability, not a marketing constant.

Provide a report-question-error flow. Flagged content enters review; confirmed defective items are removed from future selection. Preserve historical attempt versions. When correction changes a past result, show the reason and retain an audit record. Do not quietly change a student's answer history.

**18. Meaningful end-to-end verification**

Verify the full student experience with real content:

- Both starting-subject choices; exactly 50 items per subject on a complete attempt; correct handling of ELA set sizes.
- Locked Math/stand-alone answers; editable current ELA set; locked submitted sets and subjects; unavailable prohibited navigation.
- No diagnostic feedback leakage before completion.
- Every supported response format, including full required selections, equivalent numeric forms, and keyboard operation.
- A finish button that submits once, saves the completed attempt, and reliably opens results.
- Timer expiry, partial attempts, refresh recovery, background tabs, online grading, optional offline study-pack behavior, and duplicate-tab handling.
- Every missed question opening its full explanation and selecting two valid related questions.
- Shared database persistence across accounts/devices, role-scoped export/import validation, pack updates, and preservation of historical question versions.
- Grade-track separation and prevention of out-of-scope sampling.
- Score estimation eligibility, a validated estimate fixture, section and total reporting, missing calibration, uncertainty display, model-version persistence, authorized report access, staff personal attempts, and protection against plausible-looking fabricated scores.
- Narrow screens, long passages, diagrams, poetry, mathematical rendering, and large content packs.

Use a fixed test clock to verify expiry rather than waiting three hours. For persistence, save the current item/set before advancing and preserve the session seed, selected content versions, committed responses, adaptive state, and deadline. Recovery must never replace a student's served question with a regenerated different one.

For graded diagnostics and assignments, these records and the deadline are server-authoritative. Test state must be recoverable after logging in again on an authorized device. An unconfirmed local draft is not a confirmed graded response; clearly indicate connectivity problems and use a documented teacher-review policy for interrupted attempts rather than silently backdating late submissions.

**19. Deliverables and completion criteria**

Deliver the functioning public tutoring website and protected learning portal, source code, database schema/migrations, first-administrator setup and account-provisioning instructions, working role dashboards, immediate role-scoped account revocation/restoration, enrollment/class/assignment flows, custom-titled homework and classwork, full personal learning workspaces for teachers/administrators, the working score-estimate module and honest calibration/eligibility reporting, curriculum registry, approved passage/question packs, math blueprints, import/authoring tools, content and coverage reports, provenance/license records, backup/restore guidance, and verification results.

Also provide a factual list of remaining limitations: any unverified interaction, unresolved curriculum alignment, editorial-review gap, question-count shortfall, or uncalibrated score estimate. Do not mark a partly populated bank or an unsupported estimate as complete.

Work in runnable increments: authentication/permissions and the persistent data model; public enrollment/contact pages and role dashboards; curriculum and validation foundations; question systems and explanations; class/assignment and study flows; full diagnostic; adaptive selection/reporting; expanded content and final verification. Begin implementing after inspecting the project. Make reasonable reversible technical choices without repeatedly asking for approval. Do not deploy externally, provision paid services, add payment processing, or collect student information beyond the authorized enrollment/learning requirements as an unrequested step.

The final experience should let a family request enrollment by signup or call/text, authorized staff provision custom logins and revoke access within their permissions, and teachers/administrators create homework and classwork with their own custom titles. Enrolled students and active staff using My Learning can answer SHSAT questions, take a realistic current-format diagnostic, receive eligible practice score estimates or a clear calibration status, understand every mistake, practice two suitable follow-up questions for each error, and continue targeted SHSAT preparation without any AI service dependency or website payment processing.

**Official references to inspect and keep linked**

- [Current NYCPS SHSAT format and scoring](https://www.schools.nyc.gov/learning/testing/specialized-high-school-admissions-test)
- [Current SHSAT preparation guidance](https://www.schools.nyc.gov/learning/testing/how-to-prepare-for-the-specialized-high-schools-admissions-test1)
- [NYC Guide to the SHSAT for 2027 Admissions](https://pwsblobprd.schools.nyc/prd-pws/docs/default-source/default-document-library/nyc-guide-to-the-shsat-for-2027-admissions.pdf?sfvrsn=1eb0225c_8)
- [Official digital practice tests and explanations](https://nycshsat.myassessmentsupport.com/practice-tests/)
- [Official Student Readiness Tool](https://srt.testnav.com/ny-shsat/ny-shsat-srt.html)
- [Official technology-enhanced item demonstrations](https://pwsblobprd.schools.nyc/prd-pws/docs/default-source/default-document-library/tei-screenshots-for-doe-final-w-logo-01-31-25.pdf)
- [NYSED mathematics standards](https://www.nysed.gov/standards-instruction/mathematics)
- [NYSED ELA standards](https://www.nysed.gov/standards-instruction/english-language-arts)
- [NYSED mathematics guidance and resources](https://www.nysed.gov/standards-instruction/mathematics-guidance-resources)
- [NYSED ELA guidance and resources](https://www.nysed.gov/standards-instruction/ela-guidance-resources)
- [Project Gutenberg reuse and permissions](https://www.gutenberg.org/policy/permission.html)
- [Project Gutenberg license details](https://www.gutenberg.org/policy/license)
- [Standard Ebooks rights information](https://standardebooks.org/about/standard-ebooks-and-the-public-domain)
- [OWASP password storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
