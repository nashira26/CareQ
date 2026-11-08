# CareQ evaluation results

- **Date:** 2026-11-08 17:47 UTC (took 11 min)
- **Server:** http://localhost:3199 · data mode mongo · answer caches off (AI_CACHE=off)
- **Configured models:** primary gemini-3.5-flash, fast gemini-3.5-flash-lite (Ask CareQ, Prepare and follow-ups use the fast one first); embeddings gemini-embedding-2
- **Answered by (this run):** gemini-3.5-flash-lite, rule (no model), gemini-3.5-flash
- **Pacing:** 10 s between AI requests · inputs: eval/questions.json, eval/labels/*.json, eval/tone_messages.json

## Summary

| Check | Result | Target |
| --- | --- | --- |
| Ask CareQ: answerable questions answered from the right document | 9/10 | 10/10 |
| Ask CareQ: right page (±1) | 9/10 | 10/10 |
| Ask CareQ: correct refusals | 7/10 | 10/10 |
| Ask CareQ: quotes verbatim in the cited passage (re-checked) | 14/14 | all |
| Ask CareQ: server time, median / max | 2.0 s / 3.0 s | |
| Ask CareQ: answered by | gemini-3.5-flash-lite 17, rule (no model) 3 | |
| Requirements, child-development-institute: found / missed / repeats / no label | 5/5 found · 0 missed · 3 repeats · 6 with no label | all found |
| Requirements, rolph-road-day-care: found / missed / repeats / no label | 1/1 found · 0 missed · 0 repeats · 6 with no label | all found |
| Requirements, toronto-early-learning-child-care-services: found / missed / repeats / no label | 2/6 found · 4 missed · 0 repeats · 6 with no label | all found |
| Requirements: quotes verbatim (re-checked) | 29/29 | all |
| Prepare with AI: "ready" without a matching document | 0 (in 16 runs) | 0 |
| Prepare with AI: checklist items outside the confirmed list | 0 | 0 |
| Tone check: harsh messages flagged | 8/8 | all |
| Tone check: false alarms / misses | 0 / 0 | 0 / 0 |

## Worst failures

1. **Ask CareQ answered a question it should refuse (r7: "How much will fees be next year?")**  
   Got: "Fees vary by age group and program including infant, toddler, preschool, kindergarten and school aged programs. See Appendix A for your centre fees." · sources: macaulay-centres-for-children p.26, macaulay-centres-for-children p.26 · gemini-3.5-flash-lite
2. **Ask CareQ answered a question it should refuse (r8: "Can I skip the waitlist if I pay extra?")**  
   Got: "There is no fee to place your child on our waitlist." · sources: child-development-institute p.26 · gemini-3.5-flash-lite
3. **Ask CareQ answered a question it should refuse (r10: "Will my fee subsidy application be approved?")**  
   Got: "Families requiring a fee subsidy must be approved for placement by Children’s Services’ Client Services Unit." · sources: toronto-early-learning-child-care-services p.13 · gemini-3.5-flash-lite

(5 failures in total; all are in the tables below.)

## 1. Ask CareQ

Correct answer = answered with at least one citation from the labelled operator's document. Page ±1 = a citation from that document within one page of a labelled page. Correct refusal = the standard "I don't have that information" reply with no citations. Quotes are re-checked against the stored passage text in MongoDB (whitespace, curly quotes, dashes and case unified). The answer's wording is not graded.

| ID | Question | Expected | Answer | Sources (operator, page) | Doc | Page ±1 | Quotes | Answered by | Time | Pass |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| a1 | How much notice do I need to give to withdraw my child? | answer (toronto-early-learning-child-care-services p.20/53) | Clients are required to give two (2) weeks written notice when withdrawing their child/children from care. | toronto-early-learning-child-care-services p.53 | yes | yes | 1/1 | gemini-3.5-flash-lite | 2.9 s | ✅ |
| a2 | What immunization records does the centre need? | answer (toronto-early-learning-child-care-services p.14) | Licensed child care centres are required to collect and retain up-to-date immunization for all children not attending school. | toronto-early-learning-child-care-services p.14 | yes | yes | 1/1 | gemini-3.5-flash-lite | 1.8 s | ✅ |
| a3 | What are the centre's hours? | answer (toronto-early-learning-child-care-services p.15) | Toronto Early Learning and Child Care Centres operate between 7:00 a.m. and 6:00 p.m., Monday to Friday, excluding statutory holidays. | toronto-early-learning-child-care-services p.15 | yes | yes | 1/1 | gemini-3.5-flash-lite | 1.8 s | ✅ |
| a4 | How do I put my child on the waitlist or apply for a fee subsidy? | answer (toronto-early-learning-child-care-services p.13) | To place your child on the waitlist or apply for a fee subsidy, you can visit toronto.ca/telccs or toronto.ca/childcaresubsidy. You can also contact the Human Services Line at 416-338-8888 (select option 2 for child care… | toronto-early-learning-child-care-services p.12 | yes | yes | 2/2 | gemini-3.5-flash-lite | 1.7 s | ✅ |
| a5 | What documents do I need to give the centre before my child starts? | answer (child-development-institute p.13) | Before your child starts, you must complete a registration package and signed parent contract, along with emergency contact information and pick-up instructions. You also need to provide a copy of your child's immunizati… | child-development-institute p.13 | yes | yes | 1/1 | gemini-3.5-flash-lite | 2.1 s | ✅ |
| a6 | How are families placed on the waitlist? | answer (child-development-institute p.26/27) | Families are placed on the waitlist by date of contact. | child-development-institute p.26 | yes | yes | 1/1 | gemini-3.5-flash-lite | 1.6 s | ✅ |
| a7 | How much notice do you give before a fee increase? | answer (child-development-institute p.14) | Notice of fee increases are distributed at least 30 days before the increase comes into effect. | child-development-institute p.14 | yes | yes | 1/1 | gemini-3.5-flash-lite | 1.4 s | ✅ |
| a8 | What happens if I don't give two weeks' notice when withdrawing? | answer (macaulay-centres-for-children p.28) | If notice is not received, you will be charged your regular fee for the two weeks. | macaulay-centres-for-children p.28 | yes | yes | 1/1 | gemini-3.5-flash-lite | 1.7 s | ✅ |
| a9 | How long does my child stay on the waitlist? | answer (macaulay-centres-for-children p.29) | To request an extension to remain on the waitlist, please contact the child care centre. | macaulay-centres-for-children p.28 | yes | yes | 1/1 | gemini-3.5-flash-lite | 1.9 s | ✅ |
| a10 | What should I pack for outdoor play? | answer (macaulay-centres-for-children p.20) | I don't have that information; please contact the centre or use Help. | - | no | no | - | gemini-3.5-flash-lite | 2.2 s | ❌ |
| r1 | When will I get a spot? | refuse | I don't have that information; please contact the centre or use Help. | - | - | - | - | rule (no model) | 0.0 s | ✅ |
| r2 | Is there a space available next week? | refuse | I don't have that information; please contact the centre or use Help. | - | - | - | - | rule (no model) | 0.0 s | ✅ |
| r3 | Where am I on the waitlist? | refuse | I don't have that information; please contact the centre or use Help. | - | - | - | - | rule (no model) | 0.0 s | ✅ |
| r4 | Which centre is the best one for my child? | refuse | I don't have that information; please contact the centre or use Help. | - | - | - | - | gemini-3.5-flash-lite | 2.5 s | ✅ |
| r5 | What is the director's personal phone number? | refuse | I don't have that information; please contact the centre or use Help. | - | - | - | - | gemini-3.5-flash-lite | 2.5 s | ✅ |
| r6 | Do you offer swimming lessons? | refuse | I don't have that information; please contact the centre or use Help. | - | - | - | - | gemini-3.5-flash-lite | 2.8 s | ✅ |
| r7 | How much will fees be next year? | refuse | Fees vary by age group and program including infant, toddler, preschool, kindergarten and school aged programs. See Appendix A for your centre fees. | macaulay-centres-for-children p.26 | - | - | 2/2 | gemini-3.5-flash-lite | 2.7 s | ❌ |
| r8 | Can I skip the waitlist if I pay extra? | refuse | There is no fee to place your child on our waitlist. | child-development-institute p.26 | - | - | 1/1 | gemini-3.5-flash-lite | 3.0 s | ❌ |
| r9 | Is the neighbourhood around the centre safe? | refuse | I don't have that information; please contact the centre or use Help. | - | - | - | - | gemini-3.5-flash-lite | 2.4 s | ✅ |
| r10 | Will my fee subsidy application be approved? | refuse | Families requiring a fee subsidy must be approved for placement by Children’s Services’ Client Services Unit. | toronto-early-learning-child-care-services p.13 | - | - | 1/1 | gemini-3.5-flash-lite | 2.4 s | ❌ |

## 2. Requirement extraction vs labels

Labels are matched to extracted requirements by meaning: gemini-embedding-2 embeddings (task SEMANTIC_SIMILARITY), cosine ≥ 0.75, one-to-one, highest first. "Repeat" means an extra item that matches a label already paired (cosine ≥ the threshold). "No label" means an extracted requirement no label matched; the labels list documents only, so waitlist or registration steps the reader finds also land here. Every extracted item carries a quote verified verbatim in the handbook.

### child-development-institute (signed in as the demo account of on-0002899; gemini-3.5-flash, 12.1 s)

| Label | Extracted | Cosine | |
| --- | --- | --- | --- |
| Registration Package and Signed Parent Contract | Registration Package and Signed Parent Contract | 1.000 | found |
| Copy of Immunization Record | Copy of Immunization Record | 1.000 | found |
| Signed Consent Forms (those that are applicable) | Signed Consent Forms | 0.905 | found |
| Emergency Contact Information | Emergency Contact Information | 1.000 | found |
| Pick Up Instructions | Pick Up Instructions | 1.000 | found |
| (nearest: Registration Package and Signed Parent Contract) | Fee subsidy approval [admission, PDF p.26] “Families requiring a fee subsidy must be approved for placement by Children’s Services before being placed.” | 0.739 | no label |
| (nearest: Registration Package and Signed Parent Contract) | CDI online waitlist [waitlist, PDF p.26] “Once placed on the subsidy waitlist, families will need to fill out CDI’s online waitlist.” | 0.643 | no label |
| (nearest: Emergency Contact Information) | Current contact information [waitlist, PDF p.26] “It is the family’s responsibility to keep their information current with us, especially their phone number.” | 0.731 | no label |
| (nearest: Signed Consent Forms (those that are applicable)) | Periodic follow-up calls [waitlist, PDF p.26] “It is the family’s responsibility to call us to let us know if they are still interested in a childcare space” | 0.661 | no label |
| (nearest: Registration Package and Signed Parent Contract) | Response to space offer within 24 hours [waitlist, PDF p.26] “When a space is offered, the family will have 24 hours to respond.” | 0.645 | no label |
| (nearest: Registration Package and Signed Parent Contract) | Legal documentation for custody and access [documents, PDF p.13] “Please be prepared to provide legal documentation for custody and access arrangements.” | 0.690 | no label |
| (nearest: Copy of Immunization Record) | Proof of immunization prior to enrolment [admission, PDF p.13] “Proof of immunization must be shown prior to the enrolment of a child in the Centre.” | 0.842 | repeat of a found label |
| (nearest: Copy of Immunization Record) | Immunization Objections or Exemptions forms [documents, PDF p.13] “Objections or Exemptions must be completed on the approved forms provided by the Centre Director and must be submitted prior to admission.” | 0.855 | repeat of a found label |
| (nearest: Emergency Contact Information) | Emergency contact name and details [admission, PDF p.13] “Parents must provide the Centre with the name and contact information of at least one person if the parent/guardian is unavailable or cannot be reached.” | 0.902 | repeat of a found label |

### rolph-road-day-care (signed in as the demo account of on-0002575; gemini-3.5-flash-lite, 3.2 s)

| Label | Extracted | Cosine | |
| --- | --- | --- | --- |
| Waiting list application form(our website or by email or dropped off in person at 206 Laird Drive.) | Waiting list application form | 0.813 | found |
| (nearest: Waiting list application form(our website or by email or dropped off in person at 206 Laird Drive.)) | Deposit [admission, 8. Admission Policy] “a deposit and will be required to guarantee your spot” | 0.575 | no label |
| (nearest: Waiting list application form(our website or by email or dropped off in person at 206 Laird Drive.)) | Application package forms [registration, 8. Admission Policy] “All relevant forms are required to be filled out before your child's start date.” | 0.683 | no label |
| (nearest: Waiting list application form(our website or by email or dropped off in person at 206 Laird Drive.)) | Parent and Child Code of Conduct [registration, 39. PARENT AND CHILD CODE OF CONDUCT] “Children and parents are required to sign and abide by the “Parent and Child Code of Conduct”.” | 0.566 | no label |
| (nearest: Waiting list application form(our website or by email or dropped off in person at 206 Laird Drive.)) | Doctor note for communicable disease [admission, 31. Illnesses and Accident] “A DOCTORS NOTE MAY BE REQUIRED FOR RE-ADMITTANCE INTO THE DAYCARE PROGRAM.” | 0.647 | no label |
| (nearest: Waiting list application form(our website or by email or dropped off in person at 206 Laird Drive.)) | Doctor note for rash or skin infection [admission, 31. Illnesses and Accident] “A DOCTOR'S NOTE STATING THAT THE CONDITION IS NOT CONTAGIOUS IS REQUIRED” | 0.616 | no label |
| (nearest: Waiting list application form(our website or by email or dropped off in person at 206 Laird Drive.)) | Health and Safety Declarations [admission, Health and Safety Declarations] “parents may be required to sign a declaration confirming that they have not traveled” | 0.555 | no label |

### toronto-early-learning-child-care-services (signed in as the demo account of on-00576; gemini-3.5-flash, 12.3 s)

| Label | Extracted | Cosine | |
| --- | --- | --- | --- |
| emergency contact information | Emergency contact information | 0.891 | found |
| child's immunization record | Up-to-date immunization information | 0.780 | found |
| parent contact information | (nearest: Emergency contact information) | 0.652 | **missed** |
| child's doctor's contact information | (nearest: Emergency contact information) | 0.610 | **missed** |
| health related information | (nearest: Up-to-date immunization information) | 0.685 | **missed** |
| pick up instructions | (nearest: Agreement to Pay the Assessed Fee Form) | 0.521 | **missed** |
| (nearest: parent contact information) | Waitlist registration [waitlist, PDF p.12] “To place your child(ren) on the waitlist for a TELCCS centre(s) and/or to apply for a fee subsidy, please visit toronto.ca/telccs” | 0.578 | no label |
| (nearest: child's immunization record) | Fee subsidy approval [admission, PDF p.13] “Families requiring a fee subsidy must be approved for placement by Children’s Services’ Client Services Unit.” | 0.610 | no label |
| (nearest: health related information) | Pre-admission meeting [admission, PDF p.13] “the Centre Supervisor will schedule a meeting with the parent(s)/guardian prior to admission to the centre.” | 0.559 | no label |
| (nearest: child's immunization record) | TELCCS Child Admission Package [documents, PDF p.51] “The TELCCS Child Admission Package must be completed by the client and reviewed by the supervisor” | 0.554 | no label |
| (nearest: parent contact information) | Agreement to Pay the Assessed Fee Form [documents, PDF p.51] “A copy of the Agreement to Pay the Assessed Fee Form signed by the client must be sent to Central Billing Unit” | 0.566 | no label |
| (nearest: child's immunization record) | Immunization medical exemption [documents, PDF p.14] “Written medical exemption by a qualified medical practitioner, which clearly states the medical reasons why a child cannot be immunized” | 0.727 | no label |

## 3. Prepare with AI safety

Each demo centre runs twice, as Priya (simulated parent): with no documents, and with two unattached files: one named after the centre's first confirmed requirement and a decoy ("family-vacation-photo.jpg"). A "ready" counts as without a matching document if it has no file, a file that was not uploaded, the decoy, or the named file on a different requirement. Results are what the parent sees (after the app's guardrails in src/lib/prepareApplication.ts), not the raw model output.

| Centre | Scenario | Checklist (status) | "Ready" without match | Outside list | Answered by | Time |
| --- | --- | --- | --- | --- | --- | --- |
| CareQ Demo Centre (fictional) | no documents | Child's Birth Certificate: missing; Yellow Immunization Card (ISPA): missing; Proof of Toronto Residency: missing; Emergency Contact & Medical Consent Form: missing | 0 | 0 | gemini-3.5-flash-lite | 1.2 s |
| CareQ Demo Centre (fictional) | "child-s-birth-certificate.pdf" + decoy | Child's Birth Certificate: ready ← child-s-birth-certificate.pdf; Yellow Immunization Card (ISPA): missing; Proof of Toronto Residency: missing; Emergency Contact & Medical Consent Form: missing | 0 | 0 | gemini-3.5-flash-lite | 1.1 s |
| Jesse Ketchum Early Learning & Child Care Centre | no documents | Child Admission Package: missing; Emergency contact information: missing; Up-to-date immunization information: missing; Custody documents (if applicable): missing | 0 | 0 | gemini-3.5-flash-lite | 1.4 s |
| Jesse Ketchum Early Learning & Child Care Centre | "child-admission-package.pdf" + decoy | Child Admission Package: ready ← child-admission-package.pdf; Emergency contact information: missing; Up-to-date immunization information: missing; Custody documents (if applicable): missing | 0 | 0 | gemini-3.5-flash-lite | 1.1 s |
| Wellesley Early Learning Centre - Earlscourt Creche Cdi - 495 Sherbourne Street | no documents | Registration Package and Signed Parent Contract: missing; Copy of Immunization Record: missing; Signed Consent Forms (those that are applicable): missing; Emergency Contact Information: missing; Pick Up Instructions: missing; Preauthorized Debit form: missing | 0 | 0 | gemini-3.5-flash-lite | 1.3 s |
| Wellesley Early Learning Centre - Earlscourt Creche Cdi - 495 Sherbourne Street | "registration-package-and-signed-parent-c.pdf" + decoy | Registration Package and Signed Parent Contract: ready ← registration-package-and-signed-parent-c.pdf; Copy of Immunization Record: missing; Signed Consent Forms (those that are applicable): missing; Emergency Contact Information: missing; Pick Up Instructions: missing; Preauthorized Debit form: missing | 0 | 0 | gemini-3.5-flash-lite | 1.0 s |
| Macaulay - Dovercourt Child Care Centre | no documents | Child registration forms: missing; Admission forms, including immunization records: missing; Up-to-date immunizations: missing | 0 | 0 | gemini-3.5-flash-lite | 1.1 s |
| Macaulay - Dovercourt Child Care Centre | "child-registration-forms.pdf" + decoy | Child registration forms: ready ← child-registration-forms.pdf; Admission forms, including immunization records: missing; Up-to-date immunizations: missing | 0 | 0 | gemini-3.5-flash-lite | 1.3 s |
| Leaside Day Care Centre (Rolph Road Day Care) | no documents | Waiting list application form: missing; Deposit to guarantee your spot: missing; Application package forms: missing | 0 | 0 | gemini-3.5-flash-lite | 1.0 s |
| Leaside Day Care Centre (Rolph Road Day Care) | "waiting-list-application-form.pdf" + decoy | Waiting list application form: ready ← waiting-list-application-form.pdf; Deposit to guarantee your spot: missing; Application package forms: missing | 0 | 0 | gemini-3.5-flash-lite | 1.0 s |
| Harmony Child Care Centre (Harmony Community School Centre) 124 Northcliffe Blvd | no documents | Registration forms, including the medical: missing; First payment of care: missing; Immunization Information Form & copy of Yellow Immunization Card: missing; Emergency Contact Information Form: missing; Medical and Health Care Information Form: missing | 0 | 0 | gemini-3.5-flash-lite | 1.3 s |
| Harmony Child Care Centre (Harmony Community School Centre) 124 Northcliffe Blvd | "registration-forms-including-the-medical.pdf" + decoy | Registration forms, including the medical: ready ← registration-forms-including-the-medical.pdf; First payment of care: missing; Immunization Information Form & copy of Yellow Immunization Card: missing; Emergency Contact Information Form: missing; Medical and Health Care Information Form: missing | 0 | 0 | gemini-3.5-flash-lite | 1.2 s |
| B.F. Toronto Centre For Early Childhood (45 Golfdown) | no documents | Registration Fee ($25.00, non-refundable): missing; Registration and Immunization Forms: missing; Toronto Public Health Immunization Form with your child's immunization record: missing | 0 | 0 | gemini-3.5-flash-lite | 1.1 s |
| B.F. Toronto Centre For Early Childhood (45 Golfdown) | "registration-fee-25-00-non-refundable.pdf" + decoy | Registration Fee ($25.00, non-refundable): ready ← registration-fee-25-00-non-refundable.pdf; Registration and Immunization Forms: missing; Toronto Public Health Immunization Form with your child's immunization record: missing | 0 | 0 | gemini-3.5-flash-lite | 1.1 s |
| Family Day Care Services - Mary Ward Child Care Centre | no documents | Proof of immunization (or a completed standard exemption form): missing; Emergency contact information: missing | 0 | 0 | gemini-3.5-flash-lite | 1.1 s |
| Family Day Care Services - Mary Ward Child Care Centre | "proof-of-immunization-or-a-completed-sta.pdf" + decoy | Proof of immunization (or a completed standard exemption form): ready ← proof-of-immunization-or-a-completed-sta.pdf; Emergency contact information: missing | 0 | 0 | gemini-3.5-flash-lite | 1.0 s |

## 4. Tone check

| Message | Role | Label | Flagged | Result | Reason given | Answered by |
| --- | --- | --- | --- | --- | --- | --- |
| Hi, could you let me know if you need any other documents for Anya's application? Thank you! | parent | ok | no | correct pass |  | gemini-3.5-flash |
| Thanks for the update on our position. We're still very interested in a spot. | parent | ok | no | correct pass |  | gemini-3.5-flash |
| Hello, I wanted to confirm you received our application last week. Have a great day. | parent | ok | no | correct pass |  | gemini-3.5-flash |
| We'd love to accept the offer. What are the next steps before her first day? | parent | ok | no | correct pass |  | gemini-3.5-flash |
| Could we book a tour sometime next week? Any afternoon works for us. | parent | ok | no | correct pass |  | gemini-3.5-flash |
| Sorry for the late reply. Here is the immunization record you asked for. | parent | ok | no | correct pass |  | gemini-3.5-flash |
| Is there anything we can do to keep our application up to date while we wait? | parent | ok | no | correct pass |  | gemini-3.5-flash-lite |
| We've found care elsewhere, so please remove us from the waitlist. Thank you for your help. | parent | ok | no | correct pass |  | gemini-3.5-flash |
| Hi Priya, thanks for applying. We'll be in touch as soon as we have an update. | centre | ok | no | correct pass |  | gemini-3.5-flash-lite |
| Your application is complete. Please let us know if anything changes. | centre | ok | no | correct pass |  | gemini-3.5-flash |
| Just checking in again on our application, as our return-to-work date is getting close. | parent | ok | no | correct pass |  | gemini-3.5-flash-lite |
| Could you clarify what the deposit covers? We want to be sure we understand. | parent | ok | no | correct pass |  | gemini-3.5-flash-lite |
| This is ridiculous. I've emailed three times and nobody answers. Do your job. | parent | harsh | yes | correct flag | The message uses insulting language and a demanding tone, which comes across as aggressive and confrontational. | gemini-3.5-flash-lite |
| I need a spot by Monday. No excuses. | parent | harsh | yes | correct flag | The phrase 'No excuses' alongside the abrupt demand creates an aggressive and confrontational tone. | gemini-3.5-flash |
| If you don't move us up the list I'll post a review telling everyone how useless you are. | parent | harsh | yes | correct flag | The message uses a direct threat of a negative public review and insults the centre's staff, which is aggressive and unprofessional. | gemini-3.5-flash-lite |
| Why is it so hard for you people to answer a simple question? | parent | harsh | yes | correct flag | The phrase 'Why is it so hard for you people' is confrontational and disparaging. | gemini-3.5-flash-lite |
| Answer me today or I'm calling my lawyer. | parent | harsh | yes | correct flag | The message uses an aggressive ultimatum and a threat of legal action to demand an immediate response. | gemini-3.5-flash |
| Your waitlist is a joke. Fix it. | parent | harsh | yes | correct flag | The message uses dismissive language and a demanding imperative that comes across as aggressive and confrontational. | gemini-3.5-flash-lite |
| Stop emailing us. We already told you there are no spaces. | centre | harsh | yes | correct flag | The phrase 'Stop emailing us' is abrupt and dismissive, which comes across as confrontational and rude. | gemini-3.5-flash-lite |
| Honestly, your centre is the worst I've dealt with and I expect an answer immediately. | parent | harsh | yes | correct flag | The message uses overly harsh generalizations and a demanding tone. | gemini-3.5-flash |

## Raw outputs

Full responses as returned by the server (also in eval/raw/*.json; server log in eval/raw/server.log when the script started the server).

<details><summary>Ask CareQ</summary>

```json
[
  {
    "id": "a1",
    "question": "How much notice do I need to give to withdraw my child?",
    "centreId": "on-00576",
    "response": {
      "success": true,
      "answer": "Clients are required to give two (2) weeks written notice when withdrawing their child/children from care.",
      "citations": [
        {
          "kind": "document",
          "chunkId": "toronto-early-learning-child-care-services/handbook.pdf#169",
          "scope": "operator",
          "operatorName": "Toronto Early Learning & Child Care Services (City of Toronto)",
          "docTitle": "Parent Handbook (March 2026)",
          "page": "PDF p.53",
          "sourceUrl": "https://www.toronto.ca/wp-content/uploads/2026/04/95b1-parenthandbook2026.pdf",
          "sourceNote": "Exact file",
          "quote": "Clients are required to give two (2) weeks written notice when withdrawing their child/children from care."
        }
      ],
      "toolsUsed": [
        "search_documents"
      ],
      "retrievalMode": "vector",
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "latencyMs": 2893
    }
  },
  {
    "id": "a2",
    "question": "What immunization records does the centre need?",
    "centreId": "on-00576",
    "response": {
      "success": true,
      "answer": "Licensed child care centres are required to collect and retain up-to-date immunization for all children not attending school.",
      "citations": [
        {
          "kind": "document",
          "chunkId": "toronto-early-learning-child-care-services/handbook.pdf#32",
          "scope": "operator",
          "operatorName": "Toronto Early Learning & Child Care Services (City of Toronto)",
          "docTitle": "Parent Handbook (March 2026)",
          "page": "PDF p.14",
          "sourceUrl": "https://www.toronto.ca/wp-content/uploads/2026/04/95b1-parenthandbook2026.pdf",
          "sourceNote": "Exact file",
          "quote": "Licensed child care centres are required to collect and retain up-to-date immunization for all children not attending school."
        }
      ],
      "toolsUsed": [
        "search_documents"
      ],
      "retrievalMode": "vector",
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "latencyMs": 1834
    }
  },
  {
    "id": "a3",
    "question": "What are the centre's hours?",
    "centreId": "on-00576",
    "response": {
      "success": true,
      "answer": "Toronto Early Learning and Child Care Centres operate between 7:00 a.m. and 6:00 p.m., Monday to Friday, excluding statutory holidays.",
      "citations": [
        {
          "kind": "document",
          "chunkId": "toronto-early-learning-child-care-services/handbook.pdf#35",
          "scope": "operator",
          "operatorName": "Toronto Early Learning & Child Care Services (City of Toronto)",
          "docTitle": "Parent Handbook (March 2026)",
          "page": "PDF p.15",
          "sourceUrl": "https://www.toronto.ca/wp-content/uploads/2026/04/95b1-parenthandbook2026.pdf",
          "sourceNote": "Exact file",
          "quote": "Toronto Early Learning and Child Care Centres operate between 7:00 a.m. and 6:00 p.m., Monday to Friday, excluding statutory holidays."
        }
      ],
      "toolsUsed": [
        "search_documents"
      ],
      "retrievalMode": "vector",
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "latencyMs": 1752
    }
  },
  {
    "id": "a4",
    "question": "How do I put my child on the waitlist or apply for a fee subsidy?",
    "centreId": "on-00576",
    "response": {
      "success": true,
      "answer": "To place your child on the waitlist or apply for a fee subsidy, you can visit toronto.ca/telccs or toronto.ca/childcaresubsidy. You can also contact the Human Services Line at 416-338-8888 (select option 2 for child care), call 311, or contact your Children’s Services Caseworker.",
      "citations": [
        {
          "kind": "document",
          "chunkId": "toronto-early-learning-child-care-services/handbook.pdf#26",
          "scope": "operator",
          "operatorName": "Toronto Early Learning & Child Care Services (City of Toronto)",
          "docTitle": "Parent Handbook (March 2026)",
          "page": "PDF p.12",
          "sourceUrl": "https://www.toronto.ca/wp-content/uploads/2026/04/95b1-parenthandbook2026.pdf",
          "sourceNote": "Exact file",
          "quote": "To place your child(ren) on the waitlist for a TELCCS centre(s) and/or to apply for a fee subsidy, please visit toronto.ca/telccs"
        },
        {
          "kind": "document",
          "chunkId": "toronto-early-learning-child-care-services/handbook.pdf#26",
          "scope": "operator",
          "operatorName": "Toronto Early Learning & Child Care Services (City of Toronto)",
          "docTitle": "Parent Handbook (March 2026)",
          "page": "PDF p.12",
          "sourceUrl": "https://www.toronto.ca/wp-content/uploads/2026/04/95b1-parenthandbook2026.pdf",
          "sourceNote": "Exact file",
          "quote": "contact Human Services Line at 416-338-8888 (select option 2 for child care), 311, or if you have a Children’s Services Caseworker, contact them directly."
        }
      ],
      "toolsUsed": [
        "search_documents"
      ],
      "retrievalMode": "vector",
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "latencyMs": 1671
    }
  },
  {
    "id": "a5",
    "question": "What documents do I need to give the centre before my child starts?",
    "centreId": "on-0002899",
    "response": {
      "success": true,
      "answer": "Before your child starts, you must complete a registration package and signed parent contract, along with emergency contact information and pick-up instructions. You also need to provide a copy of your child's immunization record and any applicable signed consent forms.",
      "citations": [
        {
          "kind": "document",
          "chunkId": "child-development-institute/handbook.pdf#27",
          "scope": "operator",
          "operatorName": "Child Development Institute (CDI Early Learning Centres)",
          "docTitle": "Family Handbook (revised January 1, 2025)",
          "page": "PDF p.13",
          "sourceUrl": "https://www.childdevelop.ca",
          "sourceNote": "Website named in the handbook; exact file link not found.",
          "quote": "• Registration Package and Signed Parent Contract • Copy of Immunization Record • Signed Consent Forms (those that are applicable) • Emergency Contact Information •…"
        }
      ],
      "toolsUsed": [
        "search_documents"
      ],
      "retrievalMode": "vector",
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "latencyMs": 2136
    }
  },
  {
    "id": "a6",
    "question": "How are families placed on the waitlist?",
    "centreId": "on-0002899",
    "response": {
      "success": true,
      "answer": "Families are placed on the waitlist by date of contact.",
      "citations": [
        {
          "kind": "document",
          "chunkId": "child-development-institute/handbook.pdf#97",
          "scope": "operator",
          "operatorName": "Child Development Institute (CDI Early Learning Centres)",
          "docTitle": "Family Handbook (revised January 1, 2025)",
          "page": "PDF p.26",
          "sourceUrl": "https://www.childdevelop.ca",
          "sourceNote": "Website named in the handbook; exact file link not found.",
          "quote": "Families are placed on the waitlist by date of contact."
        }
      ],
      "toolsUsed": [
        "search_documents"
      ],
      "retrievalMode": "vector",
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "latencyMs": 1552
    }
  },
  {
    "id": "a7",
    "question": "How much notice do you give before a fee increase?",
    "centreId": "on-0002899",
    "response": {
      "success": true,
      "answer": "Notice of fee increases are distributed at least 30 days before the increase comes into effect.",
      "citations": [
        {
          "kind": "document",
          "chunkId": "child-development-institute/handbook.pdf#35",
          "scope": "operator",
          "operatorName": "Child Development Institute (CDI Early Learning Centres)",
          "docTitle": "Family Handbook (revised January 1, 2025)",
          "page": "PDF p.14",
          "sourceUrl": "https://www.childdevelop.ca",
          "sourceNote": "Website named in the handbook; exact file link not found.",
          "quote": "Notice of fee increases are distributed at least 30 days before the increase comes into effect."
        }
      ],
      "toolsUsed": [
        "search_documents"
      ],
      "retrievalMode": "vector",
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "latencyMs": 1361
    }
  },
  {
    "id": "a8",
    "question": "What happens if I don't give two weeks' notice when withdrawing?",
    "centreId": "on-0004062",
    "response": {
      "success": true,
      "answer": "If notice is not received, you will be charged your regular fee for the two weeks.",
      "citations": [
        {
          "kind": "document",
          "chunkId": "macaulay-centres-for-children/handbook.pdf#96",
          "scope": "operator",
          "operatorName": "Macaulay Centres for Children",
          "docTitle": "Parent Handbook (January 2024)",
          "page": "PDF p.28",
          "sourceUrl": "https://macaulaycentre.org/services/licensed-child-care/licensed-child-care-centres",
          "sourceNote": "Operator page for its licensed centres; exact file link not found.",
          "quote": "If notice is not received, you will be charged your regular fee for the two weeks."
        }
      ],
      "toolsUsed": [
        "search_documents"
      ],
      "retrievalMode": "vector",
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "latencyMs": 1749
    }
  },
  {
    "id": "a9",
    "question": "How long does my child stay on the waitlist?",
    "centreId": "on-0004062",
    "response": {
      "success": true,
      "answer": "To request an extension to remain on the waitlist, please contact the child care centre.",
      "citations": [
        {
          "kind": "document",
          "chunkId": "macaulay-centres-for-children/handbook.pdf#101",
          "scope": "operator",
          "operatorName": "Macaulay Centres for Children",
          "docTitle": "Parent Handbook (January 2024)",
          "page": "PDF p.28",
          "sourceUrl": "https://macaulaycentre.org/services/licensed-child-care/licensed-child-care-centres",
          "sourceNote": "Operator page for its licensed centres; exact file link not found.",
          "quote": "To request an extension to remain on the waitlist, please contact the child care centre."
        }
      ],
      "toolsUsed": [
        "search_documents"
      ],
      "retrievalMode": "vector",
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "latencyMs": 1860
    }
  },
  {
    "id": "a10",
    "question": "What should I pack for outdoor play?",
    "centreId": "on-0004062",
    "response": {
      "success": true,
      "answer": "I don't have that information; please contact the centre or use Help.",
      "citations": [],
      "toolsUsed": [
        "search_documents"
      ],
      "retrievalMode": "vector",
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "latencyMs": 2182
    }
  },
  {
    "id": "r1",
    "question": "When will I get a spot?",
    "centreId": "on-00576",
    "response": {
      "success": true,
      "toolsUsed": [],
      "retrievalMode": "none",
      "aiMode": "rule",
      "modelUsed": null,
      "answer": "I don't have that information; please contact the centre or use Help.",
      "citations": [],
      "latencyMs": 0
    }
  },
  {
    "id": "r2",
    "question": "Is there a space available next week?",
    "centreId": "on-0004062",
    "response": {
      "success": true,
      "toolsUsed": [],
      "retrievalMode": "none",
      "aiMode": "rule",
      "modelUsed": null,
      "answer": "I don't have that information; please contact the centre or use Help.",
      "citations": [],
      "latencyMs": 0
    }
  },
  {
    "id": "r3",
    "question": "Where am I on the waitlist?",
    "centreId": "on-0002575",
    "response": {
      "success": true,
      "toolsUsed": [],
      "retrievalMode": "none",
      "aiMode": "rule",
      "modelUsed": null,
      "answer": "I don't have that information; please contact the centre or use Help.",
      "citations": [],
      "latencyMs": 0
    }
  },
  {
    "id": "r4",
    "question": "Which centre is the best one for my child?",
    "centreId": null,
    "response": {
      "success": true,
      "answer": "I don't have that information; please contact the centre or use Help.",
      "citations": [],
      "toolsUsed": [
        "search_documents"
      ],
      "retrievalMode": "vector",
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "latencyMs": 2516
    }
  },
  {
    "id": "r5",
    "question": "What is the director's personal phone number?",
    "centreId": "on-0002899",
    "response": {
      "success": true,
      "answer": "I don't have that information; please contact the centre or use Help.",
      "citations": [],
      "toolsUsed": [
        "search_documents"
      ],
      "retrievalMode": "vector",
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "latencyMs": 2531
    }
  },
  {
    "id": "r6",
    "question": "Do you offer swimming lessons?",
    "centreId": "on-00576",
    "response": {
      "success": true,
      "answer": "I don't have that information; please contact the centre or use Help.",
      "citations": [],
      "toolsUsed": [
        "search_documents"
      ],
      "retrievalMode": "vector",
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "latencyMs": 2840
    }
  },
  {
    "id": "r7",
    "question": "How much will fees be next year?",
    "centreId": "on-0004062",
    "response": {
      "success": true,
      "answer": "Fees vary by age group and program including infant, toddler, preschool, kindergarten and school aged programs. See Appendix A for your centre fees.",
      "citations": [
        {
          "kind": "document",
          "chunkId": "macaulay-centres-for-children/handbook.pdf#90",
          "scope": "operator",
          "operatorName": "Macaulay Centres for Children",
          "docTitle": "Parent Handbook (January 2024)",
          "page": "PDF p.26",
          "sourceUrl": "https://macaulaycentre.org/services/licensed-child-care/licensed-child-care-centres",
          "sourceNote": "Operator page for its licensed centres; exact file link not found.",
          "quote": "Fees vary by age group and program including infant, toddler, preschool, kindergarten and school aged programs."
        },
        {
          "kind": "document",
          "chunkId": "macaulay-centres-for-children/handbook.pdf#90",
          "scope": "operator",
          "operatorName": "Macaulay Centres for Children",
          "docTitle": "Parent Handbook (January 2024)",
          "page": "PDF p.26",
          "sourceUrl": "https://macaulaycentre.org/services/licensed-child-care/licensed-child-care-centres",
          "sourceNote": "Operator page for its licensed centres; exact file link not found.",
          "quote": "See Appendix A for your centre fees."
        }
      ],
      "toolsUsed": [
        "search_documents"
      ],
      "retrievalMode": "vector",
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "latencyMs": 2731
    }
  },
  {
    "id": "r8",
    "question": "Can I skip the waitlist if I pay extra?",
    "centreId": "on-0002899",
    "response": {
      "success": true,
      "answer": "There is no fee to place your child on our waitlist.",
      "citations": [
        {
          "kind": "document",
          "chunkId": "child-development-institute/handbook.pdf#94",
          "scope": "operator",
          "operatorName": "Child Development Institute (CDI Early Learning Centres)",
          "docTitle": "Family Handbook (revised January 1, 2025)",
          "page": "PDF p.26",
          "sourceUrl": "https://www.childdevelop.ca",
          "sourceNote": "Website named in the handbook; exact file link not found.",
          "quote": "There is no fee to place your child on our waitlist."
        }
      ],
      "toolsUsed": [
        "search_documents"
      ],
      "retrievalMode": "vector",
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "latencyMs": 2959
    }
  },
  {
    "id": "r9",
    "question": "Is the neighbourhood around the centre safe?",
    "centreId": "on-03394",
    "response": {
      "success": true,
      "answer": "I don't have that information; please contact the centre or use Help.",
      "citations": [],
      "toolsUsed": [
        "search_documents"
      ],
      "retrievalMode": "vector",
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "latencyMs": 2394
    }
  },
  {
    "id": "r10",
    "question": "Will my fee subsidy application be approved?",
    "centreId": "on-00576",
    "response": {
      "success": true,
      "answer": "Families requiring a fee subsidy must be approved for placement by Children’s Services’ Client Services Unit.",
      "citations": [
        {
          "kind": "document",
          "chunkId": "toronto-early-learning-child-care-services/handbook.pdf#27",
          "scope": "operator",
          "operatorName": "Toronto Early Learning & Child Care Services (City of Toronto)",
          "docTitle": "Parent Handbook (March 2026)",
          "page": "PDF p.13",
          "sourceUrl": "https://www.toronto.ca/wp-content/uploads/2026/04/95b1-parenthandbook2026.pdf",
          "sourceNote": "Exact file",
          "quote": "Families requiring a fee subsidy must be approved for placement by Children’s Services’ Client Services Unit."
        }
      ],
      "toolsUsed": [
        "search_documents"
      ],
      "retrievalMode": "vector",
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "latencyMs": 2423
    }
  }
]
```

</details>

<details><summary>Requirement extraction</summary>

```json
[
  {
    "operatorId": "child-development-institute",
    "centreId": "on-0002899",
    "response": {
      "success": true,
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash",
      "requirements": [
        {
          "requirement": "Fee subsidy approval",
          "category": "admission",
          "quote": "Families requiring a fee subsidy must be approved for placement by Children’s Services before being placed.",
          "chunkId": "child-development-institute/handbook.pdf#93",
          "docKey": "child-development-institute/handbook.pdf",
          "docTitle": "Family Handbook (revised January 1, 2025)",
          "page": "PDF p.26",
          "sourceUrl": "https://www.childdevelop.ca",
          "sourceNote": "Website named in the handbook; exact file link not found."
        },
        {
          "requirement": "CDI online waitlist",
          "category": "waitlist",
          "quote": "Once placed on the subsidy waitlist, families will need to fill out CDI’s online waitlist.",
          "chunkId": "child-development-institute/handbook.pdf#94",
          "docKey": "child-development-institute/handbook.pdf",
          "docTitle": "Family Handbook (revised January 1, 2025)",
          "page": "PDF p.26",
          "sourceUrl": "https://www.childdevelop.ca",
          "sourceNote": "Website named in the handbook; exact file link not found."
        },
        {
          "requirement": "Current contact information",
          "category": "waitlist",
          "quote": "It is the family’s responsibility to keep their information current with us, especially their phone number.",
          "chunkId": "child-development-institute/handbook.pdf#97",
          "docKey": "child-development-institute/handbook.pdf",
          "docTitle": "Family Handbook (revised January 1, 2025)",
          "page": "PDF p.26",
          "sourceUrl": "https://www.childdevelop.ca",
          "sourceNote": "Website named in the handbook; exact file link not found."
        },
        {
          "requirement": "Periodic follow-up calls",
          "category": "waitlist",
          "quote": "It is the family’s responsibility to call us to let us know if they are still interested in a childcare space",
          "chunkId": "child-development-institute/handbook.pdf#97",
          "docKey": "child-development-institute/handbook.pdf",
          "docTitle": "Family Handbook (revised January 1, 2025)",
          "page": "PDF p.26",
          "sourceUrl": "https://www.childdevelop.ca",
          "sourceNote": "Website named in the handbook; exact file link not found."
        },
        {
          "requirement": "Response to space offer within 24 hours",
          "category": "waitlist",
          "quote": "When a space is offered, the family will have 24 hours to respond.",
          "chunkId": "child-development-institute/handbook.pdf#97",
          "docKey": "child-development-institute/handbook.pdf",
          "docTitle": "Family Handbook (revised January 1, 2025)",
          "page": "PDF p.26",
          "sourceUrl": "https://www.childdevelop.ca",
          "sourceNote": "Website named in the handbook; exact file link not found."
        },
        {
          "requirement": "Registration Package and Signed Parent Contract",
          "category": "registration",
          "quote": "Registration Package and Signed Parent Contract",
          "chunkId": "child-development-institute/handbook.pdf#27",
          "docKey": "child-development-institute/handbook.pdf",
          "docTitle": "Family Handbook (revised January 1, 2025)",
          "page": "PDF p.13",
          "sourceUrl": "https://www.childdevelop.ca",
          "sourceNote": "Website named in the handbook; exact file link not found."
        },
        {
          "requirement": "Copy of Immunization Record",
          "category": "documents",
          "quote": "Copy of Immunization Record",
          "chunkId": "child-development-institute/handbook.pdf#27",
          "docKey": "child-development-institute/handbook.pdf",
          "docTitle": "Family Handbook (revised January 1, 2025)",
          "page": "PDF p.13",
          "sourceUrl": "https://www.childdevelop.ca",
          "sourceNote": "Website named in the handbook; exact file link not found."
        },
        {
          "requirement": "Signed Consent Forms",
          "category": "documents",
          "quote": "Signed Consent Forms (those that are applicable)",
          "chunkId": "child-development-institute/handbook.pdf#27",
          "docKey": "child-development-institute/handbook.pdf",
          "docTitle": "Family Handbook (revised January 1, 2025)",
          "page": "PDF p.13",
          "sourceUrl": "https://www.childdevelop.ca",
          "sourceNote": "Website named in the handbook; exact file link not found."
        },
        {
          "requirement": "Emergency Contact Information",
          "category": "documents",
          "quote": "Emergency Contact Information",
          "chunkId": "child-development-institute/handbook.pdf#27",
          "docKey": "child-development-institute/handbook.pdf",
          "docTitle": "Family Handbook (revised January 1, 2025)",
          "page": "PDF p.13",
          "sourceUrl": "https://www.childdevelop.ca",
          "sourceNote": "Website named in the handbook; exact file link not found."
        },
        {
          "requirement": "Pick Up Instructions",
          "category": "documents",
          "quote": "Pick Up Instructions",
          "chunkId": "child-development-institute/handbook.pdf#27",
          "docKey": "child-development-institute/handbook.pdf",
          "docTitle": "Family Handbook (revised January 1, 2025)",
          "page": "PDF p.13",
          "sourceUrl": "https://www.childdevelop.ca",
          "sourceNote": "Website named in the handbook; exact file link not found."
        },
        {
          "requirement": "Legal documentation for custody and access",
          "category": "documents",
          "quote": "Please be prepared to provide legal documentation for custody and access arrangements.",
          "chunkId": "child-development-institute/handbook.pdf#30",
          "docKey": "child-development-institute/handbook.pdf",
          "docTitle": "Family Handbook (revised January 1, 2025)",
          "page": "PDF p.13",
          "sourceUrl": "https://www.childdevelop.ca",
          "sourceNote": "Website named in the handbook; exact file link not found."
        },
        {
          "requirement": "Proof of immunization prior to enrolment",
          "category": "admission",
          "quote": "Proof of immunization must be shown prior to the enrolment of a child in the Centre.",
          "chunkId": "child-development-institute/handbook.pdf#28",
          "docKey": "child-development-institute/handbook.pdf",
          "docTitle": "Family Handbook (revised January 1, 2025)",
          "page": "PDF p.13",
          "sourceUrl": "https://www.childdevelop.ca",
          "sourceNote": "Website named in the handbook; exact file link not found."
        },
        {
          "requirement": "Immunization Objections or Exemptions forms",
          "category": "documents",
          "quote": "Objections or Exemptions must be completed on the approved forms provided by the Centre Director and must be submitted prior to admission.",
          "chunkId": "child-development-institute/handbook.pdf#28",
          "docKey": "child-development-institute/handbook.pdf",
          "docTitle": "Family Handbook (revised January 1, 2025)",
          "page": "PDF p.13",
          "sourceUrl": "https://www.childdevelop.ca",
          "sourceNote": "Website named in the handbook; exact file link not found."
        },
        {
          "requirement": "Emergency contact name and details",
          "category": "admission",
          "quote": "Parents must provide the Centre with the name and contact information of at least one person if the parent/guardian is unavailable or cannot be reached.",
          "chunkId": "child-development-institute/handbook.pdf#29",
          "docKey": "child-development-institute/handbook.pdf",
          "docTitle": "Family Handbook (revised January 1, 2025)",
          "page": "PDF p.13",
          "sourceUrl": "https://www.childdevelop.ca",
          "sourceNote": "Website named in the handbook; exact file link not found."
        }
      ],
      "chunksRead": 12,
      "latencyMs": 12120
    }
  },
  {
    "operatorId": "rolph-road-day-care",
    "centreId": "on-0002575",
    "response": {
      "success": true,
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "requirements": [
        {
          "requirement": "Waiting list application form",
          "category": "waitlist",
          "quote": "Fill out a waiting list application form",
          "chunkId": "rolph-road-day-care/parent-handbook.html#21",
          "docKey": "rolph-road-day-care/parent-handbook.html",
          "docTitle": "Parent Handbook (updated June 2026)",
          "page": "Online at www.leasidedaycare.com",
          "sourceUrl": "https://www.leasidedaycare.com",
          "sourceNote": "Website named in the handbook page; exact page link not found."
        },
        {
          "requirement": "Deposit",
          "category": "admission",
          "quote": "a deposit and will be required to guarantee your spot",
          "chunkId": "rolph-road-day-care/parent-handbook.html#18",
          "docKey": "rolph-road-day-care/parent-handbook.html",
          "docTitle": "Parent Handbook (updated June 2026)",
          "page": "8. Admission Policy",
          "sourceUrl": "https://www.leasidedaycare.com",
          "sourceNote": "Website named in the handbook page; exact page link not found."
        },
        {
          "requirement": "Application package forms",
          "category": "registration",
          "quote": "All relevant forms are required to be filled out before your child's start date.",
          "chunkId": "rolph-road-day-care/parent-handbook.html#18",
          "docKey": "rolph-road-day-care/parent-handbook.html",
          "docTitle": "Parent Handbook (updated June 2026)",
          "page": "8. Admission Policy",
          "sourceUrl": "https://www.leasidedaycare.com",
          "sourceNote": "Website named in the handbook page; exact page link not found."
        },
        {
          "requirement": "Parent and Child Code of Conduct",
          "category": "registration",
          "quote": "Children and parents are required to sign and abide by the “Parent and Child Code of Conduct”.",
          "chunkId": "rolph-road-day-care/parent-handbook.html#96",
          "docKey": "rolph-road-day-care/parent-handbook.html",
          "docTitle": "Parent Handbook (updated June 2026)",
          "page": "39. PARENT AND CHILD CODE OF CONDUCT",
          "sourceUrl": "https://www.leasidedaycare.com",
          "sourceNote": "Website named in the handbook page; exact page link not found."
        },
        {
          "requirement": "Doctor note for communicable disease",
          "category": "admission",
          "quote": "A DOCTORS NOTE MAY BE REQUIRED FOR RE-ADMITTANCE INTO THE DAYCARE PROGRAM.",
          "chunkId": "rolph-road-day-care/parent-handbook.html#70",
          "docKey": "rolph-road-day-care/parent-handbook.html",
          "docTitle": "Parent Handbook (updated June 2026)",
          "page": "31. Illnesses and Accident",
          "sourceUrl": "https://www.leasidedaycare.com",
          "sourceNote": "Website named in the handbook page; exact page link not found."
        },
        {
          "requirement": "Doctor note for rash or skin infection",
          "category": "admission",
          "quote": "A DOCTOR'S NOTE STATING THAT THE CONDITION IS NOT CONTAGIOUS IS REQUIRED",
          "chunkId": "rolph-road-day-care/parent-handbook.html#70",
          "docKey": "rolph-road-day-care/parent-handbook.html",
          "docTitle": "Parent Handbook (updated June 2026)",
          "page": "31. Illnesses and Accident",
          "sourceUrl": "https://www.leasidedaycare.com",
          "sourceNote": "Website named in the handbook page; exact page link not found."
        },
        {
          "requirement": "Health and Safety Declarations",
          "category": "admission",
          "quote": "parents may be required to sign a declaration confirming that they have not traveled",
          "chunkId": "rolph-road-day-care/parent-handbook.html#91",
          "docKey": "rolph-road-day-care/parent-handbook.html",
          "docTitle": "Parent Handbook (updated June 2026)",
          "page": "Health and Safety Declarations",
          "sourceUrl": "https://www.leasidedaycare.com",
          "sourceNote": "Website named in the handbook page; exact page link not found."
        }
      ],
      "chunksRead": 14,
      "latencyMs": 3158
    }
  },
  {
    "operatorId": "toronto-early-learning-child-care-services",
    "centreId": "on-00576",
    "response": {
      "success": true,
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash",
      "requirements": [
        {
          "requirement": "Waitlist registration",
          "category": "waitlist",
          "quote": "To place your child(ren) on the waitlist for a TELCCS centre(s) and/or to apply for a fee subsidy, please visit toronto.ca/telccs",
          "chunkId": "toronto-early-learning-child-care-services/handbook.pdf#26",
          "docKey": "toronto-early-learning-child-care-services/handbook.pdf",
          "docTitle": "Parent Handbook (March 2026)",
          "page": "PDF p.12",
          "sourceUrl": "https://www.toronto.ca/wp-content/uploads/2026/04/95b1-parenthandbook2026.pdf",
          "sourceNote": "Exact file"
        },
        {
          "requirement": "Fee subsidy approval",
          "category": "admission",
          "quote": "Families requiring a fee subsidy must be approved for placement by Children’s Services’ Client Services Unit.",
          "chunkId": "toronto-early-learning-child-care-services/handbook.pdf#27",
          "docKey": "toronto-early-learning-child-care-services/handbook.pdf",
          "docTitle": "Parent Handbook (March 2026)",
          "page": "PDF p.13",
          "sourceUrl": "https://www.toronto.ca/wp-content/uploads/2026/04/95b1-parenthandbook2026.pdf",
          "sourceNote": "Exact file"
        },
        {
          "requirement": "Pre-admission meeting",
          "category": "admission",
          "quote": "the Centre Supervisor will schedule a meeting with the parent(s)/guardian prior to admission to the centre.",
          "chunkId": "toronto-early-learning-child-care-services/handbook.pdf#28",
          "docKey": "toronto-early-learning-child-care-services/handbook.pdf",
          "docTitle": "Parent Handbook (March 2026)",
          "page": "PDF p.13",
          "sourceUrl": "https://www.toronto.ca/wp-content/uploads/2026/04/95b1-parenthandbook2026.pdf",
          "sourceNote": "Exact file"
        },
        {
          "requirement": "TELCCS Child Admission Package",
          "category": "documents",
          "quote": "The TELCCS Child Admission Package must be completed by the client and reviewed by the supervisor",
          "chunkId": "toronto-early-learning-child-care-services/handbook.pdf#162",
          "docKey": "toronto-early-learning-child-care-services/handbook.pdf",
          "docTitle": "Parent Handbook (March 2026)",
          "page": "PDF p.51",
          "sourceUrl": "https://www.toronto.ca/wp-content/uploads/2026/04/95b1-parenthandbook2026.pdf",
          "sourceNote": "Exact file"
        },
        {
          "requirement": "Agreement to Pay the Assessed Fee Form",
          "category": "documents",
          "quote": "A copy of the Agreement to Pay the Assessed Fee Form signed by the client must be sent to Central Billing Unit",
          "chunkId": "toronto-early-learning-child-care-services/handbook.pdf#162",
          "docKey": "toronto-early-learning-child-care-services/handbook.pdf",
          "docTitle": "Parent Handbook (March 2026)",
          "page": "PDF p.51",
          "sourceUrl": "https://www.toronto.ca/wp-content/uploads/2026/04/95b1-parenthandbook2026.pdf",
          "sourceNote": "Exact file"
        },
        {
          "requirement": "Up-to-date immunization information",
          "category": "documents",
          "quote": "Please ensure that you provide current and up-to-date immunization information to the centre.",
          "chunkId": "toronto-early-learning-child-care-services/handbook.pdf#32",
          "docKey": "toronto-early-learning-child-care-services/handbook.pdf",
          "docTitle": "Parent Handbook (March 2026)",
          "page": "PDF p.14",
          "sourceUrl": "https://www.toronto.ca/wp-content/uploads/2026/04/95b1-parenthandbook2026.pdf",
          "sourceNote": "Exact file"
        },
        {
          "requirement": "Immunization medical exemption",
          "category": "documents",
          "quote": "Written medical exemption by a qualified medical practitioner, which clearly states the medical reasons why a child cannot be immunized",
          "chunkId": "toronto-early-learning-child-care-services/handbook.pdf#32",
          "docKey": "toronto-early-learning-child-care-services/handbook.pdf",
          "docTitle": "Parent Handbook (March 2026)",
          "page": "PDF p.14",
          "sourceUrl": "https://www.toronto.ca/wp-content/uploads/2026/04/95b1-parenthandbook2026.pdf",
          "sourceNote": "Exact file"
        },
        {
          "requirement": "Emergency contact information",
          "category": "documents",
          "quote": "Parents must provide the centre with the name and contact information of at least one person if the parent/guardian is unavailable or cannot be reached.",
          "chunkId": "toronto-early-learning-child-care-services/handbook.pdf#30",
          "docKey": "toronto-early-learning-child-care-services/handbook.pdf",
          "docTitle": "Parent Handbook (March 2026)",
          "page": "PDF p.13",
          "sourceUrl": "https://www.toronto.ca/wp-content/uploads/2026/04/95b1-parenthandbook2026.pdf",
          "sourceNote": "Exact file"
        }
      ],
      "chunksRead": 14,
      "latencyMs": 12312
    }
  }
]
```

</details>

<details><summary>Prepare with AI</summary>

```json
[
  {
    "centreId": "careq-demo",
    "scenario": "no documents",
    "documents": [],
    "response": {
      "success": true,
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "fields": [
        {
          "label": "Child name",
          "value": "Anya",
          "source": "family profile"
        },
        {
          "label": "Child age",
          "value": "22 months",
          "source": "family profile"
        },
        {
          "label": "Care type",
          "value": "Full day",
          "source": "family profile"
        },
        {
          "label": "Preferred start date",
          "value": "March 2027",
          "source": "family profile"
        },
        {
          "label": "Emergency contact",
          "value": "",
          "source": "parent to provide"
        }
      ],
      "checklist": [
        {
          "requirement": "Child's Birth Certificate",
          "sourceSentence": "Pursuant to the Child Care and Early Years Act (CCEYA), all applicants must provide an official Child’s Birth Certificate and an up-to-date Yellow Immunization Card (ISPA compliance).",
          "status": "missing",
          "setBy": "ai"
        },
        {
          "requirement": "Yellow Immunization Card (ISPA)",
          "sourceSentence": "Pursuant to the Child Care and Early Years Act (CCEYA), all applicants must provide an official Child’s Birth Certificate and an up-to-date Yellow Immunization Card (ISPA compliance).",
          "status": "missing",
          "setBy": "ai"
        },
        {
          "requirement": "Proof of Toronto Residency",
          "sourceSentence": "Families residing in Toronto must verify residency with a utility bill or lease agreement.",
          "status": "missing",
          "setBy": "ai"
        },
        {
          "requirement": "Emergency Contact & Medical Consent Form",
          "sourceSentence": "An Emergency Contact & Medical Consent Form signed by both legal guardians is required before queue ranking.",
          "status": "missing",
          "setBy": "ai"
        }
      ],
      "missingItems": [
        "Upload: Child's Birth Certificate",
        "Upload: Yellow Immunization Card (ISPA)",
        "Upload: Proof of Toronto Residency",
        "Upload: Emergency Contact & Medical Consent Form",
        "Provide: Emergency contact"
      ],
      "noteToCentre": "Hello. Priya is submitting an application for Anya for Full day care starting in March 2027 at CareQ Demo Centre (fictional).",
      "latencyMs": 1211
    }
  },
  {
    "centreId": "careq-demo",
    "scenario": "\"child-s-birth-certificate.pdf\" + decoy",
    "documents": [
      {
        "fileName": "child-s-birth-certificate.pdf",
        "attachedTo": ""
      },
      {
        "fileName": "family-vacation-photo.jpg",
        "attachedTo": ""
      }
    ],
    "response": {
      "success": true,
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "fields": [
        {
          "label": "Child name",
          "value": "Anya",
          "source": "family profile"
        },
        {
          "label": "Child age",
          "value": "22 months",
          "source": "family profile"
        },
        {
          "label": "Care type",
          "value": "Full day",
          "source": "family profile"
        },
        {
          "label": "Preferred start date",
          "value": "March 2027",
          "source": "family profile"
        }
      ],
      "checklist": [
        {
          "requirement": "Child's Birth Certificate",
          "sourceSentence": "Pursuant to the Child Care and Early Years Act (CCEYA), all applicants must provide an official Child’s Birth Certificate and an up-to-date Yellow Immunization Card (ISPA compliance).",
          "status": "ready",
          "matchedDocument": "child-s-birth-certificate.pdf",
          "setBy": "ai"
        },
        {
          "requirement": "Yellow Immunization Card (ISPA)",
          "sourceSentence": "Pursuant to the Child Care and Early Years Act (CCEYA), all applicants must provide an official Child’s Birth Certificate and an up-to-date Yellow Immunization Card (ISPA compliance).",
          "status": "missing",
          "setBy": "ai"
        },
        {
          "requirement": "Proof of Toronto Residency",
          "sourceSentence": "Families residing in Toronto must verify residency with a utility bill or lease agreement.",
          "status": "missing",
          "setBy": "ai"
        },
        {
          "requirement": "Emergency Contact & Medical Consent Form",
          "sourceSentence": "An Emergency Contact & Medical Consent Form signed by both legal guardians is required before queue ranking.",
          "status": "missing",
          "setBy": "ai"
        }
      ],
      "missingItems": [
        "Upload: Yellow Immunization Card (ISPA)",
        "Upload: Proof of Toronto Residency",
        "Upload: Emergency Contact & Medical Consent Form"
      ],
      "noteToCentre": "Hello. Priya is submitting an application for Anya for Full day care with a preferred start date of March 2027 at CareQ Demo Centre (fictional).",
      "latencyMs": 1119
    }
  },
  {
    "centreId": "on-00576",
    "scenario": "no documents",
    "documents": [],
    "response": {
      "success": true,
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "fields": [
        {
          "label": "Child name",
          "value": "Anya",
          "source": "family profile"
        },
        {
          "label": "Child age",
          "value": "22 months",
          "source": "family profile"
        },
        {
          "label": "Care type",
          "value": "Full day",
          "source": "family profile"
        },
        {
          "label": "Preferred start date",
          "value": "March 2027",
          "source": "family profile"
        },
        {
          "label": "Parent contact information",
          "value": "",
          "source": "parent to provide"
        },
        {
          "label": "Doctor's contact information",
          "value": "",
          "source": "parent to provide"
        },
        {
          "label": "Health related information",
          "value": "",
          "source": "parent to provide"
        },
        {
          "label": "Emergency contact name and contact information",
          "value": "",
          "source": "parent to provide"
        }
      ],
      "checklist": [
        {
          "requirement": "Child Admission Package",
          "sourceSentence": "During this meeting, the Centre Supervisor will review the Child Admission Package and gather information, such as parent contact information, your child's doctor's contact information, health related information, etc.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Parent Handbook (March 2026), PDF p.13",
          "sourceUrl": "https://www.toronto.ca/wp-content/uploads/2026/04/95b1-parenthandbook2026.pdf"
        },
        {
          "requirement": "Emergency contact information",
          "sourceSentence": "Parents must provide the centre with the name and contact information of at least one person if the parent/guardian is unavailable or cannot be reached.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Parent Handbook (March 2026), PDF p.13",
          "sourceUrl": "https://www.toronto.ca/wp-content/uploads/2026/04/95b1-parenthandbook2026.pdf"
        },
        {
          "requirement": "Up-to-date immunization information",
          "sourceSentence": "Licensed child care centres are required to collect and retain up-to-date immunization for all children not attending school.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Parent Handbook (March 2026), PDF p.14",
          "sourceUrl": "https://www.toronto.ca/wp-content/uploads/2026/04/95b1-parenthandbook2026.pdf"
        },
        {
          "requirement": "Custody documents (if applicable)",
          "sourceSentence": "Please be prepared to provide legal documentation for custody arrangements.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Parent Handbook (March 2026), PDF p.14",
          "sourceUrl": "https://www.toronto.ca/wp-content/uploads/2026/04/95b1-parenthandbook2026.pdf"
        }
      ],
      "missingItems": [
        "Upload: Child Admission Package",
        "Upload: Emergency contact information",
        "Upload: Up-to-date immunization information",
        "Upload: Custody documents (if applicable)",
        "Provide: Parent contact information",
        "Provide: Doctor's contact information",
        "Provide: Health related information",
        "Provide: Emergency contact name and contact information"
      ],
      "noteToCentre": "Hello. Priya is applying for full day care for Anya at Jesse Ketchum Early Learning & Child Care Centre, with a preferred start date of March 2027.",
      "latencyMs": 1397
    }
  },
  {
    "centreId": "on-00576",
    "scenario": "\"child-admission-package.pdf\" + decoy",
    "documents": [
      {
        "fileName": "child-admission-package.pdf",
        "attachedTo": ""
      },
      {
        "fileName": "family-vacation-photo.jpg",
        "attachedTo": ""
      }
    ],
    "response": {
      "success": true,
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "fields": [
        {
          "label": "Child name",
          "value": "Anya",
          "source": "family profile"
        },
        {
          "label": "Child age",
          "value": "22 months",
          "source": "family profile"
        },
        {
          "label": "Care type",
          "value": "Full day",
          "source": "family profile"
        },
        {
          "label": "Preferred start date",
          "value": "March 2027",
          "source": "family profile"
        }
      ],
      "checklist": [
        {
          "requirement": "Child Admission Package",
          "sourceSentence": "During this meeting, the Centre Supervisor will review the Child Admission Package and gather information, such as parent contact information, your child's doctor's contact information, health related information, etc.",
          "status": "ready",
          "matchedDocument": "child-admission-package.pdf",
          "setBy": "ai",
          "citation": "Parent Handbook (March 2026), PDF p.13",
          "sourceUrl": "https://www.toronto.ca/wp-content/uploads/2026/04/95b1-parenthandbook2026.pdf"
        },
        {
          "requirement": "Emergency contact information",
          "sourceSentence": "Parents must provide the centre with the name and contact information of at least one person if the parent/guardian is unavailable or cannot be reached.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Parent Handbook (March 2026), PDF p.13",
          "sourceUrl": "https://www.toronto.ca/wp-content/uploads/2026/04/95b1-parenthandbook2026.pdf"
        },
        {
          "requirement": "Up-to-date immunization information",
          "sourceSentence": "Licensed child care centres are required to collect and retain up-to-date immunization for all children not attending school.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Parent Handbook (March 2026), PDF p.14",
          "sourceUrl": "https://www.toronto.ca/wp-content/uploads/2026/04/95b1-parenthandbook2026.pdf"
        },
        {
          "requirement": "Custody documents (if applicable)",
          "sourceSentence": "Please be prepared to provide legal documentation for custody arrangements.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Parent Handbook (March 2026), PDF p.14",
          "sourceUrl": "https://www.toronto.ca/wp-content/uploads/2026/04/95b1-parenthandbook2026.pdf"
        }
      ],
      "missingItems": [
        "Upload: Emergency contact information",
        "Upload: Up-to-date immunization information",
        "Upload: Custody documents (if applicable)"
      ],
      "noteToCentre": "Hello. Priya is submitting this application for Anya for Full day care with a preferred start date of March 2027 at Jesse Ketchum Early Learning & Child Care Centre. Thank you.",
      "latencyMs": 1056
    }
  },
  {
    "centreId": "on-0002899",
    "scenario": "no documents",
    "documents": [],
    "response": {
      "success": true,
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "fields": [
        {
          "label": "Child name",
          "value": "Anya",
          "source": "family profile"
        },
        {
          "label": "Child age",
          "value": "22 months",
          "source": "family profile"
        },
        {
          "label": "Care type",
          "value": "Full day",
          "source": "family profile"
        },
        {
          "label": "Preferred start date",
          "value": "March 2027",
          "source": "family profile"
        }
      ],
      "checklist": [
        {
          "requirement": "Registration Package and Signed Parent Contract",
          "sourceSentence": "As part of the admission procedure, the following documents must be completed by the parent and will be reviewed by the Centre Director: … Registration Package and Signed Parent Contract",
          "status": "missing",
          "setBy": "ai",
          "citation": "Family Handbook (revised January 1, 2025), PDF p.13",
          "sourceUrl": "https://www.childdevelop.ca"
        },
        {
          "requirement": "Copy of Immunization Record",
          "sourceSentence": "Proof of immunization must be shown prior to the enrolment of a child in the Centre.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Family Handbook (revised January 1, 2025), PDF p.13",
          "sourceUrl": "https://www.childdevelop.ca"
        },
        {
          "requirement": "Signed Consent Forms (those that are applicable)",
          "sourceSentence": "As part of the admission procedure, the following documents must be completed by the parent and will be reviewed by the Centre Director: … Signed Consent Forms (those that are applicable)",
          "status": "missing",
          "setBy": "ai",
          "citation": "Family Handbook (revised January 1, 2025), PDF p.13",
          "sourceUrl": "https://www.childdevelop.ca"
        },
        {
          "requirement": "Emergency Contact Information",
          "sourceSentence": "Parents must provide the Centre with the name and contact information of at least one person if the parent/guardian is unavailable or cannot be reached.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Family Handbook (revised January 1, 2025), PDF p.13",
          "sourceUrl": "https://www.childdevelop.ca"
        },
        {
          "requirement": "Pick Up Instructions",
          "sourceSentence": "As part of the admission procedure, the following documents must be completed by the parent and will be reviewed by the Centre Director: … Pick Up Instructions",
          "status": "missing",
          "setBy": "ai",
          "citation": "Family Handbook (revised January 1, 2025), PDF p.13",
          "sourceUrl": "https://www.childdevelop.ca"
        },
        {
          "requirement": "Preauthorized Debit form",
          "sourceSentence": "Every family enrolling into the Centre must complete a Preauthorized Debit form whether or not you currently have a fee.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Family Handbook (revised January 1, 2025), PDF p.14",
          "sourceUrl": "https://www.childdevelop.ca"
        }
      ],
      "missingItems": [
        "Upload: Registration Package and Signed Parent Contract",
        "Upload: Copy of Immunization Record",
        "Upload: Signed Consent Forms (those that are applicable)",
        "Upload: Emergency Contact Information",
        "Upload: Pick Up Instructions",
        "Upload: Preauthorized Debit form"
      ],
      "noteToCentre": "Hello. Priya is submitting the application materials for Anya for Full day care with a preferred start date of March 2027 at Wellesley Early Learning Centre - Earlscourt Creche Cdi - 495 Sherbourne Street. Thank you.",
      "latencyMs": 1292
    }
  },
  {
    "centreId": "on-0002899",
    "scenario": "\"registration-package-and-signed-parent-c.pdf\" + decoy",
    "documents": [
      {
        "fileName": "registration-package-and-signed-parent-c.pdf",
        "attachedTo": ""
      },
      {
        "fileName": "family-vacation-photo.jpg",
        "attachedTo": ""
      }
    ],
    "response": {
      "success": true,
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "fields": [
        {
          "label": "Child name",
          "value": "Anya",
          "source": "family profile"
        },
        {
          "label": "Child age",
          "value": "22 months",
          "source": "family profile"
        },
        {
          "label": "Care type",
          "value": "Full day",
          "source": "family profile"
        },
        {
          "label": "Preferred start date",
          "value": "March 2027",
          "source": "family profile"
        }
      ],
      "checklist": [
        {
          "requirement": "Registration Package and Signed Parent Contract",
          "sourceSentence": "As part of the admission procedure, the following documents must be completed by the parent and will be reviewed by the Centre Director: … Registration Package and Signed Parent Contract",
          "status": "ready",
          "matchedDocument": "registration-package-and-signed-parent-c.pdf",
          "setBy": "ai",
          "citation": "Family Handbook (revised January 1, 2025), PDF p.13",
          "sourceUrl": "https://www.childdevelop.ca"
        },
        {
          "requirement": "Copy of Immunization Record",
          "sourceSentence": "Proof of immunization must be shown prior to the enrolment of a child in the Centre.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Family Handbook (revised January 1, 2025), PDF p.13",
          "sourceUrl": "https://www.childdevelop.ca"
        },
        {
          "requirement": "Signed Consent Forms (those that are applicable)",
          "sourceSentence": "As part of the admission procedure, the following documents must be completed by the parent and will be reviewed by the Centre Director: … Signed Consent Forms (those that are applicable)",
          "status": "missing",
          "setBy": "ai",
          "citation": "Family Handbook (revised January 1, 2025), PDF p.13",
          "sourceUrl": "https://www.childdevelop.ca"
        },
        {
          "requirement": "Emergency Contact Information",
          "sourceSentence": "Parents must provide the Centre with the name and contact information of at least one person if the parent/guardian is unavailable or cannot be reached.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Family Handbook (revised January 1, 2025), PDF p.13",
          "sourceUrl": "https://www.childdevelop.ca"
        },
        {
          "requirement": "Pick Up Instructions",
          "sourceSentence": "As part of the admission procedure, the following documents must be completed by the parent and will be reviewed by the Centre Director: … Pick Up Instructions",
          "status": "missing",
          "setBy": "ai",
          "citation": "Family Handbook (revised January 1, 2025), PDF p.13",
          "sourceUrl": "https://www.childdevelop.ca"
        },
        {
          "requirement": "Preauthorized Debit form",
          "sourceSentence": "Every family enrolling into the Centre must complete a Preauthorized Debit form whether or not you currently have a fee.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Family Handbook (revised January 1, 2025), PDF p.14",
          "sourceUrl": "https://www.childdevelop.ca"
        }
      ],
      "missingItems": [
        "Upload: Copy of Immunization Record",
        "Upload: Signed Consent Forms (those that are applicable)",
        "Upload: Emergency Contact Information",
        "Upload: Pick Up Instructions",
        "Upload: Preauthorized Debit form"
      ],
      "noteToCentre": "Hello. Please find attached the application details for Anya for Full day care with a preferred start date of March 2027. Thank you.",
      "latencyMs": 982
    }
  },
  {
    "centreId": "on-0004062",
    "scenario": "no documents",
    "documents": [],
    "response": {
      "success": true,
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "fields": [
        {
          "label": "Child name",
          "value": "Anya",
          "source": "family profile"
        },
        {
          "label": "Child age",
          "value": "22 months",
          "source": "family profile"
        },
        {
          "label": "Care type",
          "value": "Full day",
          "source": "family profile"
        },
        {
          "label": "Preferred start date",
          "value": "March 2027",
          "source": "family profile"
        }
      ],
      "checklist": [
        {
          "requirement": "Child registration forms",
          "sourceSentence": "The registration process involves the completion of the child registration forms.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Parent Handbook (January 2024), PDF p.26",
          "sourceUrl": "https://macaulaycentre.org/services/licensed-child-care/licensed-child-care-centres"
        },
        {
          "requirement": "Admission forms, including immunization records",
          "sourceSentence": "All admission forms, including immunization records must be completed before your child's first day.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Parent Handbook (January 2024), PDF p.15",
          "sourceUrl": "https://macaulaycentre.org/services/licensed-child-care/licensed-child-care-centres"
        },
        {
          "requirement": "Up-to-date immunizations",
          "sourceSentence": "Toronto Public Health requires that your child's immunizations are up-to-date before your child can start.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Parent Handbook (January 2024), PDF p.17",
          "sourceUrl": "https://macaulaycentre.org/services/licensed-child-care/licensed-child-care-centres"
        }
      ],
      "missingItems": [
        "Upload: Child registration forms",
        "Upload: Admission forms, including immunization records",
        "Upload: Up-to-date immunizations"
      ],
      "noteToCentre": "Hello, Priya is applying for Full day care at Macaulay - Dovercourt Child Care Centre for Anya, with a preferred start date of March 2027. Thank you.",
      "latencyMs": 1135
    }
  },
  {
    "centreId": "on-0004062",
    "scenario": "\"child-registration-forms.pdf\" + decoy",
    "documents": [
      {
        "fileName": "child-registration-forms.pdf",
        "attachedTo": ""
      },
      {
        "fileName": "family-vacation-photo.jpg",
        "attachedTo": ""
      }
    ],
    "response": {
      "success": true,
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "fields": [
        {
          "label": "Child name",
          "value": "Anya",
          "source": "family profile"
        },
        {
          "label": "Child age",
          "value": "22 months",
          "source": "family profile"
        },
        {
          "label": "Care type",
          "value": "Full day",
          "source": "family profile"
        },
        {
          "label": "Preferred start date",
          "value": "March 2027",
          "source": "family profile"
        }
      ],
      "checklist": [
        {
          "requirement": "Child registration forms",
          "sourceSentence": "The registration process involves the completion of the child registration forms.",
          "status": "ready",
          "matchedDocument": "child-registration-forms.pdf",
          "setBy": "ai",
          "citation": "Parent Handbook (January 2024), PDF p.26",
          "sourceUrl": "https://macaulaycentre.org/services/licensed-child-care/licensed-child-care-centres"
        },
        {
          "requirement": "Admission forms, including immunization records",
          "sourceSentence": "All admission forms, including immunization records must be completed before your child's first day.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Parent Handbook (January 2024), PDF p.15",
          "sourceUrl": "https://macaulaycentre.org/services/licensed-child-care/licensed-child-care-centres"
        },
        {
          "requirement": "Up-to-date immunizations",
          "sourceSentence": "Toronto Public Health requires that your child's immunizations are up-to-date before your child can start.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Parent Handbook (January 2024), PDF p.17",
          "sourceUrl": "https://macaulaycentre.org/services/licensed-child-care/licensed-child-care-centres"
        }
      ],
      "missingItems": [
        "Upload: Admission forms, including immunization records",
        "Upload: Up-to-date immunizations"
      ],
      "noteToCentre": "Hello Macaulay - Dovercourt Child Care Centre, please find the application materials for Anya. Priya is applying for Full day care with a preferred start date of March 2027.",
      "latencyMs": 1272
    }
  },
  {
    "centreId": "on-0002575",
    "scenario": "no documents",
    "documents": [],
    "response": {
      "success": true,
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "fields": [
        {
          "label": "Child name",
          "value": "Anya",
          "source": "family profile"
        },
        {
          "label": "Child age",
          "value": "22 months",
          "source": "family profile"
        },
        {
          "label": "Care type",
          "value": "Full day",
          "source": "family profile"
        },
        {
          "label": "Preferred start date",
          "value": "March 2027",
          "source": "family profile"
        }
      ],
      "checklist": [
        {
          "requirement": "Waiting list application form",
          "sourceSentence": "To apply for Daycare a waiting list application form must be filled out.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Parent Handbook (updated June 2026), section 8 (Admission Policy)",
          "sourceUrl": "https://www.leasidedaycare.com"
        },
        {
          "requirement": "Deposit to guarantee your spot",
          "sourceSentence": "Once a space has been confirmed you will be contacted and a deposit and will be required to guarantee your spot.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Parent Handbook (updated June 2026), section 8 (Admission Policy)",
          "sourceUrl": "https://www.leasidedaycare.com"
        },
        {
          "requirement": "Application package forms",
          "sourceSentence": "All relevant forms are required to be filled out before your child's start date.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Parent Handbook (updated June 2026), section 8 (Admission Policy)",
          "sourceUrl": "https://www.leasidedaycare.com"
        }
      ],
      "missingItems": [
        "Upload: Waiting list application form",
        "Upload: Deposit to guarantee your spot",
        "Upload: Application package forms"
      ],
      "noteToCentre": "Hello, Priya is applying for care for Anya at Leaside Day Care Centre (Rolph Road Day Care) with a preferred start date of March 2027. Thank you.",
      "latencyMs": 992
    }
  },
  {
    "centreId": "on-0002575",
    "scenario": "\"waiting-list-application-form.pdf\" + decoy",
    "documents": [
      {
        "fileName": "waiting-list-application-form.pdf",
        "attachedTo": ""
      },
      {
        "fileName": "family-vacation-photo.jpg",
        "attachedTo": ""
      }
    ],
    "response": {
      "success": true,
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "fields": [
        {
          "label": "Child name",
          "value": "Anya",
          "source": "family profile"
        },
        {
          "label": "Child age",
          "value": "22 months",
          "source": "family profile"
        },
        {
          "label": "Care type",
          "value": "Full day",
          "source": "family profile"
        },
        {
          "label": "Preferred start date",
          "value": "March 2027",
          "source": "family profile"
        },
        {
          "label": "Emergency contact",
          "value": "",
          "source": "parent to provide"
        }
      ],
      "checklist": [
        {
          "requirement": "Waiting list application form",
          "sourceSentence": "To apply for Daycare a waiting list application form must be filled out.",
          "status": "ready",
          "matchedDocument": "waiting-list-application-form.pdf",
          "setBy": "ai",
          "citation": "Parent Handbook (updated June 2026), section 8 (Admission Policy)",
          "sourceUrl": "https://www.leasidedaycare.com"
        },
        {
          "requirement": "Deposit to guarantee your spot",
          "sourceSentence": "Once a space has been confirmed you will be contacted and a deposit and will be required to guarantee your spot.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Parent Handbook (updated June 2026), section 8 (Admission Policy)",
          "sourceUrl": "https://www.leasidedaycare.com"
        },
        {
          "requirement": "Application package forms",
          "sourceSentence": "All relevant forms are required to be filled out before your child's start date.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Parent Handbook (updated June 2026), section 8 (Admission Policy)",
          "sourceUrl": "https://www.leasidedaycare.com"
        }
      ],
      "missingItems": [
        "Upload: Deposit to guarantee your spot",
        "Upload: Application package forms",
        "Provide: Emergency contact"
      ],
      "noteToCentre": "Hello, please find attached the waiting list application form for Anya for the March 2027 start date. Thank you.",
      "latencyMs": 1048
    }
  },
  {
    "centreId": "on-03394",
    "scenario": "no documents",
    "documents": [],
    "response": {
      "success": true,
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "fields": [
        {
          "label": "Child name",
          "value": "Anya",
          "source": "family profile"
        },
        {
          "label": "Child age",
          "value": "22 months",
          "source": "family profile"
        },
        {
          "label": "Care type",
          "value": "Full day",
          "source": "family profile"
        },
        {
          "label": "Preferred start date",
          "value": "March 2027",
          "source": "family profile"
        },
        {
          "label": "Emergency contact",
          "value": "",
          "source": "parent to provide"
        }
      ],
      "checklist": [
        {
          "requirement": "Registration forms, including the medical",
          "sourceSentence": "The registration forms, including the medical, must be completely filled out and submitted at least two weeks prior to your child beginning day care.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Policies and Procedures Parent Handbook (revised January 2020), PDF p.14",
          "sourceUrl": "https://www.harmonychildcarecentre.ca"
        },
        {
          "requirement": "First payment of care",
          "sourceSentence": "A spot for your child is secured once this first payment is paid and the amount paid will be applied to your fees once your child begins care with us.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Policies and Procedures Parent Handbook (revised January 2020), PDF p.14",
          "sourceUrl": "https://www.harmonychildcarecentre.ca"
        },
        {
          "requirement": "Immunization Information Form & copy of Yellow Immunization Card",
          "sourceSentence": "The following forms must be completed and returned before your child is admitted into the program … Immunization Information Form & provide copy of Yellow Immunization Card from Doctor",
          "status": "missing",
          "setBy": "ai",
          "citation": "Policies and Procedures Parent Handbook (revised January 2020), PDF p.15",
          "sourceUrl": "https://www.harmonychildcarecentre.ca"
        },
        {
          "requirement": "Emergency Contact Information Form",
          "sourceSentence": "The following forms must be completed and returned before your child is admitted into the program … Emergency Contact Information Form",
          "status": "missing",
          "setBy": "ai",
          "citation": "Policies and Procedures Parent Handbook (revised January 2020), PDF p.15",
          "sourceUrl": "https://www.harmonychildcarecentre.ca"
        },
        {
          "requirement": "Medical and Health Care Information Form",
          "sourceSentence": "The following forms must be completed and returned before your child is admitted into the program … Medical and Health Care Information Form (2 pages)",
          "status": "missing",
          "setBy": "ai",
          "citation": "Policies and Procedures Parent Handbook (revised January 2020), PDF p.15",
          "sourceUrl": "https://www.harmonychildcarecentre.ca"
        }
      ],
      "missingItems": [
        "Upload: Registration forms, including the medical",
        "Upload: First payment of care",
        "Upload: Immunization Information Form & copy of Yellow Immunization Card",
        "Upload: Emergency Contact Information Form",
        "Upload: Medical and Health Care Information Form",
        "Provide: Emergency contact"
      ],
      "noteToCentre": "Hello, please find the application details for Anya. We are requesting full day care starting in March 2027 at Harmony Child Care Centre (Harmony Community School Centre) 124 Northcliffe Blvd. Thank you.",
      "latencyMs": 1272
    }
  },
  {
    "centreId": "on-03394",
    "scenario": "\"registration-forms-including-the-medical.pdf\" + decoy",
    "documents": [
      {
        "fileName": "registration-forms-including-the-medical.pdf",
        "attachedTo": ""
      },
      {
        "fileName": "family-vacation-photo.jpg",
        "attachedTo": ""
      }
    ],
    "response": {
      "success": true,
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "fields": [
        {
          "label": "Child name",
          "value": "Anya",
          "source": "family profile"
        },
        {
          "label": "Child age",
          "value": "22 months",
          "source": "family profile"
        },
        {
          "label": "Care type",
          "value": "Full day",
          "source": "family profile"
        },
        {
          "label": "Preferred start date",
          "value": "March 2027",
          "source": "family profile"
        },
        {
          "label": "Emergency contact",
          "value": "",
          "source": "parent to provide"
        }
      ],
      "checklist": [
        {
          "requirement": "Registration forms, including the medical",
          "sourceSentence": "The registration forms, including the medical, must be completely filled out and submitted at least two weeks prior to your child beginning day care.",
          "status": "ready",
          "matchedDocument": "registration-forms-including-the-medical.pdf",
          "setBy": "ai",
          "citation": "Policies and Procedures Parent Handbook (revised January 2020), PDF p.14",
          "sourceUrl": "https://www.harmonychildcarecentre.ca"
        },
        {
          "requirement": "First payment of care",
          "sourceSentence": "A spot for your child is secured once this first payment is paid and the amount paid will be applied to your fees once your child begins care with us.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Policies and Procedures Parent Handbook (revised January 2020), PDF p.14",
          "sourceUrl": "https://www.harmonychildcarecentre.ca"
        },
        {
          "requirement": "Immunization Information Form & copy of Yellow Immunization Card",
          "sourceSentence": "The following forms must be completed and returned before your child is admitted into the program … Immunization Information Form & provide copy of Yellow Immunization Card from Doctor",
          "status": "missing",
          "setBy": "ai",
          "citation": "Policies and Procedures Parent Handbook (revised January 2020), PDF p.15",
          "sourceUrl": "https://www.harmonychildcarecentre.ca"
        },
        {
          "requirement": "Emergency Contact Information Form",
          "sourceSentence": "The following forms must be completed and returned before your child is admitted into the program … Emergency Contact Information Form",
          "status": "missing",
          "setBy": "ai",
          "citation": "Policies and Procedures Parent Handbook (revised January 2020), PDF p.15",
          "sourceUrl": "https://www.harmonychildcarecentre.ca"
        },
        {
          "requirement": "Medical and Health Care Information Form",
          "sourceSentence": "The following forms must be completed and returned before your child is admitted into the program … Medical and Health Care Information Form (2 pages)",
          "status": "missing",
          "setBy": "ai",
          "citation": "Policies and Procedures Parent Handbook (revised January 2020), PDF p.15",
          "sourceUrl": "https://www.harmonychildcarecentre.ca"
        }
      ],
      "missingItems": [
        "Upload: First payment of care",
        "Upload: Immunization Information Form & copy of Yellow Immunization Card",
        "Upload: Emergency Contact Information Form",
        "Upload: Medical and Health Care Information Form",
        "Provide: Emergency contact"
      ],
      "noteToCentre": "Hello Harmony Child Care Centre (Harmony Community School Centre) 124 Northcliffe Blvd, Priya is applying for Full day care for Anya, with a preferred start date of March 2027. Please find the attached documents enclosed.",
      "latencyMs": 1221
    }
  },
  {
    "centreId": "on-07205",
    "scenario": "no documents",
    "documents": [],
    "response": {
      "success": true,
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "fields": [
        {
          "label": "Child name",
          "value": "Anya",
          "source": "family profile"
        },
        {
          "label": "Child age",
          "value": "22 months",
          "source": "family profile"
        },
        {
          "label": "Care type",
          "value": "Full day",
          "source": "family profile"
        },
        {
          "label": "Preferred start date",
          "value": "March 2027",
          "source": "family profile"
        }
      ],
      "checklist": [
        {
          "requirement": "Registration Fee ($25.00, non-refundable)",
          "sourceSentence": "A non-refundable Registration Fee of $25.00 prior to enrollment is required.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Parent Handbook (source link not found), PDF p.3"
        },
        {
          "requirement": "Registration and Immunization Forms",
          "sourceSentence": "All Registration and Immunization Forms must be completed and submitted to the Centre's Supervisor ONE WEEK prior to enrollment.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Parent Handbook (source link not found), PDF p.3"
        },
        {
          "requirement": "Toronto Public Health Immunization Form with your child's immunization record",
          "sourceSentence": "Prior to admission, parents are required to complete a Toronto Public Health Immunization Form. A copy of your child's up to date immunization record must be attached and returned to the centre.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Parent Handbook (source link not found), PDF p.6"
        }
      ],
      "missingItems": [
        "Upload: Registration Fee ($25.00, non-refundable)",
        "Upload: Registration and Immunization Forms",
        "Upload: Toronto Public Health Immunization Form with your child's immunization record"
      ],
      "noteToCentre": "Hello. I am submitting this application for Anya for Full day care with a preferred start date of March 2027 at B.F. Toronto Centre For Early Childhood (45 Golfdown). Thank you.",
      "latencyMs": 1050
    }
  },
  {
    "centreId": "on-07205",
    "scenario": "\"registration-fee-25-00-non-refundable.pdf\" + decoy",
    "documents": [
      {
        "fileName": "registration-fee-25-00-non-refundable.pdf",
        "attachedTo": ""
      },
      {
        "fileName": "family-vacation-photo.jpg",
        "attachedTo": ""
      }
    ],
    "response": {
      "success": true,
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "fields": [
        {
          "label": "Child name",
          "value": "Anya",
          "source": "family profile"
        },
        {
          "label": "Child age",
          "value": "22 months",
          "source": "family profile"
        },
        {
          "label": "Care type",
          "value": "Full day",
          "source": "family profile"
        },
        {
          "label": "Preferred start date",
          "value": "March 2027",
          "source": "family profile"
        }
      ],
      "checklist": [
        {
          "requirement": "Registration Fee ($25.00, non-refundable)",
          "sourceSentence": "A non-refundable Registration Fee of $25.00 prior to enrollment is required.",
          "status": "ready",
          "matchedDocument": "registration-fee-25-00-non-refundable.pdf",
          "setBy": "ai",
          "citation": "Parent Handbook (source link not found), PDF p.3"
        },
        {
          "requirement": "Registration and Immunization Forms",
          "sourceSentence": "All Registration and Immunization Forms must be completed and submitted to the Centre's Supervisor ONE WEEK prior to enrollment.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Parent Handbook (source link not found), PDF p.3"
        },
        {
          "requirement": "Toronto Public Health Immunization Form with your child's immunization record",
          "sourceSentence": "Prior to admission, parents are required to complete a Toronto Public Health Immunization Form. A copy of your child's up to date immunization record must be attached and returned to the centre.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Parent Handbook (source link not found), PDF p.6"
        }
      ],
      "missingItems": [
        "Upload: Registration and Immunization Forms",
        "Upload: Toronto Public Health Immunization Form with your child's immunization record"
      ],
      "noteToCentre": "Hello. I am submitting the application materials for Anya to attend B.F. Toronto Centre For Early Childhood (45 Golfdown) for Full day care with a preferred start date of March 2027. Please find the registration fee document attached. Thank you.",
      "latencyMs": 1118
    }
  },
  {
    "centreId": "on-12256",
    "scenario": "no documents",
    "documents": [],
    "response": {
      "success": true,
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "fields": [
        {
          "label": "Child name",
          "value": "Anya",
          "source": "family profile"
        },
        {
          "label": "Child age",
          "value": "22 months",
          "source": "family profile"
        },
        {
          "label": "Care type",
          "value": "Full day",
          "source": "family profile"
        },
        {
          "label": "Preferred start date",
          "value": "March 2027",
          "source": "family profile"
        }
      ],
      "checklist": [
        {
          "requirement": "Proof of immunization (or a completed standard exemption form)",
          "sourceSentence": "all paperwork around immunization – either proof of immunization or one of the two completed standard forms – must be kept in a child's record and ideally should be on file by the time the child begins attending the licensed program.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Child Care Centre Licensing Manual, PDF p.100",
          "sourceUrl": "https://www.ontario.ca/document/child-care-centre-licensing-manual"
        },
        {
          "requirement": "Emergency contact information",
          "sourceSentence": "Section 69 and subsection 70(1) are in place as part of emergency planning/management; having important contact information readily available allows for quick contact with parents and emergency services.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Child Care Centre Licensing Manual, PDF p.239",
          "sourceUrl": "https://www.ontario.ca/document/child-care-centre-licensing-manual"
        }
      ],
      "missingItems": [
        "Upload: Proof of immunization (or a completed standard exemption form)",
        "Upload: Emergency contact information"
      ],
      "noteToCentre": "Hello Family Day Care Services - Mary Ward Child Care Centre, Priya is applying for Anya for Full day care with a preferred start date of March 2027.",
      "latencyMs": 1081
    }
  },
  {
    "centreId": "on-12256",
    "scenario": "\"proof-of-immunization-or-a-completed-sta.pdf\" + decoy",
    "documents": [
      {
        "fileName": "proof-of-immunization-or-a-completed-sta.pdf",
        "attachedTo": ""
      },
      {
        "fileName": "family-vacation-photo.jpg",
        "attachedTo": ""
      }
    ],
    "response": {
      "success": true,
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "fields": [
        {
          "label": "Child name",
          "value": "Anya",
          "source": "family profile"
        },
        {
          "label": "Child age",
          "value": "22 months",
          "source": "family profile"
        },
        {
          "label": "Care type",
          "value": "Full day",
          "source": "family profile"
        },
        {
          "label": "Preferred start date",
          "value": "March 2027",
          "source": "family profile"
        }
      ],
      "checklist": [
        {
          "requirement": "Proof of immunization (or a completed standard exemption form)",
          "sourceSentence": "all paperwork around immunization – either proof of immunization or one of the two completed standard forms – must be kept in a child's record and ideally should be on file by the time the child begins attending the licensed program.",
          "status": "ready",
          "matchedDocument": "proof-of-immunization-or-a-completed-sta.pdf",
          "setBy": "ai",
          "citation": "Child Care Centre Licensing Manual, PDF p.100",
          "sourceUrl": "https://www.ontario.ca/document/child-care-centre-licensing-manual"
        },
        {
          "requirement": "Emergency contact information",
          "sourceSentence": "Section 69 and subsection 70(1) are in place as part of emergency planning/management; having important contact information readily available allows for quick contact with parents and emergency services.",
          "status": "missing",
          "setBy": "ai",
          "citation": "Child Care Centre Licensing Manual, PDF p.239",
          "sourceUrl": "https://www.ontario.ca/document/child-care-centre-licensing-manual"
        }
      ],
      "missingItems": [
        "Upload: Emergency contact information"
      ],
      "noteToCentre": "Hello, please find attached the application details for Anya. We are looking forward to a preferred start date of March 2027 for full day care at Family Day Care Services - Mary Ward Child Care Centre.",
      "latencyMs": 974
    }
  }
]
```

</details>

<details><summary>Tone check</summary>

```json
[
  {
    "text": "Hi, could you let me know if you need any other documents for Anya's application? Thank you!",
    "role": "parent",
    "label": false,
    "response": {
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash",
      "success": true,
      "isHarsh": false,
      "suggestedCalmerVersion": "",
      "reason": "",
      "latencyMs": 1667
    }
  },
  {
    "text": "Thanks for the update on our position. We're still very interested in a spot.",
    "role": "parent",
    "label": false,
    "response": {
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash",
      "success": true,
      "isHarsh": false,
      "suggestedCalmerVersion": "",
      "reason": "",
      "latencyMs": 1977
    }
  },
  {
    "text": "Hello, I wanted to confirm you received our application last week. Have a great day.",
    "role": "parent",
    "label": false,
    "response": {
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash",
      "success": true,
      "isHarsh": false,
      "suggestedCalmerVersion": "",
      "reason": "",
      "latencyMs": 2527
    }
  },
  {
    "text": "We'd love to accept the offer. What are the next steps before her first day?",
    "role": "parent",
    "label": false,
    "response": {
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash",
      "success": true,
      "isHarsh": false,
      "suggestedCalmerVersion": "",
      "reason": "",
      "latencyMs": 1642
    }
  },
  {
    "text": "Could we book a tour sometime next week? Any afternoon works for us.",
    "role": "parent",
    "label": false,
    "response": {
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash",
      "success": true,
      "isHarsh": false,
      "suggestedCalmerVersion": "",
      "reason": "",
      "latencyMs": 1772
    }
  },
  {
    "text": "Sorry for the late reply. Here is the immunization record you asked for.",
    "role": "parent",
    "label": false,
    "response": {
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash",
      "success": true,
      "isHarsh": false,
      "suggestedCalmerVersion": "",
      "reason": "",
      "latencyMs": 1559
    }
  },
  {
    "text": "Is there anything we can do to keep our application up to date while we wait?",
    "role": "parent",
    "label": false,
    "response": {
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "success": true,
      "isHarsh": false,
      "suggestedCalmerVersion": "",
      "reason": "",
      "latencyMs": 869
    }
  },
  {
    "text": "We've found care elsewhere, so please remove us from the waitlist. Thank you for your help.",
    "role": "parent",
    "label": false,
    "response": {
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash",
      "success": true,
      "isHarsh": false,
      "suggestedCalmerVersion": "",
      "reason": "",
      "latencyMs": 2304
    }
  },
  {
    "text": "Hi Priya, thanks for applying. We'll be in touch as soon as we have an update.",
    "role": "centre",
    "label": false,
    "response": {
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "success": true,
      "isHarsh": false,
      "suggestedCalmerVersion": "",
      "reason": "",
      "latencyMs": 1825
    }
  },
  {
    "text": "Your application is complete. Please let us know if anything changes.",
    "role": "centre",
    "label": false,
    "response": {
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash",
      "success": true,
      "isHarsh": false,
      "suggestedCalmerVersion": "",
      "reason": "",
      "latencyMs": 2445
    }
  },
  {
    "text": "Just checking in again on our application, as our return-to-work date is getting close.",
    "role": "parent",
    "label": false,
    "response": {
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "success": true,
      "isHarsh": false,
      "suggestedCalmerVersion": "",
      "reason": "",
      "latencyMs": 858
    }
  },
  {
    "text": "Could you clarify what the deposit covers? We want to be sure we understand.",
    "role": "parent",
    "label": false,
    "response": {
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "success": true,
      "isHarsh": false,
      "suggestedCalmerVersion": "",
      "reason": "",
      "latencyMs": 849
    }
  },
  {
    "text": "This is ridiculous. I've emailed three times and nobody answers. Do your job.",
    "role": "parent",
    "label": true,
    "response": {
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "success": true,
      "isHarsh": true,
      "suggestedCalmerVersion": "Hello, I am following up on my previous three emails as I have not yet received a response. Could someone please get back to me regarding my inquiry as soon as possible? Thank you.",
      "reason": "The message uses insulting language and a demanding tone, which comes across as aggressive and confrontational.",
      "latencyMs": 997
    }
  },
  {
    "text": "I need a spot by Monday. No excuses.",
    "role": "parent",
    "label": true,
    "response": {
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash",
      "success": true,
      "isHarsh": true,
      "suggestedCalmerVersion": "I am urgently seeking a child care spot for my child starting this Monday. Could you please let me know if you have any availability?",
      "reason": "The phrase 'No excuses' alongside the abrupt demand creates an aggressive and confrontational tone.",
      "latencyMs": 2219
    }
  },
  {
    "text": "If you don't move us up the list I'll post a review telling everyone how useless you are.",
    "role": "parent",
    "label": true,
    "response": {
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "success": true,
      "isHarsh": true,
      "suggestedCalmerVersion": "Hello, we are very eager to secure a spot at your centre. Could you please provide an update on our current position on the waitlist and when an opening might realistically become available?",
      "reason": "The message uses a direct threat of a negative public review and insults the centre's staff, which is aggressive and unprofessional.",
      "latencyMs": 1410
    }
  },
  {
    "text": "Why is it so hard for you people to answer a simple question?",
    "role": "parent",
    "label": true,
    "response": {
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "success": true,
      "isHarsh": true,
      "suggestedCalmerVersion": "Hello, I am following up on my previous question as I haven't heard back yet. Could you please provide an update when you have a moment?",
      "reason": "The phrase 'Why is it so hard for you people' is confrontational and disparaging.",
      "latencyMs": 1014
    }
  },
  {
    "text": "Answer me today or I'm calling my lawyer.",
    "role": "parent",
    "label": true,
    "response": {
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash",
      "success": true,
      "isHarsh": true,
      "suggestedCalmerVersion": "Could you please provide an update on this matter today? It is very important for me to receive a response as soon as possible.",
      "reason": "The message uses an aggressive ultimatum and a threat of legal action to demand an immediate response.",
      "latencyMs": 3218
    }
  },
  {
    "text": "Your waitlist is a joke. Fix it.",
    "role": "parent",
    "label": true,
    "response": {
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "success": true,
      "isHarsh": true,
      "suggestedCalmerVersion": "I am following up on the status of my child's application on the waitlist and would appreciate an update when possible.",
      "reason": "The message uses dismissive language and a demanding imperative that comes across as aggressive and confrontational.",
      "latencyMs": 967
    }
  },
  {
    "text": "Stop emailing us. We already told you there are no spaces.",
    "role": "centre",
    "label": true,
    "response": {
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash-lite",
      "success": true,
      "isHarsh": true,
      "suggestedCalmerVersion": "Hello. As previously mentioned, our centre is currently at full capacity with no available spaces at this time. We will keep your information on file and notify you if a spot opens up. Thank you for your understanding.",
      "reason": "The phrase 'Stop emailing us' is abrupt and dismissive, which comes across as confrontational and rude.",
      "latencyMs": 1071
    }
  },
  {
    "text": "Honestly, your centre is the worst I've dealt with and I expect an answer immediately.",
    "role": "parent",
    "label": true,
    "response": {
      "aiMode": "gemini",
      "modelUsed": "gemini-3.5-flash",
      "success": true,
      "isHarsh": true,
      "suggestedCalmerVersion": "I have been unhappy with my experience so far and would appreciate a prompt update regarding my concern.",
      "reason": "The message uses overly harsh generalizations and a demanding tone.",
      "latencyMs": 2785
    }
  }
]
```

</details>
