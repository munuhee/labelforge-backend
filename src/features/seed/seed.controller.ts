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

    const t3 = await Task.create({ ...acBase, title: 'Find and apply to matching software engineering jobs', description: 'Browse job boards, filter software engineering roles matching a given profile, and simulate submitting an application with test data.', status: 'submitted', priority: 0.88, difficulty: 'hard', languageTags: ['en'], externalUrl: '', estimatedDuration: 45, annotatorId: odhiambo._id, annotatorEmail: odhiambo.email, startedAt: ago(h(5)), submittedAt: ago(h(1)), actualDuration: 42, notes: 'Applied to 3 matching roles with test data.', activityLog: [{ action: 'claimed', userId: odhiambo._id.toString(), userEmail: odhiambo.email, timestamp: ago(h(5)) }, { action: 'submitted', userId: odhiambo._id.toString(), userEmail: odhiambo.email, comment: 'All application steps documented', timestamp: ago(h(1)) }] })
    const t6 = await Task.create({ ...acBase, title: 'Book the cheapest flight for a business trip', description: 'Search flight comparison tools, identify the lowest available fare for the trip route, and document the full booking flow.', status: 'data-ready', isLocked: true, priority: 0.85, difficulty: 'medium', languageTags: ['en'], externalUrl: '', estimatedDuration: 15, annotatorId: odhiambo._id, annotatorEmail: odhiambo.email, reviewerId: amina._id, reviewerEmail: amina.email, qualityScore: 93, feedback: 'All required steps captured clearly.', startedAt: ago(d(4)), submittedAt: ago(d(3) + h(3)), completedAt: ago(d(2)), signedOffAt: ago(d(2)), actualDuration: 13 })

    await Task.insertMany([
      { ...acBase, title: 'Schedule meetings by coordinating multiple calendars', status: 'unclaimed', priority: 0.95, difficulty: 'easy', languageTags: ['en'], externalUrl: '', estimatedDuration: 10, sla: new Date(now + d(3)) },
      { ...acBase, title: 'Sort and prioritize incoming customer support emails', status: 'in-progress', priority: 0.90, difficulty: 'medium', languageTags: ['en'], externalUrl: '', estimatedDuration: 12, annotatorId: wanjiru._id, annotatorEmail: wanjiru.email, startedAt: ago(h(2)), sla: new Date(now + d(2)), activityLog: [{ action: 'claimed', userId: wanjiru._id.toString(), userEmail: wanjiru.email, timestamp: ago(h(2)) }] },
      { ...acBase, title: 'Compare insurance plans and recommend the best option', status: 'in-review', priority: 0.85, difficulty: 'medium', languageTags: ['en'], externalUrl: '', estimatedDuration: 35, annotatorId: wanjiru._id, annotatorEmail: wanjiru.email, reviewerId: amina._id, reviewerEmail: amina.email, startedAt: ago(h(8)), submittedAt: ago(h(4)), actualDuration: 32 },
      { ...acBase, title: 'Review contracts and highlight risky clauses', status: 'revision-requested', priority: 0.82, difficulty: 'hard', languageTags: ['en'], externalUrl: '', estimatedDuration: 40, annotatorId: kipchoge._id, annotatorEmail: kipchoge.email, reviewerId: mutua._id, reviewerEmail: mutua.email, feedback: 'Risk annotations for section 3 clauses are missing context.', startedAt: ago(d(2)), submittedAt: ago(h(10)), actualDuration: 36 },
      { ...acBase, title: 'Generate and send personalized sales outreach emails', status: 'rejected', priority: 0.80, difficulty: 'medium', languageTags: ['en'], externalUrl: '', estimatedDuration: 18, annotatorId: njeri._id, annotatorEmail: njeri.email, reviewerId: mutua._id, reviewerEmail: mutua.email, feedback: 'Emails were generic and did not reflect the personalization criteria specified.', startedAt: ago(d(3)), submittedAt: ago(d(1) + h(8)), actualDuration: 20 },
      { ...acBase, title: 'Track package deliveries and notify users of delays', status: 'unclaimed', priority: 0.78, difficulty: 'easy', languageTags: ['en'], externalUrl: '', estimatedDuration: 8, sla: new Date(now + d(8)) },
    ])

    await Batch.findByIdAndUpdate(acBatch._id, { tasksTotal: 8, tasksCompleted: 1 })
    await Review.insertMany([
      { tenantId: acmeCorp._id, projectId: acmeProject._id, workflowId: acWF._id, taskId: t3._id, taskTitle: t3.title, batchId: acBatch._id, batchTitle: acBatch.title, annotatorId: odhiambo._id, annotatorEmail: odhiambo.email, annotatorName: odhiambo.name, status: 'pending', submittedAt: ago(h(1)) },
      { tenantId: acmeCorp._id, projectId: acmeProject._id, workflowId: acWF._id, taskId: t6._id, taskTitle: t6.title, batchId: acBatch._id, batchTitle: acBatch.title, annotatorId: odhiambo._id, annotatorEmail: odhiambo.email, annotatorName: odhiambo.name, reviewerId: amina._id, reviewerEmail: amina.email, reviewerName: amina.name, status: 'approved', decision: 'approve', qualityScore: 93, comments: 'All required steps captured clearly.', submittedAt: ago(d(3) + h(3)), reviewedAt: ago(d(2)) },
    ])

    const tlEveryone = [tlAdmin._id, tlReviewer._id, tlAnnotator1._id, tlAnnotator2._id]
    const [tlWF] = await Workflow.insertMany([{ tenantId: techLab._id, projectId: tlProject._id, name: 'Agentic AI Evaluation', description: 'Evaluate AI agents completing multi-step browser tasks', type: 'agentic-ai', isActive: true, assignedUsers: tlEveryone, createdBy: tlAdmin._id }])
    const [tlBatch] = await Batch.insertMany([{ tenantId: techLab._id, projectId: tlProject._id, workflowId: tlWF._id, workflowName: 'Agentic AI Evaluation', title: 'Agentic AI Tasks', description: 'Browser-based agent task evaluation', instructions: '1. Open the URL before starting\n2. Complete the full task flow\n3. Document every meaningful state change', taskType: 'agentic-ai', priority: 0.85, workloadEstimate: 30, status: 'in-progress', tasksTotal: 5, tasksCompleted: 1, deadline: new Date(now + d(14)), createdBy: tlAdmin._id }])

    const tlBase = { tenantId: techLab._id, projectId: tlProject._id, workflowId: tlWF._id, workflowName: 'Agentic AI Evaluation', taskType: 'agentic-ai', batchId: tlBatch._id, batchTitle: 'Agentic AI Tasks' }
    const tl4 = await Task.create({ ...tlBase, title: 'Monitor social media mentions and respond to comments', status: 'data-ready', isLocked: true, priority: 0.82, difficulty: 'easy', languageTags: ['en'], externalUrl: '', estimatedDuration: 15, annotatorId: tlAnnotator1._id, annotatorEmail: tlAnnotator1.email, reviewerId: tlReviewer._id, reviewerEmail: tlReviewer.email, qualityScore: 91, feedback: 'Brand mention discovery and comment response flow clearly captured.', startedAt: ago(d(5)), submittedAt: ago(d(4) + h(2)), completedAt: ago(d(3)), signedOffAt: ago(d(3)), actualDuration: 14 })

    await Task.insertMany([
      { ...tlBase, title: 'Analyze website analytics and recommend optimizations', status: 'unclaimed', priority: 0.90, difficulty: 'easy', languageTags: ['en'], externalUrl: '', estimatedDuration: 22 },
      { ...tlBase, title: 'Monitor news sources and summarize relevant updates', status: 'in-progress', priority: 0.85, difficulty: 'easy', languageTags: ['en'], externalUrl: '', estimatedDuration: 15, annotatorId: tlAnnotator1._id, annotatorEmail: tlAnnotator1.email, startedAt: ago(h(1.5)) },
      { ...tlBase, title: 'Generate meeting summaries and assign action items', status: 'submitted', priority: 0.80, difficulty: 'easy', languageTags: ['en'], externalUrl: '', estimatedDuration: 8, annotatorId: tlAnnotator2._id, annotatorEmail: tlAnnotator2.email, startedAt: ago(h(3)), submittedAt: ago(h(0.5)), actualDuration: 7 },
      { ...tlBase, title: 'Plan travel itineraries including hotels and transport', status: 'revision-requested', priority: 0.75, difficulty: 'medium', languageTags: ['en'], externalUrl: '', estimatedDuration: 25, annotatorId: tlAnnotator2._id, annotatorEmail: tlAnnotator2.email, reviewerId: tlReviewer._id, reviewerEmail: tlReviewer.email, feedback: 'Hotel options were listed but transport connections between stops are missing.', startedAt: ago(d(2)), submittedAt: ago(d(1) + h(3)), actualDuration: 23 },
    ])

    await Batch.findByIdAndUpdate(tlBatch._id, { tasksTotal: 5, tasksCompleted: 1 })
    await Notification.insertMany([
      { tenantId: acmeCorp._id, userId: wanjiru._id, type: 'batch-assigned', title: 'New Tasks Available', message: 'You have been assigned to "Agentic AI Tasks".', read: false },
      { tenantId: acmeCorp._id, userId: odhiambo._id, type: 'task-approved', title: 'Task Signed Off', message: `Your task "${t6.title}" scored 93%.`, read: false },
      { tenantId: techLab._id, userId: tlAnnotator1._id, type: 'task-approved', title: 'Task Signed Off', message: `Your task "${tl4.title}" scored 91%.`, read: false },
    ])
    await Notification.create({ userId: superAdmin._id, type: 'system', title: 'Database Seeded', message: '2 workspaces · 2 workflows · 2 batches · 13 tasks · 4 reviews seeded.', read: false })

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
