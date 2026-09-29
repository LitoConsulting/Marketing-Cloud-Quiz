import { Quiz } from '../types';

// The original set from the spring 2026 meetup. Kept so it can be re-run or reused.
export const spring2026Meetup: Quiz = {
  id: 'spring-2026-meetup',
  title: 'Marketing Cloud Meetup Quiz',
  subtitle: 'Spring 2026',
  questionDurationMs: 15_000,
  leaderboardAfterQuestion: 4,
  questions: [
    {
      type: 'mcq',
      text: 'For how much did Salesforce acquire ExactTarget in 2013?',
      options: [
        '$800 million',
        '$2.5 billion',
        '$4.8 billion',
        '$1.2 billion',
      ],
      correctAnswer: '$2.5 billion',
      funFact: 'It was the biggest acquisition in Salesforce history at the time. ExactTarget had just bought Pardot months earlier, so Salesforce got both platforms in one deal.',
    },
    {
      type: 'truefalse',
      text: 'A contact who unsubscribes from one email in MC Engagement is automatically suppressed from ALL emails in that org.',
      options: ['True', 'False'],
      correctAnswer: 'True',
      funFact: 'Global unsubscribes catch a lot of marketers off guard. Publication Lists exist exactly for this reason: to let contacts opt out of specific topics without going dark entirely.',
    },
    {
      type: 'mcq',
      text: 'What does Data Cloud call the unified customer record created after merging multiple source records?',
      options: [
        'Master Contact',
        'Unified Individual',
        'Golden Record',
        'Super Profile',
      ],
      correctAnswer: 'Unified Individual',
      funFact: '"Golden Record" is the classic MDM term. Salesforce went with Unified Individual to reflect that the identity resolution process is continuous, not a one-time batch job.',
    },
    {
      type: 'truefalse',
      text: 'Account Engagement (formerly Pardot) and Marketing Cloud Engagement are built on the same technical platform.',
      options: ['True', 'False'],
      correctAnswer: 'False',
      funFact: 'Account Engagement lives on Salesforce Core. MC Engagement is a completely separate platform from the ExactTarget acquisition. That gap is exactly why MC Growth and Advanced exist.',
    },
    {
      type: 'mcq',
      text: 'You check your Journey Builder campaign and the email open rate is 0%. What is the most likely explanation?',
      options: [
        'The send actually failed',
        'The audience segment was empty',
        'Apple Mail Privacy Protection inflated all other open rates',
        'The email landed in spam',
      ],
      correctAnswer: 'Apple Mail Privacy Protection inflated all other open rates',
      funFact: 'Since Apple MPP launched in 2021, open rates in MC Engagement became unreliable. Apple pre-fetches emails server-side, triggering the pixel regardless of actual opens. Click rate is now the metric that actually tells you something.',
    },
    {
      type: 'mcq',
      text: 'What was Marketing Cloud Growth / Advanced called before Salesforce renamed it?',
      options: [
        'MC Starter',
        'MC Core',
        'MC Next',
        'MC Essentials',
      ],
      correctAnswer: 'MC Next',
      funFact: 'Announced at Dreamforce 2023 as "Marketing Cloud Next", it was later split into Growth (entry level) and Advanced (full feature set). Built natively on Salesforce Core and Data Cloud.',
    },
    {
      type: 'truefalse',
      text: 'In Marketing Cloud Engagement, the default subscriber key is the contact\'s email address.',
      options: ['True', 'False'],
      correctAnswer: 'True',
      funFact: 'This trips up a lot of implementations. If a contact changes their email, you get a duplicate subscriber. Best practice is to set the subscriber key to a stable CRM ID from day one, but many orgs only discover this problem after going live.',
    },
    {
      type: 'mcq',
      text: 'In Account Engagement, what is "Engagement Studio"?',
      options: [
        'A template editor for emails',
        'A training portal',
        'A visual drag-and-drop lead nurture builder',
        'A campaign reporting dashboard',
      ],
      correctAnswer: 'A visual drag-and-drop lead nurture builder',
      funFact: 'Engagement Studio replaced "Drip Programs" in 2016. The big difference from Journey Builder: it is built for B2B with lead scoring triggers, sales handoffs, and CRM field updates baked in, not high-volume batch sending.',
    },
    {
      type: 'truefalse',
      text: 'In Marketing Cloud Growth and Advanced, you can trigger an email send directly from a Salesforce Flow without any API call or developer involvement.',
      options: ['True', 'False'],
      correctAnswer: 'True',
      funFact: 'Native Flow actions for sends are one of the biggest reasons to consider Growth over Engagement for new implementations. Any admin who can build a Flow can trigger a send, no integration layer needed.',
    },
    {
      type: 'mcq',
      text: 'Which Marketing Cloud product was formerly known as "Datorama"?',
      options: [
        'MC Account Engagement',
        'MC Personalization',
        'MC Intelligence',
        'MC Connect',
      ],
      correctAnswer: 'MC Intelligence',
      funFact: 'Salesforce acquired Datorama in 2018 and rebranded it to Marketing Cloud Intelligence in 2021. It pulls in data from Meta, Google, LinkedIn, MC, and more to make cross-channel attribution actually usable.',
    },
  ],
};
