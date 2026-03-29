import { Question } from './types';

export const QUESTIONS: Question[] = [
  {
    id: 0,
    type: 'mcq',
    text: 'Which Marketing Cloud product is built natively on the Salesforce Core platform?',
    options: [
      'Marketing Cloud Engagement',
      'Marketing Cloud Growth / Advanced',
      'Pardot (Account Engagement)',
      'Marketing Cloud Intelligence',
    ],
    correctAnswer: 'Marketing Cloud Growth / Advanced',
    funFact: 'MC Growth & Advanced (formerly MC Next) are built directly on Salesforce Core — sharing the same data model, flows, and permissions.',
  },
  {
    id: 1,
    type: 'truefalse',
    text: 'In Marketing Cloud Engagement, AMPscript is case-sensitive.',
    options: ['True', 'False'],
    correctAnswer: 'False',
    funFact: 'AMPscript is NOT case-sensitive — %%[var]%% and %%[VAR]%% are the same. SQL in Query Activity, however, IS case-sensitive for string comparisons.',
  },
  {
    id: 2,
    type: 'mcq',
    text: 'What is the correct order of operations in a Salesforce Flow triggered by a record change?',
    options: [
      'Before Save → After Save → Async Path',
      'After Save → Before Save → Async Path',
      'Async Path → Before Save → After Save',
      'Before Save → Async Path → After Save',
    ],
    correctAnswer: 'Before Save → After Save → Async Path',
    funFact: 'Before Save runs first (no DML needed for updates), After Save runs after commit, and Async (Scheduled) paths run in a separate transaction.',
  },
  {
    id: 3,
    type: 'truefalse',
    text: 'Data Cloud (Data 360) can unify customer profiles across Marketing Cloud Engagement AND external data sources in the same segment.',
    options: ['True', 'False'],
    correctAnswer: 'True',
    funFact: 'Data Cloud uses Identity Resolution to merge profiles from MC Engagement, CRM, and external data into a single Unified Individual — powering truly cross-channel segmentation.',
  },
  {
    id: 4,
    type: 'mcq',
    text: 'In Journey Builder, which entry source allows you to inject contacts mid-flight based on a Data Extension update?',
    options: [
      'Salesforce Data entry',
      'API Event entry',
      'Data Extension entry with re-evaluation',
      'Audience Studio trigger',
    ],
    correctAnswer: 'Data Extension entry with re-evaluation',
    funFact: 'With "Evaluate New Records & Modified Records" enabled, Journey Builder continuously polls the DE and injects new/updated contacts — no API call required.',
  },
  {
    id: 5,
    type: 'mcq',
    text: 'Which SQL function is NOT available in Marketing Cloud Query Studio / Automation Studio?',
    options: [
      'GETDATE()',
      'DATEDIFF()',
      'STRING_AGG()',
      'CONVERT()',
    ],
    correctAnswer: 'STRING_AGG()',
    funFact: 'MC uses a subset of T-SQL. STRING_AGG() (aggregate string concat) is not supported — you\'d need to work around it with subqueries or AMPscript post-processing.',
  },
  {
    id: 6,
    type: 'truefalse',
    text: 'When you connect Marketing Cloud to Salesforce CRM via Marketing Cloud Connect, Contacts sync automatically without any configuration.',
    options: ['True', 'False'],
    correctAnswer: 'False',
    funFact: 'MC Connect gives you the connector — but you still need to configure Synchronized Data Sources, map fields, and set sync schedules. Nothing syncs "automatically" out of the box.',
  },
  {
    id: 7,
    type: 'mcq',
    text: 'In Marketing Cloud Engagement, what does a "Suppression List" data extension do?',
    options: [
      'Stores contacts who have hard bounced',
      'Prevents listed addresses from receiving a specific send',
      'Replaces the All Subscribers list for a Business Unit',
      'Holds contacts pending GDPR deletion',
    ],
    correctAnswer: 'Prevents listed addresses from receiving a specific send',
    funFact: 'Suppression Lists are send-level exclusions — you attach them to a specific send or journey send activity. They\'re different from the global Exclusion List or bounce handling.',
  },
  {
    id: 8,
    type: 'mcq',
    text: 'What is the maximum number of activities allowed in a single Marketing Cloud Automation Studio automation?',
    options: ['20', '50', 'No hard limit', '100'],
    correctAnswer: 'No hard limit',
    funFact: 'There\'s no documented hard limit on activities per automation — but performance degrades with very long chains. Best practice is to split complex automations into logical sub-automations.',
  },
  {
    id: 9,
    type: 'mcq',
    text: 'Which feature in Marketing Cloud Growth / Advanced enables sending transactional messages triggered directly from a Salesforce Flow?',
    options: [
      'Journey Builder API Event',
      'Triggered Send Definition',
      'Flow-triggered Messaging',
      'Engagement Studio Program',
    ],
    correctAnswer: 'Flow-triggered Messaging',
    funFact: 'MC Growth & Advanced include native Flow actions that can trigger email/SMS sends directly from any Salesforce Flow — no API or separate automation needed. A massive differentiator vs. Engagement.',
  },
];

export function getPublicQuestion(index: number) {
  const q = QUESTIONS[index];
  if (!q) return null;
  const { correctAnswer, ...pub } = q;
  void correctAnswer;
  return pub;
}

export const TOTAL_QUESTIONS = QUESTIONS.length;
export const LEADERBOARD_AFTER_QUESTION = 4; // Show leaderboard after question index 4 (Q5)
export const QUESTION_DURATION_MS = 15_000;
