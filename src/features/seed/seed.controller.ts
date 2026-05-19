import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { connectToDatabase } from '../../lib/mongodb'
import User from '../../models/User'
import Client from '../../models/Client'
import ClientMembership from '../../models/ClientMembership'
import Project from '../../models/Project'
import Workflow from '../../models/Workflow'
import Batch from '../../models/Batch'
import Task from '../../models/Task'
import Review from '../../models/Review'
import Notification from '../../models/Notification'

const now = Date.now()
const ago = (ms: number) => new Date(now - ms)
const h = (n: number) => n * 60 * 60 * 1000
const d = (n: number) => n * 24 * 60 * 60 * 1000
const min = (n: number) => n * 60 * 1000

export async function run(_req: Request, res: Response) {
  try {
    await connectToDatabase()
    await Promise.all([User.deleteMany({}), Client.deleteMany({}), ClientMembership.deleteMany({}), Project.deleteMany({}), Workflow.deleteMany({}), Batch.deleteMany({}), Task.deleteMany({}), Review.deleteMany({}), Notification.deleteMany({})])

    const [pwSuper, pwAnnotator, pwAnnotator2, pwAnnotator3, pwAnnotator4, pwReviewer, pwQaLead, pwAdmin, pwTlAnnotator, pwTlAnnotator2, pwTlReviewer, pwTlAdmin] = await Promise.all([
      bcrypt.hash('superadmin123!', 12), bcrypt.hash('annotator123!', 12), bcrypt.hash('annotator123!', 12),
      bcrypt.hash('annotator123!', 12), bcrypt.hash('annotator123!', 12), bcrypt.hash('reviewer123!', 12),
      bcrypt.hash('reviewer123!', 12), bcrypt.hash('admin123!', 12), bcrypt.hash('annotator123!', 12),
      bcrypt.hash('annotator123!', 12), bcrypt.hash('reviewer123!', 12), bcrypt.hash('admin123!', 12),
    ])

    const [superAdmin, wanjiru, odhiambo, njeri, kipchoge, amina, mutua, zawadi] = await User.insertMany([
      { name: 'System Administrator', email: 'superadmin@labelforge.ai', passwordHash: pwSuper, role: 'super_admin', department: 'Platform', isActive: true, badges: [{ type: 'role', name: 'Super Admin', description: 'Full system access', awardedAt: ago(d(90)) }] },
      { name: 'Wanjiru Kamau', email: 'wanjiru.kamau@labelforge.ai', passwordHash: pwAnnotator, role: 'annotator', department: 'AI Data Team', isActive: true, badges: [{ type: 'role', name: 'Annotator', description: 'Certified annotator', awardedAt: ago(d(30)) }, { type: 'expertise', name: 'Agentic AI', description: 'Agentic AI specialist', awardedAt: ago(d(15)) }, { type: 'level', name: 'Senior', description: 'Senior-level contributor', awardedAt: ago(d(7)) }] },
      { name: 'Odhiambo Otieno', email: 'odhiambo.otieno@labelforge.ai', passwordHash: pwAnnotator2, role: 'annotator', department: 'AI Data Team', isActive: true, badges: [{ type: 'role', name: 'Annotator', description: 'Certified annotator', awardedAt: ago(d(20)) }] },
      { name: 'Njeri Mwangi', email: 'njeri.mwangi@labelforge.ai', passwordHash: pwAnnotator3, role: 'annotator', department: 'AI Data Team', isActive: true, badges: [{ type: 'role', name: 'Annotator', description: 'Certified annotator', awardedAt: ago(d(25)) }] },
      { name: 'Kipchoge Ruto', email: 'kipchoge.ruto@labelforge.ai', passwordHash: pwAnnotator4, role: 'reviewer_annotator', department: 'AI Data Team', isActive: true, badges: [{ type: 'role', name: 'Reviewer / Annotator', description: 'Dual-role: annotates and reviews tasks', awardedAt: ago(d(10)) }] },
      { name: 'Amina Hassan', email: 'amina.hassan@labelforge.ai', passwordHash: pwReviewer, role: 'reviewer', department: 'Quality Assurance', isActive: true, badges: [{ type: 'role', name: 'Reviewer', description: 'Certified QA reviewer', awardedAt: ago(d(40)) }] },
      { name: 'Mutua Kibet', email: 'mutua.kibet@labelforge.ai', passwordHash: pwQaLead, role: 'qa_lead', department: 'Quality Assurance', isActive: true, badges: [{ type: 'role', name: 'QA Lead', description: 'QA Lead reviewer', awardedAt: ago(d(18)) }] },
      { name: 'Zawadi Ndungu', email: 'zawadi.ndungu@labelforge.ai', passwordHash: pwAdmin, role: 'client_admin', department: 'Operations', isActive: true, badges: [{ type: 'role', name: 'Workspace Admin', description: 'Acme Corp administrator', awardedAt: ago(d(60)) }] },
    ])

    const [tlAdmin, tlReviewer, tlAnnotator1, tlAnnotator2] = await User.insertMany([
      { name: 'Fatima Al-Rashid', email: 'fatima.alrashid@labelforge.ai', passwordHash: pwTlAdmin, role: 'client_admin', department: 'Engineering', isActive: true, badges: [{ type: 'role', name: 'Workspace Admin', description: 'TechLab administrator', awardedAt: ago(d(45)) }] },
      { name: 'Marcus Osei', email: 'marcus.osei@labelforge.ai', passwordHash: pwTlReviewer, role: 'reviewer', department: 'Research', isActive: true, badges: [{ type: 'role', name: 'Reviewer', description: 'LLM reviewer', awardedAt: ago(d(30)) }] },
      { name: 'Priya Sharma', email: 'priya.sharma@labelforge.ai', passwordHash: pwTlAnnotator, role: 'annotator', department: 'Research', isActive: true, badges: [{ type: 'role', name: 'Annotator', description: 'Certified annotator', awardedAt: ago(d(20)) }] },
      { name: 'James Okonkwo', email: 'james.okonkwo@labelforge.ai', passwordHash: pwTlAnnotator2, role: 'annotator', department: 'Research', isActive: true, badges: [{ type: 'role', name: 'Annotator', description: 'Certified annotator', awardedAt: ago(d(15)) }] },
    ])

    const [acmeCorp, techLab] = await Client.insertMany([
      { name: 'Acme Corp', slug: 'acme-corp', description: 'Enterprise AI data annotation', plan: 'pro', isActive: true, createdBy: superAdmin._id },
      { name: 'TechLab', slug: 'techlab', description: 'AI training data platform', plan: 'starter', isActive: true, createdBy: superAdmin._id },
    ])

    await ClientMembership.insertMany([
      { userId: zawadi._id, tenantId: acmeCorp._id, role: 'client_admin', isActive: true, joinedAt: ago(d(60)) },
      { userId: amina._id, tenantId: acmeCorp._id, role: 'reviewer', isActive: true, joinedAt: ago(d(40)) },
      { userId: mutua._id, tenantId: acmeCorp._id, role: 'qa_lead', isActive: true, joinedAt: ago(d(35)) },
      { userId: wanjiru._id, tenantId: acmeCorp._id, role: 'annotator', isActive: true, joinedAt: ago(d(30)) },
      { userId: odhiambo._id, tenantId: acmeCorp._id, role: 'annotator', isActive: true, joinedAt: ago(d(28)) },
      { userId: njeri._id, tenantId: acmeCorp._id, role: 'annotator', isActive: true, joinedAt: ago(d(25)) },
      { userId: kipchoge._id, tenantId: acmeCorp._id, role: 'reviewer_annotator', isActive: true, joinedAt: ago(d(22)) },
      { userId: tlAdmin._id, tenantId: techLab._id, role: 'client_admin', isActive: true, joinedAt: ago(d(45)) },
      { userId: tlReviewer._id, tenantId: techLab._id, role: 'reviewer', isActive: true, joinedAt: ago(d(30)) },
      { userId: tlAnnotator1._id, tenantId: techLab._id, role: 'annotator', isActive: true, joinedAt: ago(d(20)) },
      { userId: tlAnnotator2._id, tenantId: techLab._id, role: 'annotator', isActive: true, joinedAt: ago(d(15)) },
    ])

    const [acmeProject, tlProject] = await Project.insertMany([
      { tenantId: acmeCorp._id, name: 'Agentic AI Evaluation', description: 'Browser-agent task evaluation', guidelines: '## Guidelines\n\n- Use the LabelForge browser extension\n- Document every UI state\n- Never enter real personal data', taskTypes: ['agentic-ai'], workflowStages: ['annotation', 'review', 'qa'], isActive: true, createdBy: zawadi._id },
      { tenantId: techLab._id, name: 'Agentic AI Evaluation', description: 'Agent task completion evaluation', guidelines: '## Guidelines\n\n- Follow the task steps precisely\n- Document every navigation state\n- Use test credentials only', taskTypes: ['agentic-ai'], workflowStages: ['annotation', 'review'], isActive: true, createdBy: tlAdmin._id },
    ])

    const everyone = [wanjiru._id, odhiambo._id, njeri._id, kipchoge._id, amina._id, mutua._id, zawadi._id]
    const [acWF] = await Workflow.insertMany([{ tenantId: acmeCorp._id, projectId: acmeProject._id, name: 'Agentic AI Evaluation', description: 'Evaluate AI agents completing multi-step browser tasks', type: 'agentic-ai', isActive: true, assignedUsers: everyone, createdBy: zawadi._id }])
    const [acBatch] = await Batch.insertMany([{ tenantId: acmeCorp._id, projectId: acmeProject._id, workflowId: acWF._id, workflowName: 'Agentic AI Evaluation', title: 'Agentic AI Tasks', description: 'Web navigation and interaction tasks', instructions: '1. Open the URL with the extension active\n2. Complete the task exactly as described\n3. Document every UI state\n4. Submit when all steps are complete', taskType: 'agentic-ai', priority: 0.90, workloadEstimate: 60, status: 'in-progress', tasksTotal: 8, tasksCompleted: 1, deadline: new Date(now + d(21)), createdBy: zawadi._id }])

    const acBase = { tenantId: acmeCorp._id, projectId: acmeProject._id, workflowId: acWF._id, workflowName: 'Agentic AI Evaluation', taskType: 'agentic-ai', batchId: acBatch._id, batchTitle: 'Agentic AI Tasks' }

    // startedAt derived from submittedAt - actualDuration so times are consistent
    const t3 = await Task.create({
      ...acBase,
      title: 'Find and apply to matching software engineering jobs',
      description: 'Browse job boards, filter software engineering roles matching a given profile, and simulate submitting an application with test data.',
      objective: 'Identify at least 3 matching roles and complete the application flow for each using provided test credentials.',
      successCriteria: ['Minimum 3 roles identified and applied to', 'Application confirmation screen captured for each', 'Test data used throughout — no real personal information entered'],
      subtasks: [
        { id: 'step-1', title: 'Search for software engineering roles', description: 'Use the search filters: Remote, Full-time, Software Engineer. Note the number of results.' },
        { id: 'step-2', title: 'Shortlist 3 matching job listings', description: 'Choose roles requiring 5+ years experience in React/Node.js. Read the full description for each.' },
        { id: 'step-3', title: 'Complete the application flow for each role', description: 'Fill all required fields using the test credentials provided. Do NOT enter real personal data.' },
        { id: 'step-4', title: 'Capture the application confirmation screen', description: 'Screenshot the confirmation page after each application is submitted.' },
      ],
      status: 'submitted', priority: 0.88, difficulty: 'hard', languageTags: ['en'],
      externalUrl: 'https://www.linkedin.com/jobs',
      estimatedDuration: 45, actualDuration: 42,
      annotatorId: odhiambo._id, annotatorEmail: odhiambo.email,
      startedAt: ago(h(1) + min(42)),
      submittedAt: ago(h(1)),
      notes: 'Applied to 3 matching roles with test data.',
      activityLog: [
        { action: 'claimed', userId: odhiambo._id.toString(), userEmail: odhiambo.email, timestamp: ago(h(1) + min(42)) },
        { action: 'submitted', userId: odhiambo._id.toString(), userEmail: odhiambo.email, comment: 'All application steps documented', timestamp: ago(h(1)) },
      ],
    })

    const t6 = await Task.create({
      ...acBase,
      title: 'Book the cheapest flight for a business trip',
      description: 'Search flight comparison tools, identify the lowest available fare for the trip route, and document the full booking flow up to payment confirmation.',
      objective: 'Find and document the cheapest available round-trip fare for the specified route and travel dates.',
      successCriteria: ['Lowest fare identified across at least 2 comparison tools', 'Booking flow documented from search to payment page', 'Fare breakdown and airline details captured'],
      subtasks: [
        { id: 'step-1', title: 'Search for available flights', description: 'Enter the provided route and travel dates. Check Google Flights and at least one other comparison tool.' },
        { id: 'step-2', title: 'Identify and record the cheapest fare', description: 'Note the airline, total price, layover details, and departure/arrival times for the lowest option.' },
        { id: 'step-3', title: 'Document the full booking flow', description: 'Navigate from search results through seat selection to the payment page. Stop before confirming payment. Screenshot each step.' },
      ],
      status: 'data-ready', isLocked: true, priority: 0.85, difficulty: 'medium', languageTags: ['en'],
      externalUrl: 'https://www.google.com/flights',
      estimatedDuration: 15, actualDuration: 13,
      annotatorId: odhiambo._id, annotatorEmail: odhiambo.email,
      reviewerId: amina._id, reviewerEmail: amina.email,
      qualityScore: 93, feedback: 'All required steps captured clearly.',
      startedAt: ago(d(3) + h(3) + min(13)),
      submittedAt: ago(d(3) + h(3)),
      completedAt: ago(d(2)), signedOffAt: ago(d(2)),
    })

    await Task.insertMany([
      {
        ...acBase,
        title: 'Schedule meetings by coordinating multiple calendars',
        description: 'Access multiple calendar accounts, identify availability gaps across participants, and schedule a meeting that works for all attendees within the specified window.',
        objective: 'Book a meeting slot that satisfies all participant availability constraints.',
        successCriteria: ['Availability checked across all provided calendars', 'Conflict-free slot identified and booked', 'Invites sent to all participants'],
        subtasks: [
          { id: 'step-1', title: 'Open all participant calendars', description: 'Access the calendar accounts for all participants listed in the task description.' },
          { id: 'step-2', title: 'Identify a conflict-free time slot', description: 'Find a 1-hour window within the next 5 business days that works for all attendees.' },
          { id: 'step-3', title: 'Create and send the meeting invite', description: 'Book the meeting and invite all participants. Include a brief agenda in the description.' },
        ],
        status: 'unclaimed', priority: 0.95, difficulty: 'easy', languageTags: ['en'],
        externalUrl: 'https://calendar.google.com', estimatedDuration: 10, sla: new Date(now + d(3)),
      },
      {
        ...acBase,
        title: 'Sort and prioritize incoming customer support emails',
        description: 'Open a customer support inbox, categorize emails by urgency and topic, and flag high-priority tickets for immediate attention.',
        objective: 'Triage all unread support emails into priority categories and surface critical issues.',
        successCriteria: ['All unread emails reviewed and categorized', 'High-priority tickets flagged with justification', 'Summary report of inbox state produced'],
        subtasks: [
          { id: 'step-1', title: 'Open the support inbox', description: 'Access the shared support email inbox and identify all unread messages.' },
          { id: 'step-2', title: 'Categorize all unread emails', description: 'Sort emails into: Urgent, High Priority, Normal, and Low Priority categories based on content and subject.' },
          { id: 'step-3', title: 'Flag high-priority tickets', description: 'Mark urgent and high-priority emails with the appropriate label. Add a one-line justification note to each.' },
          { id: 'step-4', title: 'Produce an inbox triage summary', description: 'List the total count per category and the top 3 most urgent issues requiring immediate action.' },
        ],
        status: 'in-progress', priority: 0.90, difficulty: 'medium', languageTags: ['en'],
        externalUrl: 'https://mail.google.com', estimatedDuration: 12,
        annotatorId: wanjiru._id, annotatorEmail: wanjiru.email,
        startedAt: ago(h(2)), sla: new Date(now + d(2)),
        activityLog: [{ action: 'claimed', userId: wanjiru._id.toString(), userEmail: wanjiru.email, timestamp: ago(h(2)) }],
      },
      {
        ...acBase,
        title: 'Compare insurance plans and recommend the best option',
        description: 'Browse insurance marketplaces, compare plan premiums, deductibles, and coverage options across at least three providers, then document the recommended choice with justification.',
        objective: 'Identify the best-value insurance plan for the given profile and budget.',
        successCriteria: ['At least 3 plans compared side-by-side', 'Premiums, deductibles, and coverage documented', 'Clear recommendation with rationale provided'],
        subtasks: [
          { id: 'step-1', title: 'Browse available insurance plans', description: 'Navigate to the plan comparison section of the marketplace and view all available options.' },
          { id: 'step-2', title: 'Compare at least 3 plans', description: 'Record premium, deductible, out-of-pocket maximum, and network type for each plan in a comparison table.' },
          { id: 'step-3', title: 'Document the recommended plan', description: 'State which plan offers the best value for the given profile and provide a written justification covering cost and coverage.' },
        ],
        status: 'in-review', priority: 0.85, difficulty: 'medium', languageTags: ['en'],
        externalUrl: 'https://www.healthcare.gov', estimatedDuration: 35,
        annotatorId: wanjiru._id, annotatorEmail: wanjiru.email,
        reviewerId: amina._id, reviewerEmail: amina.email,
        actualDuration: 32,
        startedAt: ago(h(4) + min(32)),
        submittedAt: ago(h(4)),
      },
      {
        ...acBase,
        title: 'Review contracts and highlight risky clauses',
        description: 'Open a sample contract document, identify liability, termination, and penalty clauses that carry legal or financial risk, and annotate each with an explanation of the risk.',
        objective: 'Produce a risk-annotated version of the contract with all high-risk clauses clearly marked.',
        successCriteria: ['All liability and termination clauses identified', 'Each risky clause annotated with risk type and severity', 'Summary of top 3 highest-risk provisions included'],
        subtasks: [
          { id: 'step-1', title: 'Read through the full contract', description: 'Open the sample contract in DocuSign. Read all sections before annotating anything.' },
          { id: 'step-2', title: 'Identify and highlight liability clauses', description: 'Locate all clauses covering liability limitations, indemnification, and damages caps. Highlight each one.' },
          { id: 'step-3', title: 'Identify termination and penalty clauses', description: 'Find all clauses covering contract termination, early-exit penalties, and breach remedies.' },
          { id: 'step-4', title: 'Annotate each risky clause', description: 'For each flagged clause, write a brief note explaining the risk type (financial, legal, operational) and severity (low/medium/high).' },
        ],
        status: 'revision-requested', priority: 0.82, difficulty: 'hard', languageTags: ['en'],
        externalUrl: 'https://www.docusign.com', estimatedDuration: 40,
        annotatorId: kipchoge._id, annotatorEmail: kipchoge.email,
        reviewerId: mutua._id, reviewerEmail: mutua.email,
        feedback: 'Risk annotations for section 3 clauses are missing context.',
        actualDuration: 36,
        startedAt: ago(h(10) + min(36)),
        submittedAt: ago(h(10)),
      },
      {
        ...acBase,
        title: 'Generate and send personalized sales outreach emails',
        description: 'Use prospect data to draft personalized outreach emails matching the specified tone and targeting criteria, then simulate sending to the target list.',
        objective: 'Produce one personalized email per prospect that references their company, role, and a relevant pain point.',
        successCriteria: ['Each email references prospect-specific details', 'Tone matches the provided brand guidelines', 'Sending flow documented up to confirmation screen'],
        subtasks: [
          { id: 'step-1', title: 'Review the prospect data sheet', description: 'Open the provided prospect list and read each company name, contact role, and noted pain point.' },
          { id: 'step-2', title: 'Draft a personalized email per prospect', description: 'Reference the prospect\'s company, their specific role, and a pain point in each email body. Keep under 200 words.' },
          { id: 'step-3', title: 'Verify tone against brand guidelines', description: 'Re-read each draft and ensure the tone is professional, consultative, and matches the brand voice document.' },
          { id: 'step-4', title: 'Simulate sending and capture confirmation', description: 'Use the test send flow in the mail client. Screenshot the confirmation screen for each email. Do not send to real addresses.' },
        ],
        status: 'rejected', priority: 0.80, difficulty: 'medium', languageTags: ['en'],
        externalUrl: 'https://mail.google.com', estimatedDuration: 18,
        annotatorId: njeri._id, annotatorEmail: njeri.email,
        reviewerId: mutua._id, reviewerEmail: mutua.email,
        feedback: 'Emails were generic and did not reflect the personalization criteria specified.',
        actualDuration: 20,
        startedAt: ago(d(1) + h(8) + min(20)),
        submittedAt: ago(d(1) + h(8)),
      },
      {
        ...acBase,
        title: 'Track package deliveries and notify users of delays',
        description: 'Look up shipment tracking numbers on the carrier portal, check estimated delivery dates, and flag packages that are delayed or stuck in transit.',
        objective: 'Identify all delayed shipments and produce a notification-ready delay report for each affected user.',
        successCriteria: ['All tracking numbers checked against carrier data', 'Delayed shipments identified with reason and new ETA', 'User notification content drafted for each delay'],
        subtasks: [
          { id: 'step-1', title: 'Open the carrier tracking portal', description: 'Navigate to UPS Tracking. Enter each shipment tracking number from the provided list.' },
          { id: 'step-2', title: 'Check status and estimated delivery for each shipment', description: 'Record the current status, estimated delivery date, and last scan location for every package.' },
          { id: 'step-3', title: 'Flag delayed or stuck shipments', description: 'Identify any package where the estimated delivery date has passed or status has not updated in 48+ hours.' },
          { id: 'step-4', title: 'Draft user notification content', description: 'For each delayed shipment, write a brief notification message including the new ETA and reason for delay (if shown).' },
        ],
        status: 'unclaimed', priority: 0.78, difficulty: 'easy', languageTags: ['en'],
        externalUrl: 'https://www.ups.com/track', estimatedDuration: 8, sla: new Date(now + d(8)),
      },
    ])

    await Task.insertMany([
      {
        ...acBase,
        title: 'Monitor competitor pricing and generate a daily report',
        description: 'Visit competitor product pages, record current pricing for a defined list of tracked SKUs, and compile findings into a structured daily report.',
        objective: 'Capture up-to-date competitor prices for all tracked SKUs and surface any significant price changes.',
        successCriteria: ['All tracked SKUs checked across competitor sites', 'Price changes of >5% flagged', 'Structured report produced in the required format'],
        subtasks: [
          { id: 'step-1', title: 'Visit competitor product pages', description: 'Navigate to each competitor listed in the task. Search for the tracked SKUs by name or product code.' },
          { id: 'step-2', title: 'Record current pricing for each SKU', description: 'Note the listed price, any sale price, and availability status. Check at least 2 competitor sites per SKU.' },
          { id: 'step-3', title: 'Flag price changes greater than 5%', description: 'Compare today\'s prices against the baseline prices in the reference sheet. Flag any change above 5%.' },
          { id: 'step-4', title: 'Compile the daily pricing report', description: 'Organize findings in the required format: SKU, baseline price, current price, % change, competitor source.' },
        ],
        status: 'unclaimed', priority: 0.76, difficulty: 'medium', languageTags: ['en'],
        externalUrl: 'https://www.amazon.com', estimatedDuration: 20,
      },
      {
        ...acBase,
        title: 'Research and summarize market trends in a target industry',
        description: 'Search industry news sources and analyst reports for the target sector, extract key emerging trends, and produce a concise executive summary.',
        objective: 'Deliver a 1-page executive summary of the top 5 market trends shaping the target industry this quarter.',
        successCriteria: ['At least 5 credible sources consulted', 'Top 5 trends identified with supporting evidence', 'Summary structured for an executive audience'],
        subtasks: [
          { id: 'step-1', title: 'Search industry news sources', description: 'Use Google Trends and at least 2 industry publications. Search for the target sector over the last 90 days.' },
          { id: 'step-2', title: 'Identify top 5 emerging trends', description: 'Note recurring themes across sources. Select the 5 most prominent trends with the strongest evidence.' },
          { id: 'step-3', title: 'Gather supporting evidence for each trend', description: 'Find at least one credible source (analyst report, news article, or data chart) for each identified trend.' },
          { id: 'step-4', title: 'Write the executive summary', description: 'Produce a concise 1-page summary: one paragraph per trend, written for a non-technical executive audience.' },
        ],
        status: 'unclaimed', priority: 0.75, difficulty: 'medium', languageTags: ['en'],
        externalUrl: 'https://trends.google.com', estimatedDuration: 30,
      },
      {
        ...acBase,
        title: 'Detect fraudulent transactions and flag suspicious activity',
        description: 'Review a transaction dataset, apply fraud detection heuristics, and flag entries that match suspicious patterns such as unusual amounts, velocities, or geolocations.',
        objective: 'Identify all transactions that breach fraud thresholds and produce a prioritised alert list.',
        successCriteria: ['All transactions reviewed against defined rules', 'Suspicious entries flagged with rule matched', 'Risk score assigned to each flagged transaction'],
        subtasks: [
          { id: 'step-1', title: 'Open the transaction dataset in Stripe Radar', description: 'Navigate to the Radar dashboard and locate the transaction list for the defined review period.' },
          { id: 'step-2', title: 'Apply fraud detection heuristics', description: 'Review each transaction against the rules: unusual amount (>3× average), rapid velocity (5+ transactions in 10 min), mismatched geolocation.' },
          { id: 'step-3', title: 'Flag suspicious transactions', description: 'Mark each suspicious entry with the rule it breached. Do not block — only flag for review.' },
          { id: 'step-4', title: 'Assign risk scores and produce the alert list', description: 'Score each flagged transaction: High (≥2 rules), Medium (1 rule). Produce a prioritized list with amounts and reasons.' },
        ],
        status: 'unclaimed', priority: 0.74, difficulty: 'hard', languageTags: ['en'],
        externalUrl: 'https://stripe.com/radar', estimatedDuration: 25,
      },
      {
        ...acBase,
        title: 'Scrape product reviews and summarize customer sentiment',
        description: 'Collect customer reviews from product listings, analyse sentiment across star ratings, and produce a summary report highlighting key positive and negative themes.',
        objective: 'Produce a sentiment summary report covering at least 100 reviews with actionable insight themes.',
        successCriteria: ['Minimum 100 reviews collected', 'Sentiment classified as positive, neutral, or negative', 'Top 3 positive and top 3 negative themes identified'],
        subtasks: [
          { id: 'step-1', title: 'Navigate to the target product listing', description: 'Find the specified product on Amazon. Sort reviews by "Most Recent" and note total review count.' },
          { id: 'step-2', title: 'Collect at least 100 reviews', description: 'Read through reviews across multiple pages. Note star rating and key phrases for at least 100 entries.' },
          { id: 'step-3', title: 'Classify sentiment for collected reviews', description: 'Categorize each review as Positive (4–5 stars), Neutral (3 stars), or Negative (1–2 stars).' },
          { id: 'step-4', title: 'Identify top themes and write summary', description: 'List the top 3 most common positive themes and top 3 most common negative themes. Write a 2-paragraph summary.' },
        ],
        status: 'unclaimed', priority: 0.73, difficulty: 'medium', languageTags: ['en'],
        externalUrl: 'https://www.amazon.com', estimatedDuration: 28,
      },
      {
        ...acBase,
        title: 'Automatically generate invoices and send payment reminders',
        description: 'Use client billing data to generate invoice documents, attach them to reminder emails, and simulate sending to accounts with overdue balances.',
        objective: 'Generate and dispatch invoices and reminders for all outstanding accounts in the billing queue.',
        successCriteria: ['Invoice generated for each overdue account', 'Reminder email drafted with correct payment details', 'Sending flow documented up to dispatch confirmation'],
        subtasks: [
          { id: 'step-1', title: 'Open the invoicing dashboard', description: 'Navigate to Wave Invoicing and locate the list of overdue accounts.' },
          { id: 'step-2', title: 'Generate an invoice for each overdue account', description: 'Create a new invoice per account using the billing data provided. Verify amounts match the ledger.' },
          { id: 'step-3', title: 'Draft the payment reminder email', description: 'Attach the invoice to a reminder email. Include the due date, outstanding amount, and payment link.' },
          { id: 'step-4', title: 'Simulate sending and capture confirmation', description: 'Use the test sending mode. Screenshot the dispatch confirmation for each account.' },
        ],
        status: 'unclaimed', priority: 0.72, difficulty: 'easy', languageTags: ['en'],
        externalUrl: 'https://www.wave.com/en/invoicing', estimatedDuration: 14,
      },
      {
        ...acBase,
        title: 'Search for scholarship opportunities and prepare applications',
        description: 'Search scholarship databases using the student profile criteria, shortlist matching opportunities, and draft application answers aligned to each scholarship\'s requirements.',
        objective: 'Identify at least 5 eligible scholarships and prepare a complete draft application for each.',
        successCriteria: ['At least 5 matching scholarships identified', 'Eligibility verified for each shortlisted opportunity', 'Draft application prepared per scholarship requirements'],
        subtasks: [
          { id: 'step-1', title: 'Search the scholarship database', description: 'Use the search filters on Fastweb matching the student profile: GPA, field of study, location, and income level.' },
          { id: 'step-2', title: 'Shortlist at least 5 eligible scholarships', description: 'Verify eligibility criteria for each result. Select a minimum of 5 that the student qualifies for.' },
          { id: 'step-3', title: 'Review application requirements for each', description: 'Note the required essays, documents, and deadlines for each shortlisted scholarship.' },
          { id: 'step-4', title: 'Draft the application responses', description: 'Write a tailored draft response for each required essay question. Align content to the scholarship\'s stated values and criteria.' },
        ],
        status: 'unclaimed', priority: 0.71, difficulty: 'hard', languageTags: ['en'],
        externalUrl: 'https://www.fastweb.com', estimatedDuration: 50,
      },
      {
        ...acBase,
        title: 'Identify and fix broken links across a website',
        description: 'Crawl a target website to detect broken or redirected hyperlinks, document each occurrence with its location and error code, and suggest replacement URLs.',
        objective: 'Produce a full broken-link audit report with suggested fixes for every failing URL.',
        successCriteria: ['All pages crawled and links tested', 'Each broken link documented with page URL and error code', 'Replacement URL suggested or removal recommended'],
        subtasks: [
          { id: 'step-1', title: 'Run the link checker', description: 'Enter the target site URL into the W3C Link Checker. Wait for the full crawl to complete.' },
          { id: 'step-2', title: 'Document all broken and redirected links', description: 'For each error, record: the page containing the link, the broken URL, and the HTTP error code (404, 301, etc.).' },
          { id: 'step-3', title: 'Suggest replacement URLs or removal', description: 'For each broken link, either find a valid replacement URL or recommend removing the link entirely. Note your reasoning.' },
        ],
        status: 'unclaimed', priority: 0.70, difficulty: 'easy', languageTags: ['en'],
        externalUrl: 'https://validator.w3.org/checklink', estimatedDuration: 16,
      },
      {
        ...acBase,
        title: 'Monitor cloud infrastructure and restart failed services',
        description: 'Check cloud service dashboards for failed or degraded instances, trigger restarts for unhealthy services, and log all recovery actions taken.',
        objective: 'Restore all degraded services to healthy status and produce a recovery log.',
        successCriteria: ['All services checked against health thresholds', 'Failed services restarted and confirmed healthy', 'Recovery log produced with timestamps and actions'],
        subtasks: [
          { id: 'step-1', title: 'Open the AWS Management Console', description: 'Navigate to EC2 and ECS dashboards. Note all instances and services showing "stopped", "unhealthy", or "degraded" status.' },
          { id: 'step-2', title: 'Restart failed services', description: 'For each unhealthy service, initiate a restart. Wait for status to return to "running" or "healthy" before moving on.' },
          { id: 'step-3', title: 'Confirm recovery and log all actions', description: 'Verify each restarted service is healthy. Record the service name, failure time, restart time, and current status.' },
        ],
        status: 'unclaimed', priority: 0.69, difficulty: 'medium', languageTags: ['en'],
        externalUrl: 'https://console.aws.amazon.com', estimatedDuration: 12,
      },
      {
        ...acBase,
        title: 'Generate weekly SEO keyword opportunity reports',
        description: 'Analyse search performance data, identify low-competition keywords with high impression potential, and compile a weekly opportunity report with prioritised recommendations.',
        objective: 'Surface the top 10 keyword opportunities the site should target this week.',
        successCriteria: ['Search performance data reviewed for the past 7 days', 'Top 10 keyword opportunities ranked by potential impact', 'Recommended action included for each keyword'],
        subtasks: [
          { id: 'step-1', title: 'Open Google Search Console', description: 'Navigate to the Performance report. Set date range to last 7 days and view the Queries tab.' },
          { id: 'step-2', title: 'Identify low-competition, high-impression keywords', description: 'Filter for queries with >500 impressions and <10 average position. These are ranking gaps with high potential.' },
          { id: 'step-3', title: 'Rank the top 10 opportunities', description: 'Sort by impression volume. Select the top 10 keywords and note current position, impressions, and clicks.' },
          { id: 'step-4', title: 'Write actionable recommendations', description: 'For each of the 10 keywords, write one specific recommendation (e.g., "Add keyword to H2 on /pricing page").' },
        ],
        status: 'unclaimed', priority: 0.68, difficulty: 'easy', languageTags: ['en'],
        externalUrl: 'https://search.google.com/search-console', estimatedDuration: 18,
      },
      {
        ...acBase,
        title: 'Manage freelancer onboarding and document verification',
        description: 'Review new freelancer profiles, verify submitted identification and portfolio documents against requirements, and approve or flag accounts for further review.',
        objective: 'Complete the onboarding review for all pending freelancer applications within the queue.',
        successCriteria: ['All submitted documents verified against requirements', 'Approved profiles activated in the platform', 'Flagged profiles documented with reason for review'],
        subtasks: [
          { id: 'step-1', title: 'Open the pending freelancer queue', description: 'Navigate to the Upwork admin panel. Filter applicants by "Pending Verification" status.' },
          { id: 'step-2', title: 'Review submitted identification documents', description: 'Check each uploaded ID for: legibility, name match, expiry date, and document type acceptability.' },
          { id: 'step-3', title: 'Review portfolio documents', description: 'Verify that portfolio samples are relevant, not plagiarised, and meet the minimum quality standard.' },
          { id: 'step-4', title: 'Approve or flag each profile', description: 'Activate profiles that pass all checks. Flag any that fail with a documented reason for follow-up.' },
        ],
        status: 'unclaimed', priority: 0.67, difficulty: 'medium', languageTags: ['en'],
        externalUrl: 'https://www.upwork.com', estimatedDuration: 25,
      },
      {
        ...acBase,
        title: 'Match freelancers to suitable projects automatically',
        description: 'Analyse active project requirements and freelancer skill profiles, then generate a ranked list of suitable matches for each open project based on skills, availability, and past performance.',
        objective: 'Produce a ranked shortlist of at least 3 freelancer matches for every open project.',
        successCriteria: ['All open projects analysed for skill requirements', 'At least 3 ranked matches produced per project', 'Match rationale documented for each recommendation'],
        subtasks: [
          { id: 'step-1', title: 'Review open project requirements', description: 'Open each active project brief on Upwork. Note required skills, estimated hours, and budget range.' },
          { id: 'step-2', title: 'Search and shortlist matching freelancers', description: 'Use the talent search to find freelancers whose skills, availability, and ratings match each project\'s requirements.' },
          { id: 'step-3', title: 'Rank and document the matches', description: 'For each project, rank the top 3 freelancers by fit. Write one sentence explaining why each was selected.' },
        ],
        status: 'unclaimed', priority: 0.66, difficulty: 'easy', languageTags: ['en'],
        externalUrl: 'https://www.upwork.com', estimatedDuration: 10,
      },
      {
        ...acBase,
        title: 'Track stock prices and trigger trading alerts',
        description: 'Monitor a watchlist of stock tickers, detect price movements that breach defined threshold levels, and trigger structured alerts for each qualifying event.',
        objective: 'Issue a trading alert for every ticker that breaches its defined price threshold during the monitoring window.',
        successCriteria: ['All watchlist tickers monitored continuously', 'Threshold breaches detected within 1 minute', 'Alert includes ticker, current price, threshold, and recommended action'],
        subtasks: [
          { id: 'step-1', title: 'Open the stock watchlist on Yahoo Finance', description: 'Navigate to Yahoo Finance and load the watchlist provided in the task. Verify all tickers are loading.' },
          { id: 'step-2', title: 'Monitor prices against defined thresholds', description: 'Watch the live price feed for each ticker. The threshold values are listed in the task data sheet.' },
          { id: 'step-3', title: 'Trigger and document alerts for breaches', description: 'For any ticker that crosses its threshold, record: ticker symbol, breach time, current price, threshold level, and recommended action (buy/sell/hold).' },
        ],
        status: 'unclaimed', priority: 0.65, difficulty: 'easy', languageTags: ['en'],
        externalUrl: 'https://finance.yahoo.com', estimatedDuration: 5,
      },
      {
        ...acBase,
        title: 'Monitor cryptocurrency markets and rebalance portfolios',
        description: 'Track cryptocurrency prices across a defined portfolio, calculate allocation drift from target weights, and recommend specific rebalancing trades to restore target allocation.',
        objective: 'Identify all assets with allocation drift >5% and produce a rebalancing trade plan.',
        successCriteria: ['Current allocation calculated for all portfolio assets', 'Drift identified for each asset against target weight', 'Trade plan produced to restore target allocation'],
        subtasks: [
          { id: 'step-1', title: 'Open the portfolio on Coinbase', description: 'Log in to the Coinbase account and navigate to the Portfolio view. Note current holdings and values.' },
          { id: 'step-2', title: 'Calculate current allocation percentages', description: 'Divide each asset\'s current value by the total portfolio value. Record the result as a percentage.' },
          { id: 'step-3', title: 'Compare against target weights', description: 'Compare each asset\'s current allocation to its target weight from the task data sheet. Flag any drift exceeding 5%.' },
          { id: 'step-4', title: 'Produce a rebalancing trade plan', description: 'For each drifted asset, specify whether to buy or sell, and the approximate amount needed to restore the target allocation.' },
        ],
        status: 'unclaimed', priority: 0.64, difficulty: 'hard', languageTags: ['en'],
        externalUrl: 'https://www.coinbase.com', estimatedDuration: 12,
      },
      {
        ...acBase,
        title: 'Research suppliers and compare procurement options',
        description: 'Search supplier directories for required goods, compare pricing, lead times, and minimum order quantities across at least five suppliers, and summarise findings in a procurement comparison report.',
        objective: 'Identify the optimal supplier for each required item based on price, lead time, and reliability.',
        successCriteria: ['At least 5 suppliers evaluated per item category', 'Pricing, lead time, and MOQ documented for each', 'Recommended supplier identified with justification'],
        subtasks: [
          { id: 'step-1', title: 'Search Alibaba for suppliers', description: 'Search for each required item category. Filter by Trade Assurance and minimum 4-star supplier rating.' },
          { id: 'step-2', title: 'Evaluate at least 5 suppliers per category', description: 'For each shortlisted supplier, record: unit price, minimum order quantity (MOQ), lead time, and shipping cost.' },
          { id: 'step-3', title: 'Identify the recommended supplier', description: 'Select the best supplier per item category based on total cost, reliability indicators, and lead time. Justify the choice.' },
        ],
        status: 'unclaimed', priority: 0.63, difficulty: 'medium', languageTags: ['en'],
        externalUrl: 'https://www.alibaba.com', estimatedDuration: 30,
      },
    ])

    await Batch.findByIdAndUpdate(acBatch._id, { tasksTotal: 22, tasksCompleted: 1 })
    await Review.insertMany([
      { tenantId: acmeCorp._id, projectId: acmeProject._id, workflowId: acWF._id, taskId: t3._id, taskTitle: t3.title, batchId: acBatch._id, batchTitle: acBatch.title, annotatorId: odhiambo._id, annotatorEmail: odhiambo.email, annotatorName: odhiambo.name, status: 'pending', submittedAt: ago(h(1)) },
      { tenantId: acmeCorp._id, projectId: acmeProject._id, workflowId: acWF._id, taskId: t6._id, taskTitle: t6.title, batchId: acBatch._id, batchTitle: acBatch.title, annotatorId: odhiambo._id, annotatorEmail: odhiambo.email, annotatorName: odhiambo.name, reviewerId: amina._id, reviewerEmail: amina.email, reviewerName: amina.name, status: 'approved', decision: 'approve', qualityScore: 93, comments: 'All required steps captured clearly.', submittedAt: ago(d(3) + h(3)), reviewedAt: ago(d(2)) },
    ])

    const tlEveryone = [tlAdmin._id, tlReviewer._id, tlAnnotator1._id, tlAnnotator2._id]
    const [tlWF] = await Workflow.insertMany([{ tenantId: techLab._id, projectId: tlProject._id, name: 'Agentic AI Evaluation', description: 'Evaluate AI agents completing multi-step browser tasks', type: 'agentic-ai', isActive: true, assignedUsers: tlEveryone, createdBy: tlAdmin._id }])
    const [tlBatch] = await Batch.insertMany([{ tenantId: techLab._id, projectId: tlProject._id, workflowId: tlWF._id, workflowName: 'Agentic AI Evaluation', title: 'Agentic AI Tasks', description: 'Browser-based agent task evaluation', instructions: '1. Open the URL before starting\n2. Complete the full task flow\n3. Document every meaningful state change', taskType: 'agentic-ai', priority: 0.85, workloadEstimate: 30, status: 'in-progress', tasksTotal: 5, tasksCompleted: 1, deadline: new Date(now + d(14)), createdBy: tlAdmin._id }])

    const tlBase = { tenantId: techLab._id, projectId: tlProject._id, workflowId: tlWF._id, workflowName: 'Agentic AI Evaluation', taskType: 'agentic-ai', batchId: tlBatch._id, batchTitle: 'Agentic AI Tasks' }

    const tl4 = await Task.create({
      ...tlBase,
      title: 'Monitor social media mentions and respond to comments',
      description: 'Search for brand mentions across social media platforms, categorise by sentiment, and draft appropriate responses for each comment requiring a reply.',
      objective: 'Ensure all brand mentions are reviewed and all comments requiring a response have a drafted reply ready for approval.',
      successCriteria: ['All mentions from the past 24 hours reviewed', 'Sentiment classified for each mention', 'Response drafted for every comment requiring engagement'],
      subtasks: [
        { id: 'step-1', title: 'Search for brand mentions on X/Twitter', description: 'Search for the brand handle and key product names. Filter to posts from the last 24 hours.' },
        { id: 'step-2', title: 'Classify sentiment for each mention', description: 'Label each mention as Positive, Neutral, or Negative based on tone and content.' },
        { id: 'step-3', title: 'Draft responses for comments requiring engagement', description: 'Write a reply for any comment that asks a question, expresses a complaint, or has significant engagement (>10 likes/replies).' },
      ],
      status: 'data-ready', isLocked: true, priority: 0.82, difficulty: 'easy', languageTags: ['en'],
      externalUrl: 'https://twitter.com',
      estimatedDuration: 15, actualDuration: 14,
      annotatorId: tlAnnotator1._id, annotatorEmail: tlAnnotator1.email,
      reviewerId: tlReviewer._id, reviewerEmail: tlReviewer.email,
      qualityScore: 91, feedback: 'Brand mention discovery and comment response flow clearly captured.',
      startedAt: ago(d(4) + h(2) + min(14)),
      submittedAt: ago(d(4) + h(2)),
      completedAt: ago(d(3)), signedOffAt: ago(d(3)),
    })

    await Task.insertMany([
      {
        ...tlBase,
        title: 'Analyze website analytics and recommend optimizations',
        description: 'Review website traffic reports, identify underperforming pages and high bounce-rate sources, and recommend specific optimisation actions with expected impact.',
        objective: 'Deliver a prioritised optimisation action plan based on the latest analytics data.',
        successCriteria: ['Traffic and engagement metrics reviewed for the past 30 days', 'Top 5 underperforming pages identified', 'Specific optimisation recommendation provided for each'],
        subtasks: [
          { id: 'step-1', title: 'Open the Google Analytics dashboard', description: 'Navigate to the Engagement → Pages and screens report. Set date range to the last 30 days.' },
          { id: 'step-2', title: 'Identify top 5 underperforming pages', description: 'Sort by bounce rate (descending) and sessions. Select the 5 pages with high traffic but poor engagement.' },
          { id: 'step-3', title: 'Write optimization recommendations', description: 'For each underperforming page, provide one specific actionable recommendation (e.g., improve CTA, reduce page load time, rewrite headline).' },
        ],
        status: 'unclaimed', priority: 0.90, difficulty: 'easy', languageTags: ['en'],
        externalUrl: 'https://analytics.google.com', estimatedDuration: 22,
      },
      {
        ...tlBase,
        title: 'Monitor news sources and summarize relevant updates',
        description: 'Scan configured news sources for stories matching the target topics, filter by relevance and recency, and produce a structured daily briefing with source links.',
        objective: 'Deliver a concise daily news briefing covering all relevant developments on the monitored topics.',
        successCriteria: ['All configured news sources checked', 'Articles filtered to those directly relevant to target topics', 'Briefing structured with headline, summary, and source link per item'],
        subtasks: [
          { id: 'step-1', title: 'Search Google News for target topics', description: 'Use the configured search terms on Google News. Filter to the last 24 hours. Note all relevant stories.' },
          { id: 'step-2', title: 'Filter articles by relevance', description: 'Discard articles that only tangentially mention the topic. Keep only those directly relevant to the monitoring brief.' },
          { id: 'step-3', title: 'Produce the daily briefing', description: 'For each selected article, write: headline, 2-sentence summary, and source URL. Format for easy skim-reading.' },
        ],
        status: 'in-progress', priority: 0.85, difficulty: 'easy', languageTags: ['en'],
        externalUrl: 'https://news.google.com', estimatedDuration: 15,
        annotatorId: tlAnnotator1._id, annotatorEmail: tlAnnotator1.email,
        startedAt: ago(h(1) + min(30)),
        activityLog: [{ action: 'claimed', userId: tlAnnotator1._id.toString(), userEmail: tlAnnotator1.email, timestamp: ago(h(1) + min(30)) }],
      },
      {
        ...tlBase,
        title: 'Generate meeting summaries and assign action items',
        description: 'Process a meeting transcript or recording, extract key decisions and discussions, and produce a formatted summary with clearly assigned action items and owners.',
        objective: 'Produce a meeting summary document with all decisions recorded and every action item assigned to a named owner with a due date.',
        successCriteria: ['All agenda items covered in the summary', 'Every action item assigned to a specific owner', 'Due dates included for all action items'],
        subtasks: [
          { id: 'step-1', title: 'Open and review the meeting transcript', description: 'Load the transcript or recording in Otter.ai. Read or listen through the full meeting.' },
          { id: 'step-2', title: 'Extract key decisions and discussion points', description: 'Note all decisions made and significant discussion points for each agenda item.' },
          { id: 'step-3', title: 'Identify and assign action items', description: 'List every action item mentioned. Assign each to a specific named owner with a clear due date.' },
          { id: 'step-4', title: 'Format and produce the final summary', description: 'Write the summary in the required format: intro, decisions, action items table, and next meeting date.' },
        ],
        status: 'submitted', priority: 0.80, difficulty: 'easy', languageTags: ['en'],
        externalUrl: 'https://otter.ai', estimatedDuration: 8, actualDuration: 7,
        annotatorId: tlAnnotator2._id, annotatorEmail: tlAnnotator2.email,
        startedAt: ago(h(0) + min(30) + min(7)),
        submittedAt: ago(min(30)),
      },
      {
        ...tlBase,
        title: 'Plan travel itineraries including hotels and transport',
        description: 'Research flights, hotel options, and ground transport for the specified trip dates and destinations, then compile a complete day-by-day itinerary with booking links and cost estimates.',
        objective: 'Produce a complete, bookable travel itinerary covering all legs of the trip with cost estimates.',
        successCriteria: ['Flights identified for all route legs', 'Hotel options compared and recommended for each destination', 'Ground transport between stops documented with options and costs'],
        subtasks: [
          { id: 'step-1', title: 'Search for flights for all route legs', description: 'Use Expedia to find flights for each leg of the trip. Record 2 options per leg with price and times.' },
          { id: 'step-2', title: 'Compare hotel options for each destination', description: 'Search hotels near the destination for the stay dates. Compare at least 2 options on price, rating, and location.' },
          { id: 'step-3', title: 'Research ground transport between stops', description: 'Find options for getting between the airport and hotel, and between each destination. Note taxi, shuttle, or public transit costs.' },
          { id: 'step-4', title: 'Compile the day-by-day itinerary', description: 'Produce a structured itinerary with times, options, booking links, and estimated costs for each leg and night.' },
        ],
        status: 'revision-requested', priority: 0.75, difficulty: 'medium', languageTags: ['en'],
        externalUrl: 'https://www.expedia.com', estimatedDuration: 25, actualDuration: 23,
        annotatorId: tlAnnotator2._id, annotatorEmail: tlAnnotator2.email,
        reviewerId: tlReviewer._id, reviewerEmail: tlReviewer.email,
        feedback: 'Hotel options were listed but transport connections between stops are missing.',
        startedAt: ago(d(1) + h(3) + min(23)),
        submittedAt: ago(d(1) + h(3)),
      },
    ])

    await Task.insertMany([
      {
        ...tlBase,
        title: 'Generate personalized learning plans for students',
        description: 'Assess a student\'s current skill level and learning goals, then build a structured weekly learning plan with recommended resources, exercises, and progress milestones.',
        objective: 'Produce a personalised 4-week learning plan tailored to the student\'s goals and current level.',
        successCriteria: ['Student skill level and goals assessed', 'Weekly schedule with resources specified for all 4 weeks', 'Progress milestones defined and measurable'],
        subtasks: [
          { id: 'step-1', title: 'Assess the student\'s current skill level', description: 'Review the student\'s self-assessment form and any provided test results. Identify knowledge gaps.' },
          { id: 'step-2', title: 'Define weekly learning goals', description: 'Break the overall goal into 4 weekly milestones. Each milestone should be specific and measurable.' },
          { id: 'step-3', title: 'Select resources for each week', description: 'Find Khan Academy resources matching each weekly goal. Include videos, exercises, and one optional reading.' },
          { id: 'step-4', title: 'Compile the 4-week plan', description: 'Format the plan as a week-by-week table with: goal, daily schedule, resources, and how to measure completion.' },
        ],
        status: 'unclaimed', priority: 0.74, difficulty: 'medium', languageTags: ['en'],
        externalUrl: 'https://www.khanacademy.org', estimatedDuration: 20,
      },
      {
        ...tlBase,
        title: 'Audit website accessibility issues and suggest fixes',
        description: 'Run accessibility checks against a target website, catalogue all WCAG violations by severity, and provide specific remediation recommendations for each issue found.',
        objective: 'Deliver a complete WCAG accessibility audit report with actionable fixes for every violation.',
        successCriteria: ['All pages checked against WCAG 2.1 AA criteria', 'Violations catalogued by severity (critical, major, minor)', 'Specific code-level fix recommended for each violation'],
        subtasks: [
          { id: 'step-1', title: 'Run the WAVE accessibility checker', description: 'Enter the target site URL in WAVE. Run the check and wait for the full report.' },
          { id: 'step-2', title: 'Catalogue all WCAG violations', description: 'List each violation with: element location, WCAG criterion violated, and severity (critical/major/minor).' },
          { id: 'step-3', title: 'Write code-level fix recommendations', description: 'For each violation, provide a specific fix — e.g., "Add alt=\"...\" to <img> on /about page", or "Increase contrast ratio from 2.8:1 to 4.5:1".' },
        ],
        status: 'unclaimed', priority: 0.73, difficulty: 'medium', languageTags: ['en'],
        externalUrl: 'https://wave.webaim.org', estimatedDuration: 18,
      },
      {
        ...tlBase,
        title: 'Generate code, run tests, and open pull requests',
        description: 'Implement the described feature or bug fix in code, execute the test suite to verify correctness, and open a pull request with a clear description of the changes and test results.',
        objective: 'Deliver a working, tested implementation via a pull request that passes all CI checks.',
        successCriteria: ['Feature implemented according to specification', 'All existing tests passing after changes', 'Pull request opened with description, test results, and review checklist'],
        subtasks: [
          { id: 'step-1', title: 'Read the feature specification', description: 'Review the linked GitHub issue or task brief. Understand the expected behaviour and edge cases.' },
          { id: 'step-2', title: 'Implement the feature or bug fix', description: 'Write the code changes in the correct files. Follow the existing code style and patterns.' },
          { id: 'step-3', title: 'Run the test suite', description: 'Execute the full test suite. All existing tests must pass. Add new tests for any new behaviour introduced.' },
          { id: 'step-4', title: 'Open a pull request', description: 'Create a PR with a descriptive title, summary of changes, test results screenshot, and a review checklist.' },
        ],
        status: 'unclaimed', priority: 0.72, difficulty: 'hard', languageTags: ['en'],
        externalUrl: 'https://github.com', estimatedDuration: 35,
      },
      {
        ...tlBase,
        title: 'Monitor API performance and investigate outages',
        description: 'Review API response-time and error-rate metrics across all endpoints, identify degraded or failing services, and produce an incident report with root-cause analysis and recommended remediation.',
        objective: 'Identify all API endpoints exceeding SLA thresholds and deliver a root-cause report with fix recommendations.',
        successCriteria: ['All endpoints checked against response-time and error-rate SLAs', 'Degraded endpoints identified with supporting metrics', 'Root-cause analysis and remediation steps documented for each'],
        subtasks: [
          { id: 'step-1', title: 'Open the status page and metrics dashboard', description: 'Navigate to Statuspage.io and review the active incidents panel. Note any current degradations.' },
          { id: 'step-2', title: 'Identify endpoints exceeding SLA thresholds', description: 'Check the metrics for each endpoint. Flag any with p95 latency >500ms or error rate >1% in the last hour.' },
          { id: 'step-3', title: 'Investigate root cause for each degraded endpoint', description: 'Review logs, recent deployments, and upstream dependencies for each flagged endpoint. Identify the most likely cause.' },
          { id: 'step-4', title: 'Produce the incident report', description: 'Write a structured report per degraded endpoint: endpoint name, metric values, root cause, and recommended remediation steps.' },
        ],
        status: 'unclaimed', priority: 0.71, difficulty: 'medium', languageTags: ['en'],
        externalUrl: 'https://www.statuspage.io', estimatedDuration: 12,
      },
      {
        ...tlBase,
        title: 'Screen resumes and shortlist qualified candidates',
        description: 'Review a batch of applicant resumes against the job specification, score each candidate on defined criteria, and produce a ranked shortlist with evaluation notes.',
        objective: 'Deliver a ranked shortlist of the top candidates with scoring rationale for each.',
        successCriteria: ['All submitted resumes reviewed against job criteria', 'Each candidate scored on required skills, experience, and fit', 'Top candidates ranked with written evaluation notes'],
        subtasks: [
          { id: 'step-1', title: 'Review the job specification', description: 'Read the full job description. Note the required skills, experience level, and any deal-breaker criteria.' },
          { id: 'step-2', title: 'Review each submitted resume', description: 'Open each applicant\'s profile on LinkedIn. Score them against the criteria: skills match, experience years, and culture fit signals.' },
          { id: 'step-3', title: 'Rank the shortlist and write evaluation notes', description: 'Select the top candidates. Rank them in order and write 2–3 sentences per candidate explaining the evaluation.' },
        ],
        status: 'unclaimed', priority: 0.70, difficulty: 'medium', languageTags: ['en'],
        externalUrl: 'https://www.linkedin.com', estimatedDuration: 20,
      },
      {
        ...tlBase,
        title: 'Prepare tax documents from financial records',
        description: 'Compile income, expense, and deduction data from provided financial records and organise it into the required tax form structure ready for review and filing.',
        objective: 'Produce a complete, filing-ready tax document package from the provided financial records.',
        successCriteria: ['All income sources identified and totalled', 'Allowable deductions categorised and documented', 'Tax forms populated with correct figures and ready for review'],
        subtasks: [
          { id: 'step-1', title: 'Open the financial records on IRS.gov', description: 'Access the IRS portal and locate the relevant tax forms for the filing year.' },
          { id: 'step-2', title: 'Identify and total all income sources', description: 'List each income stream from the provided records (salary, freelance, dividends). Sum to a total gross income figure.' },
          { id: 'step-3', title: 'Categorise allowable deductions', description: 'Review the records for deductible expenses. Categorise as: business expenses, charitable contributions, or other deductions.' },
          { id: 'step-4', title: 'Populate the tax forms', description: 'Enter all figures into the relevant tax form fields. Double-check arithmetic and ensure all required fields are completed.' },
        ],
        status: 'unclaimed', priority: 0.69, difficulty: 'hard', languageTags: ['en'],
        externalUrl: 'https://www.irs.gov', estimatedDuration: 45,
      },
      {
        ...tlBase,
        title: 'Track online brand reputation and issue alerts',
        description: 'Monitor search results and review platforms for brand mentions, assess sentiment for each occurrence, and issue structured alerts for any negative or high-impact coverage detected.',
        objective: 'Ensure all brand mentions are monitored and any negative coverage triggers an alert within the defined response window.',
        successCriteria: ['Search results and review platforms monitored for brand terms', 'Sentiment assessed for each mention', 'Alert issued for all negative or high-impact mentions with context'],
        subtasks: [
          { id: 'step-1', title: 'Set up a Google Alert search', description: 'Navigate to Google Alerts and search for the brand name and product terms. Filter to the last 7 days.' },
          { id: 'step-2', title: 'Review search results and review platforms', description: 'Check the first 3 pages of Google results for brand mentions. Also check G2 and Trustpilot for new reviews.' },
          { id: 'step-3', title: 'Classify sentiment and issue alerts', description: 'For each mention, classify sentiment. For any Negative or high-impact (>100 views) mention, issue a structured alert with: source, quote, sentiment, and recommended response action.' },
        ],
        status: 'unclaimed', priority: 0.68, difficulty: 'easy', languageTags: ['en'],
        externalUrl: 'https://www.google.com/alerts', estimatedDuration: 10,
      },
      {
        ...tlBase,
        title: 'Optimize ad campaign budgets across platforms',
        description: 'Analyse performance metrics across active ad campaigns on all platforms, identify over- and under-spending channels relative to ROAS targets, and redistribute budgets to maximise return.',
        objective: 'Deliver a budget reallocation plan that improves overall ROAS while staying within the total spend cap.',
        successCriteria: ['Performance metrics reviewed for all active campaigns', 'Over- and under-performing channels identified with supporting data', 'Budget reallocation plan produced with projected ROAS impact'],
        subtasks: [
          { id: 'step-1', title: 'Open Google Ads and review campaign metrics', description: 'Navigate to the Google Ads dashboard. Note spend, conversions, and ROAS for each active campaign in the last 30 days.' },
          { id: 'step-2', title: 'Identify over- and under-performing channels', description: 'Flag campaigns where ROAS is below target. Flag campaigns that are underspending their daily budget. Note both.' },
          { id: 'step-3', title: 'Produce the budget reallocation plan', description: 'For each over- and under-performing campaign, recommend a specific budget change (e.g., +20%, -15%). Estimate projected ROAS impact.' },
        ],
        status: 'unclaimed', priority: 0.67, difficulty: 'medium', languageTags: ['en'],
        externalUrl: 'https://ads.google.com', estimatedDuration: 22,
      },
      {
        ...tlBase,
        title: 'Search and compare SaaS tools for a business need',
        description: 'Research SaaS solutions matching the specified business requirements, compare features, pricing tiers, and user ratings across shortlisted tools, and recommend the top three options with rationale.',
        objective: 'Identify the three best-fit SaaS tools for the requirement and provide a clear comparison to support the purchase decision.',
        successCriteria: ['At least 5 tools researched and evaluated', 'Feature, pricing, and rating comparison documented', 'Top 3 recommended with pros, cons, and rationale'],
        subtasks: [
          { id: 'step-1', title: 'Search G2 for matching tools', description: 'Use the G2 category search for the business requirement type. Apply filters: minimum 4-star rating, relevant company size.' },
          { id: 'step-2', title: 'Evaluate at least 5 tools', description: 'For each shortlisted tool, record: key features, pricing tier (starter/pro), and average user rating.' },
          { id: 'step-3', title: 'Recommend the top 3 with rationale', description: 'Select the 3 best-fit tools. For each, write: pros, cons, and a one-paragraph justification for the recommendation.' },
        ],
        status: 'unclaimed', priority: 0.66, difficulty: 'medium', languageTags: ['en'],
        externalUrl: 'https://www.g2.com', estimatedDuration: 30,
      },
      {
        ...tlBase,
        title: 'Monitor subscription renewals and prevent service lapses',
        description: 'Check active subscription records for upcoming renewal dates, flag accounts at risk of lapse due to payment issues or inactivity, and trigger the appropriate reminder workflows.',
        objective: 'Ensure no active subscription lapses within the next 30 days without a triggered reminder workflow.',
        successCriteria: ['All subscriptions renewing within 30 days identified', 'At-risk accounts flagged with lapse reason', 'Reminder workflow triggered for each at-risk account'],
        subtasks: [
          { id: 'step-1', title: 'Open Stripe Billing and filter upcoming renewals', description: 'Navigate to the Stripe dashboard. Filter subscriptions renewing within the next 30 days.' },
          { id: 'step-2', title: 'Identify at-risk accounts', description: 'Flag accounts with: failed payment in last 30 days, expired payment method, or zero usage in last 14 days.' },
          { id: 'step-3', title: 'Trigger reminder workflows', description: 'For each at-risk account, initiate the appropriate Stripe automated reminder. Confirm the email is queued and screenshot the confirmation.' },
        ],
        status: 'unclaimed', priority: 0.65, difficulty: 'easy', languageTags: ['en'],
        externalUrl: 'https://stripe.com/billing', estimatedDuration: 7,
      },
      {
        ...tlBase,
        title: 'Automate CRM updates from customer interactions',
        description: 'Process logged customer interaction records and automatically update the corresponding CRM contact fields including status, interaction notes, and next-step assignments.',
        objective: 'Ensure all CRM contact records reflect the latest customer interaction data with no manual gaps.',
        successCriteria: ['All interaction logs processed and matched to CRM contacts', 'Status, notes, and next-step fields updated for each record', 'Unmatched interactions flagged for manual review'],
        subtasks: [
          { id: 'step-1', title: 'Open Salesforce and locate the interaction log queue', description: 'Navigate to the Salesforce Activity Feed. Filter for interactions logged in the last 7 days that have not been processed.' },
          { id: 'step-2', title: 'Match each interaction to a CRM contact', description: 'Search for the contact record matching each interaction by email or phone. Flag any unmatched interactions separately.' },
          { id: 'step-3', title: 'Update the contact record fields', description: 'For each matched contact, update: status, add the interaction note, and assign the next-step action with a due date.' },
        ],
        status: 'unclaimed', priority: 0.64, difficulty: 'easy', languageTags: ['en'],
        externalUrl: 'https://www.salesforce.com', estimatedDuration: 9,
      },
      {
        ...tlBase,
        title: 'Investigate payment allocation discrepancies',
        description: 'Cross-reference payment records against invoice ledgers to identify mismatches in allocation, and produce a discrepancy report with corrective journal entries for each issue found.',
        objective: 'Identify and document all payment allocation errors with corrective entries ready for approval.',
        successCriteria: ['All payments cross-referenced against corresponding invoices', 'Misallocated payments identified with amount and account details', 'Corrective journal entry specified for each discrepancy'],
        subtasks: [
          { id: 'step-1', title: 'Open QuickBooks and access the payment records', description: 'Navigate to Banking → Transactions. Download the payment records for the review period as a CSV.' },
          { id: 'step-2', title: 'Cross-reference against the invoice ledger', description: 'Compare each payment record against its corresponding invoice. Flag any amounts, dates, or account codes that do not match.' },
          { id: 'step-3', title: 'Produce the discrepancy report with corrective entries', description: 'For each mismatch, write a corrective journal entry specifying: debit account, credit account, amount, and description.' },
        ],
        status: 'unclaimed', priority: 0.63, difficulty: 'hard', languageTags: ['en'],
        externalUrl: 'https://quickbooks.intuit.com', estimatedDuration: 20,
      },
      {
        ...tlBase,
        title: 'Generate and publish blog posts from research briefs',
        description: 'Transform a provided research brief into a fully written, SEO-optimised blog post and publish it to the configured CMS with appropriate metadata, tags, and a featured image.',
        objective: 'Produce and publish a polished blog post that satisfies the brief requirements and SEO criteria.',
        successCriteria: ['Blog post written to the specified length and tone', 'SEO title, meta description, and target keyword included', 'Post published to CMS with correct category, tags, and featured image'],
        subtasks: [
          { id: 'step-1', title: 'Read the research brief', description: 'Review the provided brief: target keyword, audience, tone, required length, and key points to cover.' },
          { id: 'step-2', title: 'Write the blog post', description: 'Draft the post using the brief guidelines. Include: an engaging intro, H2 subheadings, and a clear conclusion with CTA.' },
          { id: 'step-3', title: 'Add SEO metadata', description: 'Write an SEO title (under 60 chars), meta description (under 155 chars), and confirm the target keyword appears in the H1 and first paragraph.' },
          { id: 'step-4', title: 'Publish to WordPress with correct metadata', description: 'Add the post to WordPress. Set the category, add relevant tags, and upload a featured image. Publish and screenshot the live post.' },
        ],
        status: 'unclaimed', priority: 0.62, difficulty: 'medium', languageTags: ['en'],
        externalUrl: 'https://wordpress.com', estimatedDuration: 40,
      },
    ])

    await Batch.findByIdAndUpdate(tlBatch._id, { tasksTotal: 18, tasksCompleted: 1 })
    await Notification.insertMany([
      { tenantId: acmeCorp._id, userId: wanjiru._id, type: 'batch-assigned', title: 'New Tasks Available', message: 'You have been assigned to "Agentic AI Tasks".', read: false },
      { tenantId: acmeCorp._id, userId: odhiambo._id, type: 'task-approved', title: 'Task Signed Off', message: `Your task "${t6.title}" scored 93%.`, read: false },
      { tenantId: techLab._id, userId: tlAnnotator1._id, type: 'task-approved', title: 'Task Signed Off', message: `Your task "${tl4.title}" scored 91%.`, read: false },
    ])
    await Notification.create({ userId: superAdmin._id, type: 'system', title: 'Database Seeded', message: '2 workspaces · 2 workflows · 2 batches · 40 tasks · 2 reviews seeded.', read: false })

    return res.json({
      message: 'Database seeded successfully',
      credentials: {
        superAdmin: { email: 'superadmin@labelforge.ai', password: 'superadmin123!', loginUrl: '/login' },
        acAdmin: { email: 'zawadi.ndungu@labelforge.ai', password: 'admin123!', workspace: 'acme-corp' },
        acAnnotator: { email: 'wanjiru.kamau@labelforge.ai', password: 'annotator123!', workspace: 'acme-corp' },
        tlAdmin: { email: 'fatima.alrashid@labelforge.ai', password: 'admin123!', workspace: 'techlab' },
      },
    })
  } catch (err) {
    console.error('[seed]', err)
    return res.status(500).json({ error: 'Seed failed', details: String(err) })
  }
}
